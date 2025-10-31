// ============================================================
// WEBHOOK ROUTES - LAYER 5
// External service webhook endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooksController');

/**
 * POST /webhooks/docusign
 * DocuSign envelope status updates
 */
router.post('/docusign', webhooksController.handleDocuSignWebhook);

/**
 * POST /webhooks/ghl
 * GoHighLevel contact/opportunity updates
 */
router.post('/ghl', webhooksController.handleGHLWebhook);

/**
 * POST /webhooks/stripe
 * Stripe payment/subscription events
 */
router.post('/stripe', webhooksController.handleStripeWebhook);

/**
 * POST /webhooks/make
 * Make.com automation triggers
 */
router.post('/make', webhooksController.handleMakeWebhook);

module.exports = router;
