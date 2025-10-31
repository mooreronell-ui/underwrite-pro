# Integration Mapping - Layer 5

This document maps frontend actions to backend integration calls and webhook flows.

## Frontend Actions → Integration Calls

### 1. Send Term Sheet for Signature (DocuSign)

**Frontend Action**: User clicks "Send for Signature" button on term sheet detail page

**Frontend Code Location**: `app/deals/[id]/page.tsx` (to be added)

**Backend Integration Call**:
```javascript
// POST /api/term-sheets/:id/send-for-signature
const integrations = require('../services/integrations');

const result = await integrations.docusign.sendEnvelope({
  documentBase64: termSheetPdfBase64,
  documentName: `Term Sheet - ${deal.deal_name}.pdf`,
  signers: [
    {
      email: borrower.email,
      name: `${borrower.first_name} ${borrower.last_name}`
    }
  ],
  orgId: req.orgId
});

// Save envelope ID to term_sheets table
await query(`
  UPDATE term_sheets 
  SET docusign_envelope_id = $1, status = 'sent'
  WHERE id = $2 AND org_id = $3
`, [result.envelopeId, termSheetId, req.orgId]);
```

**Webhook Flow**:
1. DocuSign sends webhook to `POST /webhooks/docusign`
2. Webhook handler updates `term_sheets.status` to 'signed'
3. Webhook handler updates `deals.status` to 'term_sheet_signed'
4. Audit log entry created

---

### 2. Sync Borrower to GoHighLevel

**Frontend Action**: User clicks "Sync to CRM" button on borrower detail page

**Frontend Code Location**: `app/borrowers/[id]/page.tsx` (to be added)

**Backend Integration Call**:
```javascript
// POST /api/borrowers/:id/sync-to-crm
const integrations = require('../services/integrations');

const result = await integrations.ghl.upsertContact({
  email: borrower.email,
  firstName: borrower.first_name,
  lastName: borrower.last_name,
  phone: borrower.phone,
  orgId: req.orgId
});

// Save GHL contact ID to borrowers table
await query(`
  UPDATE borrowers 
  SET ghl_contact_id = $1
  WHERE id = $2 AND org_id = $3
`, [result.id, borrowerId, req.orgId]);
```

**Webhook Flow**:
1. GHL sends webhook to `POST /webhooks/ghl` when contact is updated in GHL
2. Webhook handler updates borrower information if needed
3. Audit log entry created

---

### 3. Create Deal Opportunity in GoHighLevel

**Frontend Action**: Automatically triggered when deal status changes to 'approved'

**Backend Integration Call**:
```javascript
// Triggered in POST /api/deals or PUT /api/deals/:id
const integrations = require('../services/integrations');

// First, ensure borrower is synced to GHL
const borrower = await query('SELECT ghl_contact_id FROM borrowers WHERE id = $1', [deal.borrower_id]);

if (!borrower.rows[0].ghl_contact_id) {
  // Sync borrower first
  const contactResult = await integrations.ghl.upsertContact({
    email: borrower.email,
    firstName: borrower.first_name,
    lastName: borrower.last_name,
    phone: borrower.phone,
    orgId: req.orgId
  });
  
  await query(`
    UPDATE borrowers 
    SET ghl_contact_id = $1
    WHERE id = $2
  `, [contactResult.id, deal.borrower_id]);
}

// Create opportunity
const oppResult = await integrations.ghl.createOpportunity({
  contactId: borrower.rows[0].ghl_contact_id,
  name: deal.deal_name,
  value: deal.loan_amount,
  stage: 'approved',
  orgId: req.orgId
});

// Save GHL opportunity ID to deals table
await query(`
  UPDATE deals 
  SET ghl_opportunity_id = $1
  WHERE id = $2 AND org_id = $3
`, [oppResult.id, deal.id, req.orgId]);
```

---

### 4. Process Payment (Stripe)

**Frontend Action**: User completes payment on billing page

**Frontend Code Location**: `app/billing/page.tsx`

**Backend Integration Call**:
```javascript
// POST /api/payments/create-intent
const integrations = require('../services/integrations');

const paymentIntent = await integrations.stripe.createPaymentIntent({
  amount: 299.00, // $299
  currency: 'usd',
  metadata: {
    org_id: req.orgId,
    payment_type: 'subscription'
  }
});

// Return client_secret to frontend for Stripe.js
res.json({
  clientSecret: paymentIntent.client_secret
});
```

**Webhook Flow**:
1. Stripe sends webhook to `POST /webhooks/stripe` when payment succeeds
2. Webhook handler creates entry in `payments` table
3. Webhook handler updates subscription status if applicable
4. Audit log entry created

---

### 5. Trigger Custom Automation (Make.com)

**Frontend Action**: Automatically triggered on specific events (e.g., deal approved, underwriting completed)

**Backend Integration Call**:
```javascript
// Triggered in POST /api/underwriting/run or PUT /api/deals/:id
const integrations = require('../services/integrations');

await integrations.make.triggerAutomation({
  event: 'deal_approved',
  data: {
    deal_id: deal.id,
    deal_name: deal.deal_name,
    loan_amount: deal.loan_amount,
    borrower_email: borrower.email,
    approved_at: new Date().toISOString()
  },
  orgId: req.orgId
});
```

**Webhook Flow**:
1. Make.com processes automation (e.g., sends email, updates external system)
2. Make.com can optionally send webhook back to `POST /webhooks/make`
3. Audit log entry created

---

## Webhook Security

All webhooks enforce `org_id` validation:

1. **Inbound webhook must include `org_id`** in payload or metadata
2. **Backend validates `org_id` exists** in `organizations` table
3. **All database operations are scoped to `org_id`** (respects RLS)
4. **Webhook without valid `org_id` returns 400 Bad Request**

Example validation code (in `webhooksController.js`):

```javascript
async function enforceOrgId(provider, eventId, orgId) {
  if (!orgId) {
    throw new Error('org_id is required for webhook processing');
  }

  const orgResult = await query(
    'SELECT id FROM organizations WHERE id = $1',
    [orgId]
  );

  if (orgResult.rows.length === 0) {
    throw new Error('Invalid org_id');
  }

  return orgId;
}
```

---

## Audit Logging

All webhook events are logged to the `audit_logs` table:

```javascript
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
```

This ensures all external integrations are tracked for compliance and auditing purposes.

---

## Environment Variables Required

See `.env.example` for all required integration keys:

- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **DocuSign**: `DOCUSIGN_INTEGRATOR_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_WEBHOOK_SECRET`
- **GoHighLevel**: `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_WEBHOOK_SECRET`
- **Make.com**: `MAKE_WEBHOOK_URL`

---

## Testing Webhooks Locally

Use the example payloads in `examples/webhook-payloads.json` to test webhooks:

```bash
curl -X POST http://localhost:3000/webhooks/docusign \
  -H "Content-Type: application/json" \
  -d @examples/webhook-payloads.json
```

Or use tools like:
- **ngrok** to expose local server for real webhook testing
- **Postman** to manually trigger webhook endpoints
- **Stripe CLI** for Stripe webhook testing
