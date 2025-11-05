// ============================================================
// DEALS ROUTES
// POST /api/deals - Create new deal
// GET /api/deals/:id - Get deal by ID
// GET /api/deals - List all deals (with pagination)
// PUT /api/deals/:id - Update deal
// ============================================================

const express = require('express');
const router = express.Router();
const supabaseAuth = require('../middleware/supabaseAuth');
const { requireRole } = require('../middleware/auth');
const dealsController = require('../controllers/dealsController');

// List all deals (filtered by active org)
router.get('/', async (req, res) => {
  const { supabase } = require('../lib/supabaseClient');
  const orgId = req.orgId;
  if (!orgId) return res.json({ ok: true, deals: [], note: "No active org; join or create one." });
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('org_id', orgId);
  if (error) {
    console.error('deals list error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to retrieve deals.' });
  }
  return res.json({ ok: true, deals: data || [] });
});

// Get single deal by ID
router.get('/:id', dealsController.getDealById);

// Create new deal
router.post('/', dealsController.createDeal);

// Update deal
router.put('/:id', dealsController.updateDeal);

// Delete deal
router.delete('/:id', dealsController.deleteDeal);

module.exports = router;
