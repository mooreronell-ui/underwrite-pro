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

// Create new deal (brokers, underwriters, admins) - PROTECTED
router.post('/', 
  supabaseAuth,
  requireRole(['broker', 'underwriter', 'admin']),
  dealsController.createDeal
);

// Get single deal by ID - PROTECTED
router.get('/:id', 
  supabaseAuth,
  dealsController.getDealById
);

// List all deals (with pagination and filters) - PROTECTED
router.get('/', 
  supabaseAuth,
  dealsController.listDeals
);

// Update deal - PROTECTED
router.put('/:id',
  supabaseAuth,
  requireRole(['broker', 'underwriter', 'admin']),
  dealsController.updateDeal
);

// Delete deal (admin only) - PROTECTED
router.delete('/:id',
  supabaseAuth,
  requireRole(['admin']),
  dealsController.deleteDeal
);

module.exports = router;
