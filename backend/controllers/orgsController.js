// ============================================================
// ORGANIZATIONS CONTROLLER
// Business logic for organization management
// ============================================================

const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/orgs/:org_id/users
 * Get all users in an organization
 */
exports.getOrgUsers = async (req, res, next) => {
  try {
    const { org_id } = req.params;

    // Verify user has access to this org
    if (req.orgId !== org_id) {
      throw new AppError('Access denied to this organization', 403, 'ORG_ACCESS_DENIED');
    }

    // Get all users in the organization
    const result = await query(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at,
        last_login_at
      FROM users
      WHERE org_id = $1
      ORDER BY created_at DESC
    `, [org_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};
