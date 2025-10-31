// ============================================================
// AUDIT LOG MIDDLEWARE
// Logs all CREATE/UPDATE/DELETE operations for compliance
// ============================================================

const { query } = require('../config/database');

/**
 * Middleware to capture and log all data mutations
 * Logs are written to audit_logs table after successful operations
 */
const auditLogMiddleware = (req, res, next) => {
  // Only log mutation operations
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!mutationMethods.includes(req.method)) {
    return next();
  }

  // Store original res.json to intercept response
  const originalJson = res.json;

  res.json = async function (data) {
    // Only log if response was successful (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await logAuditEvent(req, res, data);
      } catch (error) {
        console.error('[AUDIT] Failed to write audit log:', error);
        // Don't fail the request if audit logging fails
      }
    }

    // Call original res.json
    originalJson.call(this, data);
  };

  next();
};

/**
 * Write audit log entry to database
 */
async function logAuditEvent(req, res, responseData) {
  try {
    // Determine action based on HTTP method
    const actionMap = {
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    const action = actionMap[req.method];

    // Extract resource type from URL path
    // e.g., /api/deals -> 'deal', /api/term-sheets -> 'term_sheet'
    const pathParts = req.path.split('/').filter(p => p);
    const resourceType = pathParts[1] ? pathParts[1].replace(/-/g, '_').replace(/s$/, '') : 'unknown';

    // Extract resource ID from response or URL
    let resourceId = null;
    if (responseData && responseData.id) {
      resourceId = responseData.id;
    } else if (pathParts[2]) {
      resourceId = pathParts[2];
    }

    // Capture request body as changes (sanitize sensitive fields)
    const changes = sanitizeData(req.body);

    // Insert audit log entry
    await query(`
      INSERT INTO audit_logs (
        org_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        user_agent,
        severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      req.user?.org_id || null,
      req.user?.id || null,
      action,
      resourceType,
      resourceId,
      JSON.stringify(changes),
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent'] || null,
      'info'
    ]);

    console.log(`[AUDIT] Logged ${action} on ${resourceType} by user ${req.user?.email}`);
  } catch (error) {
    console.error('[AUDIT] Error writing audit log:', error);
    throw error;
  }
}

/**
 * Sanitize sensitive data before logging
 * Removes passwords, API keys, SSN, etc.
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'password_hash',
    'api_key',
    'secret',
    'token',
    'ssn',
    'ssn_encrypted',
    'ein_encrypted',
    'credit_card',
    'cvv'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Manual audit log helper for use in controllers
 * Usage: await logAudit(req, 'create', 'deal', dealId, { loan_amount: 1000000 });
 */
async function logAudit(req, action, resourceType, resourceId, changes = {}) {
  try {
    await query(`
      INSERT INTO audit_logs (
        org_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      req.user?.org_id || null,
      req.user?.id || null,
      action,
      resourceType,
      resourceId,
      JSON.stringify(sanitizeData(changes)),
      req.ip || req.connection.remoteAddress,
      'info'
    ]);
  } catch (error) {
    console.error('[AUDIT] Manual log failed:', error);
  }
}

module.exports = {
  auditLogMiddleware,
  logAudit
};
