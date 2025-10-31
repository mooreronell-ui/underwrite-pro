// ============================================================
// COMPLIANCE ROUTES - LAYER 6
// KYC/KYB/AML and audit log endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { requireAuth } = require('../middleware/auth');
const { requireUnderwriter, requireAuditor } = require('../middleware/roleCheck');

/**
 * POST /api/compliance/kyc
 * Perform KYC check on individual borrower
 * Requires: admin or underwriter role
 */
router.post('/kyc', requireAuth, requireUnderwriter, complianceController.performKYC);

/**
 * POST /api/compliance/kyb
 * Perform KYB check on business borrower
 * Requires: admin or underwriter role
 */
router.post('/kyb', requireAuth, requireUnderwriter, complianceController.performKYB);

/**
 * GET /api/compliance/audit-logs
 * Retrieve audit logs for compliance review
 * Requires: admin or auditor role
 */
router.get('/audit-logs', requireAuth, requireAuditor, complianceController.getAuditLogs);

module.exports = router;
