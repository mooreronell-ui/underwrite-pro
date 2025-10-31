// ============================================================
// API TESTS - UNDERWRITE PRO
// Automated tests for core API endpoints
// ============================================================

const request = require('supertest');
const app = require('../index'); // Assuming index.js exports the Express app

describe('API Tests - Underwrite Pro', () => {
  let authToken;
  let orgId;
  let dealId;

  // ============================================================
  // AUTHENTICATION TESTS
  // ============================================================
  describe('Authentication', () => {
    test('POST /api/auth/register - should create new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          first_name: 'Test',
          last_name: 'User',
          org_name: 'Test Org'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      
      authToken = response.body.data.token;
      orgId = response.body.data.user.org_id;
    });

    test('POST /api/auth/login - should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });
  });

  // ============================================================
  // DEALS TESTS
  // ============================================================
  describe('Deals API', () => {
    test('POST /api/deals - should create new deal', async () => {
      const response = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deal_name: 'Test Apartment Complex',
          loan_amount: 5000000,
          property_type: 'multifamily',
          property_address: '123 Main St',
          borrower_name: 'John Doe',
          borrower_email: 'john@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      
      dealId = response.body.data.id;
    });

    test('GET /api/deals/:id - should retrieve deal by ID', async () => {
      const response = await request(app)
        .get(`/api/deals/${dealId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deal_name).toBe('Test Apartment Complex');
    });

    test('GET /api/deals - should list all deals for org', async () => {
      const response = await request(app)
        .get('/api/deals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================
  // UNDERWRITING TESTS
  // ============================================================
  describe('Underwriting API', () => {
    test('POST /api/underwriting/run - should run underwriting analysis', async () => {
      const response = await request(app)
        .post('/api/underwriting/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deal_id: dealId,
          purchase_price: 10000000,
          loan_amount: 7500000,
          gross_rental_income: 1200000,
          operating_expenses: 480000,
          property_value: 10000000
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dscr');
      expect(response.body.data).toHaveProperty('ltv');
      expect(response.body.data).toHaveProperty('net_operating_income');
    });

    test('GET /api/underwriting/:id - should retrieve underwriting result', async () => {
      // First, run underwriting to get an ID
      const runResponse = await request(app)
        .post('/api/underwriting/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deal_id: dealId,
          purchase_price: 10000000,
          loan_amount: 7500000,
          gross_rental_income: 1200000,
          operating_expenses: 480000,
          property_value: 10000000
        });

      const underwritingId = runResponse.body.data.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/underwriting/${underwritingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(underwritingId);
    });
  });

  // ============================================================
  // WEBHOOK TESTS
  // ============================================================
  describe('Webhooks API', () => {
    test('POST /webhooks/stripe - should process Stripe webhook', async () => {
      const response = await request(app)
        .post('/webhooks/stripe')
        .send({
          id: 'evt_test_123',
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'in_test_123',
              amount_paid: 29900,
              currency: 'usd',
              metadata: {
                org_id: orgId
              }
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('POST /webhooks/docusign - should process DocuSign webhook', async () => {
      const response = await request(app)
        .post('/webhooks/docusign')
        .send({
          event: 'envelope-completed',
          envelopeId: 'test-envelope-123',
          org_id: orgId,
          status: 'completed'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('POST /webhooks/ghl - should process GoHighLevel webhook', async () => {
      const response = await request(app)
        .post('/webhooks/ghl')
        .send({
          type: 'contact.created',
          id: 'contact-test-123',
          org_id: orgId,
          contact: {
            email: 'newlead@example.com',
            firstName: 'Jane',
            lastName: 'Smith'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================
  // COMPLIANCE TESTS
  // ============================================================
  describe('Compliance API', () => {
    test('POST /api/compliance/kyc - should perform KYC check', async () => {
      // First create a borrower
      const borrowerResponse = await request(app)
        .post('/api/borrowers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          entity_type: 'individual'
        });

      const borrowerId = borrowerResponse.body.data.id;

      // Then run KYC
      const response = await request(app)
        .post('/api/compliance/kyc')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          borrower_id: borrowerId,
          ssn: '000-00-0000',
          date_of_birth: '1990-05-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kyc_status');
    });

    test('GET /api/compliance/audit-logs - should retrieve audit logs', async () => {
      const response = await request(app)
        .get('/api/compliance/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
