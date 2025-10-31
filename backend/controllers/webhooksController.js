// ============================================================
// WEBHOOKS CONTROLLER - LAYER 5 ENHANCED
// Handlers for external service webhooks with org_id enforcement and audit logging
// ============================================================

const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware to enforce org_id on inbound webhooks
 * Rejects webhooks that don't have a valid org_id mapping
 */
async function enforceOrgId(provider, eventId, orgId) {
  if (!orgId) {
    throw new Error('org_id is required for webhook processing');
  }

  // Verify org exists
  const orgResult = await query(
    'SELECT id FROM organizations WHERE id = $1',
    [orgId]
  );

  if (orgResult.rows.length === 0) {
    throw new Error('Invalid org_id');
  }

  return orgId;
}

/**
 * Log webhook event to audit_log table
 */
async function logWebhookToAudit(userId, orgId, action, resourceType, resourceId, metadata) {
  await query(`
    INSERT INTO audit_logs (user_id, org_id, action, resource_type, resource_id, metadata, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    userId || null,
    orgId,
    action,
    resourceType,
    resourceId || null,
    JSON.stringify(metadata),
    'webhook'
  ]);
}

/**
 * POST /webhooks/docusign
 * Handle DocuSign envelope status updates
 * 
 * Expected payload structure:
 * {
 *   "event": "envelope-completed",
 *   "envelopeId": "abc-123",
 *   "org_id": "uuid",
 *   "status": "completed",
 *   "recipients": [...]
 * }
 */
exports.handleDocuSignWebhook = async (req, res) => {
  try {
    console.log('[WEBHOOK] DocuSign webhook received:', req.body);

    // TODO: Validate DocuSign webhook signature
    // const signature = req.headers['x-docusign-signature'];
    // const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;
    // if (!validateDocuSignSignature(req.body, signature, webhookSecret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const payload = req.body;
    const orgId = payload.org_id || payload.metadata?.org_id;

    // Enforce org_id
    await enforceOrgId('docusign', payload.envelopeId, orgId);

    // Process DocuSign event
    if (payload.event === 'envelope-completed' && payload.envelopeId) {
      // Update term sheet status
      const termSheetResult = await query(`
        UPDATE term_sheets 
        SET status = 'signed', signed_at = NOW()
        WHERE docusign_envelope_id = $1 AND org_id = $2
        RETURNING id, deal_id
      `, [payload.envelopeId, orgId]);

      if (termSheetResult.rows.length > 0) {
        const termSheet = termSheetResult.rows[0];

        // Update deal status
        await query(`
          UPDATE deals 
          SET status = 'term_sheet_signed', stage = 'closing'
          WHERE id = $1 AND org_id = $2
        `, [termSheet.deal_id, orgId]);

        // Log to audit_logs
        await logWebhookToAudit(
          null,
          orgId,
          'update',
          'term_sheet',
          termSheet.id,
          {
            provider: 'docusign',
            event: 'envelope-completed',
            envelope_id: payload.envelopeId
          }
        );

        console.log(`[WEBHOOK] Term sheet ${termSheet.id} marked as signed`);
      }
    } else if (payload.event === 'envelope-sent' && payload.envelopeId) {
      // Log envelope sent event
      await logWebhookToAudit(
        null,
        orgId,
        'view',
        'term_sheet',
        null,
        {
          provider: 'docusign',
          event: 'envelope-sent',
          envelope_id: payload.envelopeId
        }
      );
    } else if (payload.event === 'envelope-declined' && payload.envelopeId) {
      // Update term sheet status to declined
      await query(`
        UPDATE term_sheets 
        SET status = 'declined'
        WHERE docusign_envelope_id = $1 AND org_id = $2
      `, [payload.envelopeId, orgId]);

      await logWebhookToAudit(
        null,
        orgId,
        'update',
        'term_sheet',
        null,
        {
          provider: 'docusign',
          event: 'envelope-declined',
          envelope_id: payload.envelopeId
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'DocuSign webhook processed' 
    });
  } catch (error) {
    console.error('[WEBHOOK] DocuSign error:', error);
    res.status(error.message.includes('org_id') ? 400 : 500).json({ 
      success: false, 
      error: error.message || 'Webhook processing failed' 
    });
  }
};

/**
 * POST /webhooks/ghl
 * Handle GoHighLevel lead/contact updates
 * 
 * Expected payload structure:
 * {
 *   "type": "contact.created",
 *   "id": "contact-123",
 *   "org_id": "uuid",
 *   "contact": {
 *     "email": "borrower@example.com",
 *     "firstName": "John",
 *     "lastName": "Doe"
 *   }
 * }
 */
exports.handleGHLWebhook = async (req, res) => {
  try {
    console.log('[WEBHOOK] GoHighLevel webhook received:', req.body);

    // TODO: Validate GHL webhook signature
    // const signature = req.headers['x-ghl-signature'];
    // const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    // if (!validateGHLSignature(req.body, signature, webhookSecret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const payload = req.body;
    const orgId = payload.org_id || payload.locationId; // GHL uses locationId as org identifier

    // Enforce org_id
    await enforceOrgId('ghl', payload.id, orgId);

    // Process GHL event
    if (payload.type === 'contact.created' && payload.contact) {
      const contact = payload.contact;
      
      // Check if borrower already exists
      const existingBorrower = await query(
        'SELECT id FROM borrowers WHERE email = $1 AND org_id = $2',
        [contact.email, orgId]
      );

      if (existingBorrower.rows.length === 0) {
        // Create new borrower
        const borrowerResult = await query(`
          INSERT INTO borrowers (org_id, first_name, last_name, email, phone, ghl_contact_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          orgId,
          contact.firstName || '',
          contact.lastName || '',
          contact.email,
          contact.phone || null,
          payload.id
        ]);

        // Log to audit_logs
        await logWebhookToAudit(
          null,
          orgId,
          'create',
          'borrower',
          borrowerResult.rows[0].id,
          {
            provider: 'ghl',
            event: 'contact.created',
            ghl_contact_id: payload.id
          }
        );

        console.log(`[WEBHOOK] Created borrower from GHL contact: ${contact.email}`);
      }
    } else if (payload.type === 'opportunity.created' && payload.opportunity) {
      // Log opportunity creation
      await logWebhookToAudit(
        null,
        orgId,
        'create',
        'opportunity',
        null,
        {
          provider: 'ghl',
          event: 'opportunity.created',
          opportunity_id: payload.opportunity.id
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'GHL webhook processed' 
    });
  } catch (error) {
    console.error('[WEBHOOK] GHL error:', error);
    res.status(error.message.includes('org_id') ? 400 : 500).json({ 
      success: false, 
      error: error.message || 'Webhook processing failed' 
    });
  }
};

/**
 * POST /webhooks/stripe
 * Handle Stripe payment/subscription events
 * 
 * Expected payload structure (Stripe Event object):
 * {
 *   "id": "evt_123",
 *   "type": "invoice.payment_succeeded",
 *   "data": {
 *     "object": {
 *       "customer": "cus_123",
 *       "subscription": "sub_123",
 *       "metadata": {
 *         "org_id": "uuid"
 *       }
 *     }
 *   }
 * }
 */
exports.handleStripeWebhook = async (req, res) => {
  try {
    console.log('[WEBHOOK] Stripe webhook received');

    // TODO: Validate Stripe webhook signature
    // const signature = req.headers['stripe-signature'];
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // 
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    // const payload = event;

    const payload = req.body;
    const dataObject = payload.data?.object || {};
    const orgId = dataObject.metadata?.org_id;

    // Enforce org_id
    await enforceOrgId('stripe', payload.id, orgId);

    // Process Stripe event
    if (payload.type === 'invoice.payment_succeeded') {
      // Payment succeeded - create payment record
      const paymentResult = await query(`
        INSERT INTO payments (org_id, stripe_payment_intent_id, amount, currency, status, payment_method, paid_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [
        orgId,
        dataObject.payment_intent || null,
        dataObject.amount_paid / 100, // Stripe uses cents
        dataObject.currency || 'usd',
        'succeeded',
        'stripe'
      ]);

      // Log to audit_logs
      await logWebhookToAudit(
        null,
        orgId,
        'create',
        'payment',
        paymentResult.rows[0].id,
        {
          provider: 'stripe',
          event: 'invoice.payment_succeeded',
          invoice_id: dataObject.id,
          amount: dataObject.amount_paid / 100
        }
      );

      console.log(`[WEBHOOK] Payment recorded: $${dataObject.amount_paid / 100}`);
    } else if (payload.type === 'customer.subscription.updated') {
      // Subscription updated
      const subscription = dataObject;
      
      await query(`
        UPDATE subscriptions 
        SET status = $1, current_period_end = to_timestamp($2)
        WHERE stripe_subscription_id = $3 AND org_id = $4
      `, [
        subscription.status,
        subscription.current_period_end,
        subscription.id,
        orgId
      ]);

      // Log to audit_logs
      await logWebhookToAudit(
        null,
        orgId,
        'update',
        'subscription',
        null,
        {
          provider: 'stripe',
          event: 'customer.subscription.updated',
          subscription_id: subscription.id,
          status: subscription.status
        }
      );
    } else if (payload.type === 'customer.subscription.deleted') {
      // Subscription canceled
      await query(`
        UPDATE subscriptions 
        SET status = 'canceled', canceled_at = NOW()
        WHERE stripe_subscription_id = $1 AND org_id = $2
      `, [dataObject.id, orgId]);

      // Log to audit_logs
      await logWebhookToAudit(
        null,
        orgId,
        'delete',
        'subscription',
        null,
        {
          provider: 'stripe',
          event: 'customer.subscription.deleted',
          subscription_id: dataObject.id
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'Stripe webhook processed' 
    });
  } catch (error) {
    console.error('[WEBHOOK] Stripe error:', error);
    res.status(error.message.includes('org_id') ? 400 : 500).json({ 
      success: false, 
      error: error.message || 'Webhook processing failed' 
    });
  }
};

/**
 * POST /webhooks/make
 * Handle Make.com (Integromat) automation webhooks
 * 
 * Expected payload structure:
 * {
 *   "org_id": "uuid",
 *   "event": "custom_automation",
 *   "data": { ... }
 * }
 */
exports.handleMakeWebhook = async (req, res) => {
  try {
    console.log('[WEBHOOK] Make.com webhook received:', req.body);

    const payload = req.body;
    const orgId = payload.org_id;

    // Enforce org_id
    await enforceOrgId('make', payload.event, orgId);

    // Log to audit_logs
    await logWebhookToAudit(
      null,
      orgId,
      'create',
      'automation',
      null,
      {
        provider: 'make',
        event: payload.event,
        data: payload.data
      }
    );

    // Generic webhook processing - can be extended based on automation type
    console.log(`[WEBHOOK] Make.com automation triggered: ${payload.event}`);

    res.status(200).json({ 
      success: true, 
      message: 'Make.com webhook processed' 
    });
  } catch (error) {
    console.error('[WEBHOOK] Make.com error:', error);
    res.status(error.message.includes('org_id') ? 400 : 500).json({ 
      success: false, 
      error: error.message || 'Webhook processing failed' 
    });
  }
};

/**
 * Validate webhook signatures (placeholder functions)
 * TODO: Implement actual signature validation when secrets are configured
 */
function validateDocuSignSignature(payload, signature, secret) {
  // DocuSign HMAC signature validation
  // const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // return hash === signature;
  return true; // Placeholder
}

function validateGHLSignature(payload, signature, secret) {
  // GHL signature validation
  // Implementation depends on GHL's signature scheme
  return true; // Placeholder
}

module.exports = {
  handleDocuSignWebhook,
  handleGHLWebhook,
  handleStripeWebhook,
  handleMakeWebhook
};
