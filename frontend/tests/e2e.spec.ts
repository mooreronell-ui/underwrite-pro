// ============================================================
// E2E TESTS - UNDERWRITE PRO FRONTEND
// Playwright smoke tests for critical user flows
// ============================================================

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Underwrite Pro - E2E Smoke Tests', () => {
  
  // ============================================================
  // AUTHENTICATION FLOW
  // ============================================================
  test('should load login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/Underwrite Pro/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should register new user and redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Fill registration form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="first_name"]', 'Test');
    await page.fill('input[name="last_name"]', 'User');
    await page.fill('input[name="org_name"]', 'Test Organization');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ============================================================
  // DASHBOARD FLOW
  // ============================================================
  test('should display dashboard with KPIs', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'demo@underwritepro.com');
    await page.fill('input[type="password"]', 'Demo123!@#');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(/\/dashboard/);
    
    // Check for KPI cards
    await expect(page.locator('text=Total Deals')).toBeVisible();
    await expect(page.locator('text=Active Underwriting')).toBeVisible();
  });

  // ============================================================
  // DEALS FLOW
  // ============================================================
  test('should create new deal', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'demo@underwritepro.com');
    await page.fill('input[type="password"]', 'Demo123!@#');
    await page.click('button[type="submit"]');
    
    // Navigate to deals
    await page.goto(`${BASE_URL}/deals/new`);
    
    // Fill deal form
    await page.fill('input[name="deal_name"]', 'E2E Test Deal');
    await page.fill('input[name="loan_amount"]', '5000000');
    await page.selectOption('select[name="property_type"]', 'multifamily');
    await page.fill('input[name="property_address"]', '123 Test St');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to deal detail page
    await expect(page).toHaveURL(/\/deals\/[a-f0-9-]+/);
    await expect(page.locator('text=E2E Test Deal')).toBeVisible();
  });

  // ============================================================
  // UNDERWRITING FLOW
  // ============================================================
  test('should run underwriting analysis', async ({ page }) => {
    // Login and create deal first (simplified)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'demo@underwritepro.com');
    await page.fill('input[type="password"]', 'Demo123!@#');
    await page.click('button[type="submit"]');
    
    // Navigate to underwriting page
    await page.goto(`${BASE_URL}/underwriting`);
    
    // Fill underwriting form
    await page.fill('input[name="purchase_price"]', '10000000');
    await page.fill('input[name="loan_amount"]', '7500000');
    await page.fill('input[name="gross_rental_income"]', '1200000');
    await page.fill('input[name="operating_expenses"]', '480000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should display results
    await expect(page.locator('text=DSCR')).toBeVisible();
    await expect(page.locator('text=LTV')).toBeVisible();
    await expect(page.locator('text=NOI')).toBeVisible();
  });

  // ============================================================
  // COMPLIANCE FLOW
  // ============================================================
  test('should display audit logs for admin', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@underwritepro.com');
    await page.fill('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    
    // Navigate to compliance page
    await page.goto(`${BASE_URL}/admin/compliance`);
    
    // Should display audit log table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Action')).toBeVisible();
    await expect(page.locator('text=User')).toBeVisible();
  });
});
