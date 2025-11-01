// ============================================================
// PUBLIC DEALS CONTROLLER (NO AUTH)
// For testing database connectivity without JWT
// ============================================================

const { query } = require('../config/database');

/**
 * GET /api/deals/public
 * List recent deals without authentication (for testing only)
 */
exports.listPublicDeals = async (req, res) => {
  try {
    // Query the database directly without RLS
    const result = await query(`
      SELECT 
        d.id,
        d.deal_name,
        d.loan_amount,
        d.asset_type,
        d.status,
        d.created_at,
        d.org_id,
        o.name as org_name,
        pf.purchase_price,
        pf.gross_rental_income,
        pf.net_operating_income,
        pf.dscr,
        pf.ltv
      FROM deals d
      LEFT JOIN organizations o ON d.org_id = o.id
      LEFT JOIN property_financials pf ON d.id = pf.deal_id
      ORDER BY d.created_at DESC
      LIMIT 25
    `);

    return res.json({
      ok: true,
      count: result.rows.length,
      deals: result.rows
    });
  } catch (error) {
    console.error('[PUBLIC_DEALS] Database error:', error);
    return res.status(500).json({
      error: 'DB_ERROR',
      details: error.message
    });
  }
};
