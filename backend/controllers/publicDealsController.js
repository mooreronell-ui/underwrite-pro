// ============================================================
// PUBLIC DEALS CONTROLLER (NO AUTH)
// For testing database connectivity without JWT
// Uses Supabase HTTP client instead of direct Postgres
// ============================================================

const { supabase } = require('../lib/supabaseClient');

/**
 * GET /api/deals/public
 * List recent deals without authentication (for testing only)
 */
exports.listPublicDeals = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      });
    }

    // First query: get deals
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, deal_name, loan_amount, asset_type, status, created_at, org_id')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      console.error('[PUBLIC_DEALS] Supabase deals error:', error);
      return res.status(500).json({
        error: 'SUPABASE_DEALS_ERROR',
        details: error.message
      });
    }

    // Optional: get financials for those deals
    const dealIds = (deals || []).map(d => d.id);
    let financialsByDeal = {};
    
    if (dealIds.length > 0) {
      const { data: financials, error: finError } = await supabase
        .from('property_financials')
        .select('deal_id, dscr, net_operating_income, ltv, purchase_price')
        .in('deal_id', dealIds);

      if (!finError && financials) {
        financialsByDeal = financials.reduce((acc, row) => {
          acc[row.deal_id] = row;
          return acc;
        }, {});
      }
    }

    // Format the response
    const result = (deals || []).map(d => ({
      id: d.id,
      name: d.deal_name,
      loan_amount: d.loan_amount,
      asset_type: d.asset_type,
      status: d.status,
      created_at: d.created_at,
      org_id: d.org_id,
      financials: financialsByDeal[d.id] || null
    }));

    return res.json({
      ok: true,
      count: result.length,
      deals: result
    });
  } catch (error) {
    console.error('[PUBLIC_DEALS] Unexpected error:', error);
    return res.status(500).json({
      error: 'UNEXPECTED_ERROR',
      details: error.message
    });
  }
};
