// ============================================================
// TERM SHEETS ROUTES
// POST /api/term-sheets - Create/generate term sheet
// GET /api/term-sheets/:id - Get term sheet by ID
// GET /api/term-sheets/deal/:deal_id - Get term sheets for a deal
// ============================================================

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const termSheetsController = require('../controllers/termSheetsController');

// Create/generate term sheet (underwriters and admins only)
router.post('/',
  requireRole(['underwriter', 'admin']),
  termSheetsController.createTermSheet
);

// Get term sheet by ID
router.get('/:id',
  termSheetsController.getTermSheetById
);

// Get all term sheets for a specific deal
router.get('/deal/:deal_id',
  termSheetsController.getTermSheetsByDealId
);

module.exports = router;
