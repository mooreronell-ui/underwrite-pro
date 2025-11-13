// ============================================================
// COMPLIANCE CONTROLLER - LAYER 6
// KYC/KYB/AML endpoints for identity verification
// ============================================================

const { query } = require('../config/database');
const axios = require('axios');

/**
 * POST /api/compliance/kyc
 * Perform Know Your Customer (KYC) check on an individual borrower
 * 
 * Request body:
 * {
 *   "borrower_id": "uuid",
 *   "ssn": "123-45-6789",
 *   "date_of_birth": "1980-01-01",
 *   "address": {...}
 * }
 */
exports.performKYC = async (req, res) => {
  try {
    const { borrower_id, ssn, date_of_birth, address } = req.body;
    const orgId = req.orgId;
    const userId = req.userId;

    // Validate required fields
    if (!borrower_id || !ssn || !date_of_birth) {
      return res.status(400).json({
        success: false,
        error: 'borrower_id, ssn, and date_of_birth are required'
      });
    }

    // Verify borrower belongs to org
    const borrowerResult = await query(
      'SELECT id, first_name, last_name, email FROM borrowers WHERE id = $1 AND org_id = $2',
      [borrower_id, orgId]
    );

    if (borrowerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Borrower not found'
      });
    }

    const borrower = borrowerResult.rows[0];

    // TODO: Call real KYC vendor API (Alloy, Persona, Onfido, etc.)
    // const kycResult = await callKYCVendor({
    //   first_name: borrower.first_name,
    //   last_name: borrower.last_name,
    //   ssn,
    //   date_of_birth,
    //   address
    // });

    // Placeholder: Mock KYC result
    const kycResult = {
      status: 'passed', // passed, failed, manual_review
      vendor: 'alloy',
      vendor_id: 'kyc-' + Date.now(),
      checks: {
        identity_verification: 'passed',
        document_verification: 'passed',
        watchlist_screening: 'passed',
        adverse_media: 'passed'
      },
      risk_score: 15, // 0-100, lower is better
      timestamp: new Date().toISOString()
    };

    // Store KYC result in audit_logs as structured JSON
    await query(`
      INSERT INTO audit_logs (user_id, org_id, action, resource_type, resource_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      orgId,
      'kyc_check',
      'borrower',
      borrower_id,
      JSON.stringify({
        ...kycResult,
        borrower_email: borrower.email,
        performed_by: req.userEmail
      }),
      req.ip
    ]);

    // Update borrower record with KYC status
    await query(`
      UPDATE borrowers 
      SET kyc_status = $1, kyc_verified_at = NOW()
      WHERE id = $2 AND org_id = $3
    `, [kycResult.status, borrower_id, orgId]);

    res.json({
      success: true,
      data: {
        borrower_id,
        kyc_status: kycResult.status,
        vendor: kycResult.vendor,
        vendor_id: kycResult.vendor_id,
        checks: kycResult.checks,
        risk_score: kycResult.risk_score,
        message: 'KYC check completed successfully'
      }
    });
  } catch (error) {
    console.error('[COMPLIANCE] KYC error:', error);
    res.status(500).json({
      success: false,
      error: 'KYC check failed'
    });
  }
};

/**
 * POST /api/compliance/kyb
 * Perform Know Your Business (KYB) check on a business borrower
 * 
 * Request body:
 * {
 *   "borrower_id": "uuid",
 *   "business_name": "Acme Corp",
 *   "tax_id": "12-3456789",
 *   "business_address": {...}
 * }
 */
exports.performKYB = async (req, res) => {
  try {
    const { borrower_id, business_name, tax_id, business_address } = req.body;
    const orgId = req.orgId;
    const userId = req.userId;

    // Validate required fields
    if (!borrower_id || !business_name || !tax_id) {
      return res.status(400).json({
        success: false,
        error: 'borrower_id, business_name, and tax_id are required'
      });
    }

    // Verify borrower belongs to org
    const borrowerResult = await query(
      'SELECT id, first_name, last_name, email, entity_type FROM borrowers WHERE id = $1 AND org_id = $2',
      [borrower_id, orgId]
    );

    if (borrowerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Borrower not found'
      });
    }

    const borrower = borrowerResult.rows[0];

    // TODO: Call real KYB vendor API (Alloy, Middesk, etc.)
    // const kybResult = await callKYBVendor({
    //   business_name,
    //   tax_id,
    //   business_address
    // });

    // Placeholder: Mock KYB result
    const kybResult = {
      status: 'passed', // passed, failed, manual_review
      vendor: 'middesk',
      vendor_id: 'kyb-' + Date.now(),
      checks: {
        business_verification: 'passed',
        ubo_verification: 'passed', // Ultimate Beneficial Owner
        sanctions_screening: 'passed',
        adverse_media: 'passed',
        tax_id_verification: 'passed'
      },
      business_info: {
        legal_name: business_name,
        formation_date: '2015-03-15',
        state_of_incorporation: 'DE',
        status: 'active'
      },
      risk_score: 20,
      timestamp: new Date().toISOString()
    };

    // Store KYB result in audit_logs as structured JSON
    await query(`
      INSERT INTO audit_logs (user_id, org_id, action, resource_type, resource_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      orgId,
      'kyb_check',
      'borrower',
      borrower_id,
      JSON.stringify({
        ...kybResult,
        borrower_email: borrower.email,
        performed_by: req.userEmail
      }),
      req.ip
    ]);

    // Update borrower record with KYB status
    await query(`
      UPDATE borrowers 
      SET kyb_status = $1, kyb_verified_at = NOW()
      WHERE id = $2 AND org_id = $3
    `, [kybResult.status, borrower_id, orgId]);

    res.json({
      success: true,
      data: {
        borrower_id,
        kyb_status: kybResult.status,
        vendor: kybResult.vendor,
        vendor_id: kybResult.vendor_id,
        checks: kybResult.checks,
        business_info: kybResult.business_info,
        risk_score: kybResult.risk_score,
        message: 'KYB check completed successfully'
      }
    });
  } catch (error) {
    console.error('[COMPLIANCE] KYB error:', error);
    res.status(500).json({
      success: false,
      error: 'KYB check failed'
    });
  }
};

/**
 * GET /api/compliance/audit-logs
 * Retrieve audit logs for compliance review
 * Only accessible by admin and auditor roles
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { page = 1, limit = 50, action, resource_type } = req.query;
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT 
        al.id,
        al.user_id,
        u.email as user_email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.metadata,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.org_id = $1
    `;

    const params = [orgId];
    let paramIndex = 2;

    if (action) {
      queryStr += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (resource_type) {
      queryStr += ` AND al.resource_type = $${paramIndex}`;
      params.push(resource_type);
      paramIndex++;
    }

    queryStr += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM audit_logs WHERE org_id = $1',
      [orgId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('[COMPLIANCE] Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
};

/**
 * Placeholder function for calling KYC vendor
 * TODO: Implement with real vendor (Alloy, Persona, Onfido, etc.)
 */
async function callKYCVendor(data) {
  const apiKey = process.env.ALLOY_API_KEY || '<ALLOY_API_KEY>';
  
  if (apiKey === '<ALLOY_API_KEY>') {
    console.log('[COMPLIANCE] KYC vendor not configured, returning mock result');
    return null;
  }

  // Example: Alloy API call
  // const response = await axios.post('https://api.alloy.com/v1/evaluations', data, {
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json'
  //   }
  // });
  // return response.data;
}

/**
 * Placeholder function for calling KYB vendor
 * TODO: Implement with real vendor (Middesk, Alloy, etc.)
 */
async function callKYBVendor(data) {
  const apiKey = process.env.MIDDESK_API_KEY || '<MIDDESK_API_KEY>';
  
  if (apiKey === '<MIDDESK_API_KEY>') {
    console.log('[COMPLIANCE] KYB vendor not configured, returning mock result');
    return null;
  }

  // Example: Middesk API call
  // const response = await axios.post('https://api.middesk.com/v1/businesses', data, {
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json'
  //   }
  // });
  // return response.data;
}

module.exports = {
  performKYC,
  performKYB,
  getAuditLogs
};
