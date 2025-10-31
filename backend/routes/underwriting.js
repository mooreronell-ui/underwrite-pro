// ============================================================
// UNDERWRITING ROUTES
// POST /api/underwriting/run - Run underwriting analysis
// GET /api/underwriting/:id - Get underwriting result by ID
// GET /api/underwriting/deal/:deal_id - Get underwriting results for a deal
// ============================================================

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const underwritingController = require('../controllers/underwritingController');

// Run underwriting analysis (underwriters and admins only)
router.post('/run',
  requireRole(['underwriter', 'admin']),
  underwritingController.runUnderwriting
);

// Get underwriting result by ID
router.get('/:id',
  underwritingController.getUnderwritingById
);

// Get all underwriting results for a specific deal
router.get('/deal/:deal_id',
  underwritingController.getUnderwritingByDealId
);

module.exports = router;
