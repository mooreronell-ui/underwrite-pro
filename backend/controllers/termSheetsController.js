// ============================================================
// TERM SHEETS CONTROLLER
// Business logic for term sheet generation
// ============================================================

const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const Joi = require('joi');

/**
 * Validation schema for term sheet creation
 */
const createTermSheetSchema = Joi.object({
  deal_id: Joi.string().uuid().required(),
  loan_amount: Joi.number().positive().required(),
  interest_rate: Joi.number().min(0).max(30).required(),
  term_months: Joi.number().integer().positive().required(),
  amortization_months: Joi.number().integer().positive().optional(),
  ltv: Joi.number().min(0).max(100).optional(),
  recourse_type: Joi.string().valid('recourse', 'non_recourse', 'partial').optional(),
  prepayment_penalty: Joi.string().optional(),
  origination_fee: Joi.number().min(0).max(10).optional(),
  conditions: Joi.string().optional(),
  expiration_date: Joi.date().optional()
});

/**
 * POST /api/term-sheets
 * Create/generate a term sheet
 */
exports.createTermSheet = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = createTermSheetSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const {
      deal_id,
      loan_amount,
      interest_rate,
      term_months,
      amortization_months,
      ltv,
      recourse_type,
      prepayment_penalty,
      origination_fee,
      conditions,
      expiration_date
    } = value;

    // Verify deal exists and belongs to user's org
    const dealResult = await query(
      'SELECT * FROM deals WHERE id = $1 AND org_id = $2',
      [deal_id, req.user.org_id]
    );

    if (dealResult.rows.length === 0) {
      throw new AppError('Deal not found', 404, 'DEAL_NOT_FOUND');
    }

    // Get version number (increment if term sheets already exist for this deal)
    const versionResult = await query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM term_sheets WHERE deal_id = $1',
      [deal_id]
    );
    const version = versionResult.rows[0].next_version;

    // Insert term sheet
    const result = await query(`
      INSERT INTO term_sheets (
        org_id,
        deal_id,
        version,
        loan_amount,
        interest_rate,
        term_months,
        amortization_months,
        ltv,
        recourse_type,
        prepayment_penalty,
        origination_fee,
        conditions,
        expiration_date,
        status,
        generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      req.user.org_id,
      deal_id,
      version,
      loan_amount,
      interest_rate,
      term_months,
      amortization_months || null,
      ltv || null,
      recourse_type || 'recourse',
      prepayment_penalty || null,
      origination_fee || 1.0,
      conditions || null,
      expiration_date || null,
      'draft',
      req.user.id
    ]);

    // Update deal status
    await query(
      `UPDATE deals SET status = 'term_sheet_sent', stage = 'docs' WHERE id = $1`,
      [deal_id]
    );

    res.status(201).json({
      success: true,
      message: 'Term sheet created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/term-sheets/:id
 * Get term sheet by ID
 */
exports.getTermSheetById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        ts.*,
        d.deal_name,
        b.entity_name as borrower_name,
        u.email as generated_by_email
      FROM term_sheets ts
      LEFT JOIN deals d ON ts.deal_id = d.id
      LEFT JOIN borrowers b ON d.borrower_id = b.id
      LEFT JOIN users u ON ts.generated_by = u.id
      WHERE ts.id = $1 AND ts.org_id = $2
    `, [id, req.user.org_id]);

    if (result.rows.length === 0) {
      throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/term-sheets/deal/:deal_id
 * Get all term sheets for a specific deal
 */
exports.getTermSheetsByDealId = async (req, res, next) => {
  try {
    const { deal_id } = req.params;

    // Verify deal belongs to user's org
    const dealCheck = await query(
      'SELECT id FROM deals WHERE id = $1 AND org_id = $2',
      [deal_id, req.user.org_id]
    );

    if (dealCheck.rows.length === 0) {
      throw new AppError('Deal not found', 404, 'DEAL_NOT_FOUND');
    }

    const result = await query(`
      SELECT 
        ts.*,
        u.email as generated_by_email
      FROM term_sheets ts
      LEFT JOIN users u ON ts.generated_by = u.id
      WHERE ts.deal_id = $1 AND ts.org_id = $2
      ORDER BY ts.version DESC
    `, [deal_id, req.user.org_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};
