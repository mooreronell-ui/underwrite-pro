// ============================================================
// SECURITY CONFIGURATION - LAYER 6
// SOC2 posture helpers and security controls
// ============================================================

/**
 * Security configuration for SOC2 compliance
 */
const securityConfig = {
  // Password policy
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // days
    preventReuse: 5 // number of previous passwords to check
  },

  // Session management
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    refreshThreshold: 15 * 60 * 1000, // 15 minutes
    maxConcurrentSessions: 3
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // max requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // IP allowlist (optional)
  ipAllowlist: {
    enabled: process.env.IP_ALLOWLIST_ENABLED === 'true',
    whitelist: (process.env.IP_ALLOWLIST || '').split(',').filter(Boolean)
  },

  // Data retention policy
  dataRetention: {
    auditLogs: 2555, // days (7 years for financial compliance)
    deletedRecords: 90, // days to keep soft-deleted records
    sessionLogs: 90, // days
    backups: 365 // days
  },

  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90
  },

  // Webhook security
  webhooks: {
    validateSignatures: true,
    maxRetries: 3,
    timeoutMs: 30000
  },

  // File upload restrictions
  fileUpload: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
  },

  // Audit logging
  audit: {
    logAllRequests: true,
    logFailedLogins: true,
    logDataChanges: true,
    logAccessToSensitiveData: true
  }
};

/**
 * Validate password against policy
 */
function validatePassword(password) {
  const policy = securityConfig.password;
  const errors = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if IP is allowed
 */
function isIPAllowed(ip) {
  if (!securityConfig.ipAllowlist.enabled) {
    return true;
  }

  return securityConfig.ipAllowlist.whitelist.includes(ip);
}

/**
 * Get data retention period for resource type
 */
function getRetentionPeriod(resourceType) {
  return securityConfig.dataRetention[resourceType] || securityConfig.dataRetention.auditLogs;
}

module.exports = {
  securityConfig,
  validatePassword,
  isIPAllowed,
  getRetentionPeriod
};
