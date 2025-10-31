// ============================================================
// FIELD SHIELDING MIDDLEWARE - LAYER 6
// Shields PII and financial data from non-admin roles
// ============================================================

/**
 * Fields that should be shielded for non-admin users
 */
const SHIELDED_FIELDS = {
  borrowers: ['ssn', 'tax_id', 'date_of_birth', 'bank_account_number'],
  deals: ['internal_notes', 'commission_amount'],
  users: ['password_hash', 'reset_token'],
  payments: ['stripe_payment_intent_id', 'payment_method_details']
};

/**
 * Middleware to shield sensitive fields based on user role
 * Only admins can see all fields
 */
function shieldSensitiveFields(resourceType) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to shield fields
    res.json = function(data) {
      // Only shield if user is not admin
      if (req.user && req.user.role !== 'admin') {
        const shieldedData = shieldFields(data, resourceType);
        return originalJson(shieldedData);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Recursively shield fields in data object
 */
function shieldFields(data, resourceType) {
  if (!data) return data;

  const fieldsToShield = SHIELDED_FIELDS[resourceType] || [];

  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => shieldFields(item, resourceType));
  }

  // Handle nested data structure (e.g., { success: true, data: {...} })
  if (data.data) {
    return {
      ...data,
      data: shieldFields(data.data, resourceType)
    };
  }

  // Handle single object
  if (typeof data === 'object') {
    const shielded = { ...data };
    
    fieldsToShield.forEach(field => {
      if (shielded[field] !== undefined) {
        shielded[field] = '***REDACTED***';
      }
    });

    return shielded;
  }

  return data;
}

module.exports = {
  shieldSensitiveFields,
  SHIELDED_FIELDS
};
