// /backend/controllers/mlController.js
// ============================================================
// ML CONTROLLER - Risk Assessment & AI Features
// ============================================================
// Integrates Python ML models with Node.js API
// ============================================================

const { spawn } = require('child_process');
const path = require('path');
const { supabase } = require('../lib/supabaseClient');

/**
 * Run Python ML model and return results
 */
async function runPythonModel(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python3';
    const scriptPath = path.join(__dirname, '..', 'ml', scriptName);
    
    const python = spawn(pythonPath, [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      }
    });
    
    python.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
}

/**
 * GET /api/ai/risk-score/:dealId
 * Calculate ML-powered risk score for a deal
 */
exports.getRiskScore = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.userId;
    const orgId = req.orgId;
    
    // Fetch deal data
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('org_id', orgId)
      .single();
    
    if (dealError || !deal) {
      return res.status(404).json({
        error: 'DEAL_NOT_FOUND',
        message: 'Deal not found'
      });
    }
    
    // Prepare deal data for ML model
    const dealData = {
      loan_amount: deal.loan_amount || 0,
      requested_ltv: deal.requested_ltv || 75,
      requested_rate: deal.requested_rate || 7.5,
      requested_term_months: deal.requested_term_months || 36,
      asset_type: deal.asset_type || 'multifamily',
      loan_purpose: deal.loan_purpose || 'purchase'
    };
    
    try {
      // Call Python ML model
      const riskResult = await runPythonModel('risk_model.py', [
        JSON.stringify(dealData)
      ]);
      
      // Store risk assessment in database
      await supabase
        .from('risk_assessments')
        .insert({
          deal_id: dealId,
          org_id: orgId,
          risk_score: riskResult.risk_score,
          risk_level: riskResult.risk_level,
          confidence: riskResult.confidence,
          risk_factors: riskResult.risk_factors,
          model_version: riskResult.model_version,
          assessed_by: userId
        });
      
      res.json({
        ok: true,
        deal_id: dealId,
        risk_assessment: riskResult
      });
      
    } catch (mlError) {
      console.error('[ML] Risk model error:', mlError);
      
      // Fallback to rule-based scoring
      const fallbackScore = calculateFallbackRiskScore(dealData);
      
      res.json({
        ok: true,
        deal_id: dealId,
        risk_assessment: fallbackScore,
        warning: 'ML model unavailable, using rule-based scoring'
      });
    }
    
  } catch (error) {
    console.error('[ML] Risk score error:', error);
    res.status(500).json({
      error: 'RISK_ASSESSMENT_FAILED',
      message: 'Failed to calculate risk score'
    });
  }
};

/**
 * POST /api/ai/stress-test/:dealId
 * Run stress testing scenarios on a deal
 */
exports.runStressTest = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { scenarios } = req.body;
    const orgId = req.orgId;
    
    // Fetch deal
    const { data: deal, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('org_id', orgId)
      .single();
    
    if (error || !deal) {
      return res.status(404).json({
        error: 'DEAL_NOT_FOUND',
        message: 'Deal not found'
      });
    }
    
    // Default stress test scenarios
    const defaultScenarios = [
      { name: 'Interest Rate +2%', rate_increase: 2.0 },
      { name: 'Occupancy -10%', occupancy_decrease: 10 },
      { name: 'Property Value -15%', value_decrease: 15 },
      { name: 'Combined Stress', rate_increase: 1.5, occupancy_decrease: 5, value_decrease: 10 }
    ];
    
    const testScenarios = scenarios || defaultScenarios;
    const results = [];
    
    // Run each scenario
    for (const scenario of testScenarios) {
      const stressedDeal = applyStressScenario(deal, scenario);
      
      try {
        const riskResult = await runPythonModel('risk_model.py', [
          JSON.stringify(stressedDeal)
        ]);
        
        results.push({
          scenario: scenario.name || 'Custom Scenario',
          parameters: scenario,
          risk_score: riskResult.risk_score,
          risk_level: riskResult.risk_level,
          delta: riskResult.risk_score - (deal.risk_score || 50)
        });
      } catch (mlError) {
        console.error(`[ML] Stress test scenario failed: ${scenario.name}`, mlError);
        results.push({
          scenario: scenario.name || 'Custom Scenario',
          parameters: scenario,
          error: 'Scenario calculation failed'
        });
      }
    }
    
    res.json({
      ok: true,
      deal_id: dealId,
      baseline_risk_score: deal.risk_score || 50,
      stress_test_results: results
    });
    
  } catch (error) {
    console.error('[ML] Stress test error:', error);
    res.status(500).json({
      error: 'STRESS_TEST_FAILED',
      message: 'Failed to run stress test'
    });
  }
};

/**
 * Apply stress scenario to deal data
 */
function applyStressScenario(deal, scenario) {
  const stressedDeal = { ...deal };
  
  if (scenario.rate_increase) {
    stressedDeal.requested_rate = (deal.requested_rate || 7.5) + scenario.rate_increase;
  }
  
  if (scenario.value_decrease) {
    const valueMultiplier = 1 - (scenario.value_decrease / 100);
    stressedDeal.loan_amount = deal.loan_amount * valueMultiplier;
  }
  
  if (scenario.occupancy_decrease) {
    stressedDeal.occupancy_rate = (deal.occupancy_rate || 90) - scenario.occupancy_decrease;
  }
  
  return {
    loan_amount: stressedDeal.loan_amount,
    requested_ltv: stressedDeal.requested_ltv,
    requested_rate: stressedDeal.requested_rate,
    requested_term_months: stressedDeal.requested_term_months,
    asset_type: stressedDeal.asset_type,
    occupancy_rate: stressedDeal.occupancy_rate
  };
}

/**
 * Fallback rule-based risk scoring
 */
function calculateFallbackRiskScore(dealData) {
  let riskScore = 50;
  const riskFactors = [];
  
  // LTV risk
  const ltv = dealData.requested_ltv || 75;
  if (ltv > 80) {
    riskScore += 15;
    riskFactors.push({
      factor: 'High LTV',
      value: `${ltv}%`,
      impact: 'high'
    });
  } else if (ltv < 65) {
    riskScore -= 10;
  }
  
  // Interest rate risk
  const rate = dealData.requested_rate || 7.5;
  if (rate > 10) {
    riskScore += 10;
    riskFactors.push({
      factor: 'High Interest Rate',
      value: `${rate}%`,
      impact: 'medium'
    });
  }
  
  // Loan amount risk
  if (dealData.loan_amount > 10000000) {
    riskScore += 5;
    riskFactors.push({
      factor: 'Large Loan Amount',
      value: `$${(dealData.loan_amount / 1000000).toFixed(1)}M`,
      impact: 'low'
    });
  }
  
  // Property type risk
  const highRiskTypes = ['land', 'mixed_use'];
  if (highRiskTypes.includes(dealData.asset_type?.toLowerCase())) {
    riskScore += 12;
    riskFactors.push({
      factor: 'Higher Risk Property Type',
      value: dealData.asset_type,
      impact: 'high'
    });
  }
  
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  return {
    risk_score: riskScore,
    confidence: 75.0,
    risk_level: getRiskLevel(riskScore),
    risk_factors: riskFactors,
    model_version: '1.0.0-fallback'
  };
}

function getRiskLevel(score) {
  if (score < 30) return 'low';
  if (score < 50) return 'moderate';
  if (score < 70) return 'elevated';
  return 'high';
}

module.exports = exports;
