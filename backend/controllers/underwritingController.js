// ============================================================
// UNDERWRITING CONTROLLER
// Business logic for underwriting analysis (DSCR, NOI, LTV, Cap Rate)
// ============================================================

const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const Joi = require('joi');

/**
 * Validation schema for underwriting run
 */
const runUnderwritingSchema = Joi.object({
  deal_id: Joi.string().uuid().required()
});

/**
 * POST /api/underwriting/run
 * Run underwriting analysis for a deal
 */
exports.runUnderwriting = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = runUnderwritingSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { deal_id } = value;

    // Verify deal exists and belongs to user's org
    const dealResult = await query(
      'SELECT * FROM deals WHERE id = $1 AND org_id = $2',
      [deal_id, req.orgId]
    );

    if (dealResult.rows.length === 0) {
      throw new AppError('Deal not found', 404, 'DEAL_NOT_FOUND');
    }

    const deal = dealResult.rows[0];

    // Get property financials for the deal
    const financialsResult = await query(
      'SELECT * FROM property_financials WHERE deal_id = $1',
      [deal_id]
    );

    if (financialsResult.rows.length === 0) {
      throw new AppError('Property financials not found. Please add financial data before running underwriting.', 400, 'FINANCIALS_MISSING');
    }

    const financials = financialsResult.rows[0];

    // Calculate underwriting metrics
    const metrics = calculateUnderwritingMetrics(deal, financials);

    // Assess risk
    const riskAssessment = assessRisk(metrics, deal);

    // Generate recommendation
    const recommendation = generateRecommendation(metrics, riskAssessment);

    // Insert underwriting result
    const result = await query(`
      INSERT INTO underwriting_results (
        org_id,
        deal_id,
        underwriter_id,
        dscr,
        ltv,
        ltc,
        cap_rate,
        noi,
        debt_service,
        cash_flow,
        risk_score,
        risk_rating,
        risk_factors,
        recommendation,
        approved_amount,
        approved_ltv,
        approved_rate,
        approved_term_months,
        conditions,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      req.orgId,
      deal_id,
      req.user.id,
      metrics.dscr,
      metrics.ltv,
      metrics.ltc || null,
      metrics.cap_rate,
      metrics.noi,
      metrics.debt_service,
      metrics.cash_flow,
      riskAssessment.risk_score,
      riskAssessment.risk_rating,
      JSON.stringify(riskAssessment.risk_factors),
      recommendation.decision,
      recommendation.approved_amount,
      recommendation.approved_ltv,
      recommendation.approved_rate,
      recommendation.approved_term_months,
      recommendation.conditions,
      recommendation.notes
    ]);

    // Update deal status
    await query(
      `UPDATE deals SET status = $1, stage = $2 WHERE id = $3`,
      [
        recommendation.decision === 'approve' ? 'approved' : 'underwriting',
        recommendation.decision === 'approve' ? 'approved' : 'underwriting',
        deal_id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Underwriting analysis completed',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate underwriting metrics (DSCR, LTV, Cap Rate, etc.)
 */
function calculateUnderwritingMetrics(deal, financials) {
  const {
    net_operating_income: noi,
    annual_debt_service: debt_service,
    purchase_price,
    appraised_value,
    total_project_cost
  } = financials;

  const loan_amount = parseFloat(deal.loan_amount);

  // DSCR = NOI / Annual Debt Service
  const dscr = debt_service > 0 ? (noi / debt_service) : 0;

  // LTV = Loan Amount / Property Value
  const property_value = appraised_value || purchase_price || 0;
  const ltv = property_value > 0 ? (loan_amount / property_value) * 100 : 0;

  // LTC = Loan Amount / Total Project Cost (for construction/rehab)
  const ltc = total_project_cost > 0 ? (loan_amount / total_project_cost) * 100 : null;

  // Cap Rate = NOI / Property Value
  const cap_rate = property_value > 0 ? (noi / property_value) * 100 : 0;

  // Cash Flow = NOI - Debt Service
  const cash_flow = noi - debt_service;

  return {
    dscr: parseFloat(dscr.toFixed(2)),
    ltv: parseFloat(ltv.toFixed(2)),
    ltc: ltc ? parseFloat(ltc.toFixed(2)) : null,
    cap_rate: parseFloat(cap_rate.toFixed(2)),
    noi: parseFloat(noi),
    debt_service: parseFloat(debt_service),
    cash_flow: parseFloat(cash_flow.toFixed(2))
  };
}

/**
 * Assess risk based on underwriting metrics
 */
function assessRisk(metrics, deal) {
  const risk_factors = [];
  let risk_score = 0;

  // DSCR risk assessment
  if (metrics.dscr < 1.0) {
    risk_factors.push('DSCR below 1.0 - insufficient cash flow to cover debt service');
    risk_score += 40;
  } else if (metrics.dscr < 1.2) {
    risk_factors.push('DSCR below 1.2 - minimal debt service coverage');
    risk_score += 25;
  } else if (metrics.dscr < 1.35) {
    risk_factors.push('DSCR below 1.35 - adequate but not strong coverage');
    risk_score += 10;
  } else {
    risk_factors.push('Strong DSCR - excellent debt service coverage');
  }

  // LTV risk assessment
  if (metrics.ltv > 85) {
    risk_factors.push('LTV above 85% - high leverage');
    risk_score += 30;
  } else if (metrics.ltv > 80) {
    risk_factors.push('LTV above 80% - elevated leverage');
    risk_score += 20;
  } else if (metrics.ltv > 75) {
    risk_factors.push('LTV above 75% - moderate leverage');
    risk_score += 10;
  } else {
    risk_factors.push('Conservative LTV - strong equity cushion');
  }

  // Cap Rate risk assessment
  if (metrics.cap_rate < 4) {
    risk_factors.push('Cap rate below 4% - verify market comparables');
    risk_score += 15;
  } else if (metrics.cap_rate > 12) {
    risk_factors.push('Cap rate above 12% - may indicate distressed asset or high-risk market');
    risk_score += 20;
  }

  // Cash flow risk assessment
  if (metrics.cash_flow < 0) {
    risk_factors.push('Negative cash flow - property does not generate positive returns');
    risk_score += 35;
  } else if (metrics.cash_flow < 50000) {
    risk_factors.push('Low cash flow - limited buffer for unexpected expenses');
    risk_score += 10;
  }

  // Loan amount risk (deals > $1M require additional review)
  if (parseFloat(deal.loan_amount) > 1000000) {
    risk_factors.push('High-dollar loan - requires senior underwriter review');
    risk_score += 5;
  }

  // Determine risk rating
  let risk_rating;
  if (risk_score <= 20) {
    risk_rating = 'low';
  } else if (risk_score <= 50) {
    risk_rating = 'medium';
  } else if (risk_score <= 80) {
    risk_rating = 'high';
  } else {
    risk_rating = 'unacceptable';
  }

  return {
    risk_score,
    risk_rating,
    risk_factors
  };
}

/**
 * Generate recommendation based on metrics and risk
 */
function generateRecommendation(metrics, riskAssessment) {
  let decision = 'decline';
  let approved_amount = null;
  let approved_ltv = null;
  let approved_rate = null;
  let approved_term_months = null;
  let conditions = '';
  let notes = '';

  // Approval criteria
  const meetsMinimumDSCR = metrics.dscr >= 1.2;
  const meetsMaximumLTV = metrics.ltv <= 80;
  const hasPositiveCashFlow = metrics.cash_flow > 0;

  if (meetsMinimumDSCR && meetsMaximumLTV && hasPositiveCashFlow && riskAssessment.risk_rating !== 'unacceptable') {
    decision = 'approve';
    approved_amount = metrics.noi * 10; // Simple approximation
    approved_ltv = metrics.ltv;
    approved_rate = 8.25; // Default rate
    approved_term_months = 24; // Default term
    
    conditions = 'Subject to: (1) Updated appraisal, (2) Environmental Phase I report, (3) Proof of property insurance, (4) Satisfactory title report';
    notes = `Strong deal with DSCR of ${metrics.dscr} and LTV of ${metrics.ltv}%. Recommend approval at requested terms.`;
  } else if (metrics.dscr >= 1.15 && metrics.ltv <= 85 && riskAssessment.risk_rating === 'medium') {
    decision = 'conditional';
    approved_amount = metrics.noi * 8;
    approved_ltv = Math.min(metrics.ltv, 75);
    approved_rate = 9.0; // Higher rate for conditional approval
    approved_term_months = 24;
    
    conditions = 'Conditional approval subject to: (1) Personal guarantee from sponsor, (2) Additional equity injection to reduce LTV to 75%, (3) Rent roll verification, (4) All standard conditions';
    notes = `Marginal deal with DSCR of ${metrics.dscr}. Recommend conditional approval with enhanced terms.`;
  } else {
    decision = 'decline';
    notes = `Deal does not meet minimum underwriting criteria. DSCR: ${metrics.dscr} (min 1.2), LTV: ${metrics.ltv}% (max 80%), Cash Flow: $${metrics.cash_flow.toLocaleString()}. Risk Rating: ${riskAssessment.risk_rating}.`;
  }

  return {
    decision,
    approved_amount,
    approved_ltv,
    approved_rate,
    approved_term_months,
    conditions,
    notes
  };
}

/**
 * GET /api/underwriting/:id
 * Get underwriting result by ID
 */
exports.getUnderwritingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        ur.*,
        d.deal_name,
        d.loan_amount,
        b.entity_name as borrower_name,
        u.email as underwriter_email
      FROM underwriting_results ur
      LEFT JOIN deals d ON ur.deal_id = d.id
      LEFT JOIN borrowers b ON d.borrower_id = b.id
      LEFT JOIN users u ON ur.underwriter_id = u.id
      WHERE ur.id = $1 AND ur.org_id = $2
    `, [id, req.orgId]);

    if (result.rows.length === 0) {
      throw new AppError('Underwriting result not found', 404, 'UNDERWRITING_NOT_FOUND');
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/underwriting/deal/:deal_id
 * Get all underwriting results for a specific deal
 */
exports.getUnderwritingByDealId = async (req, res, next) => {
  try {
    const { deal_id } = req.params;

    // Verify deal belongs to user's org
    const dealCheck = await query(
      'SELECT id FROM deals WHERE id = $1 AND org_id = $2',
      [deal_id, req.orgId]
    );

    if (dealCheck.rows.length === 0) {
      throw new AppError('Deal not found', 404, 'DEAL_NOT_FOUND');
    }

    const result = await query(`
      SELECT 
        ur.*,
        u.email as underwriter_email,
        u.first_name as underwriter_first_name,
        u.last_name as underwriter_last_name
      FROM underwriting_results ur
      LEFT JOIN users u ON ur.underwriter_id = u.id
      WHERE ur.deal_id = $1 AND ur.org_id = $2
      ORDER BY ur.run_at DESC
    `, [deal_id, req.orgId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};
