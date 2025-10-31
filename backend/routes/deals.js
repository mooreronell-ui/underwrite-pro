// ============================================================
// DEALS ROUTES
// POST /api/deals - Create new deal
// GET /api/deals/:id - Get deal by ID
// GET /api/deals - List all deals (with pagination)
// PUT /api/deals/:id - Update deal
// ============================================================

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const dealsController = require('../controllers/dealsController');

// Create new deal (brokers, underwriters, admins)
router.post('/', 
  requireRole(['broker', 'underwriter', 'admin']),
  dealsController.createDeal
);

// Get single deal by ID
router.get('/:id', 
  dealsController.getDealById
);

// List all deals (with pagination and filters)
router.get('/', 
  dealsController.listDeals
);

// Update deal
router.put('/:id',
  requireRole(['broker', 'underwriter', 'admin']),
  dealsController.updateDeal
);

// Delete deal (admin only)
router.delete('/:id',
  requireRole(['admin']),
  dealsController.deleteDeal
);

module.exports = router;
