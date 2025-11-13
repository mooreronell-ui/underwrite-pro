-- Migration: Add missing columns to deals table
-- Purpose: Fix schema mismatch between backend expectations and database reality
-- Date: 2025-11-13

-- Add missing columns to deals table
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS borrower_id UUID REFERENCES borrowers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS broker_id UUID,
  ADD COLUMN IF NOT EXISTS loan_type TEXT CHECK (loan_type IN ('bridge', 'term', 'construction', 'perm')),
  ADD COLUMN IF NOT EXISTS requested_ltv NUMERIC(5,2) CHECK (requested_ltv >= 0 AND requested_ltv <= 100),
  ADD COLUMN IF NOT EXISTS requested_rate NUMERIC(5,2) CHECK (requested_rate >= 0 AND requested_rate <= 30),
  ADD COLUMN IF NOT EXISTS requested_term_months INTEGER CHECK (requested_term_months > 0),
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_deals_borrower_id ON deals(borrower_id);
CREATE INDEX IF NOT EXISTS idx_deals_broker_id ON deals(broker_id);

-- Add comment
COMMENT ON COLUMN deals.borrower_id IS 'Reference to borrower (optional)';
COMMENT ON COLUMN deals.broker_id IS 'Reference to broker who created the deal';
COMMENT ON COLUMN deals.loan_type IS 'Type of loan: bridge, term, construction, or perm';
COMMENT ON COLUMN deals.requested_ltv IS 'Requested loan-to-value ratio (percentage)';
COMMENT ON COLUMN deals.requested_rate IS 'Requested interest rate (percentage)';
COMMENT ON COLUMN deals.requested_term_months IS 'Requested loan term in months';
COMMENT ON COLUMN deals.stage IS 'Deal stage: lead, active, closed, etc.';
COMMENT ON COLUMN deals.notes IS 'Additional notes or comments about the deal';
