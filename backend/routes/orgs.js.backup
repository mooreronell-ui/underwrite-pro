// ============================================================
// ORGANIZATIONS ROUTES
// GET /api/orgs/:org_id/users - Get all users in an organization
// ============================================================

const express = require('express');
const router = express.Router();
const orgsController = require('../controllers/orgsController');

// Get all users in an organization
router.get('/:org_id/users', orgsController.getOrgUsers);

module.exports = router;
