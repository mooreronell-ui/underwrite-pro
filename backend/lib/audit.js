// ============================================================
// AUDIT LOGGING UTILITY
// Lightweight, non-blocking audit trail for sensitive actions
// ============================================================

const { supabase } = require('./supabaseClient');

/**
 * Log an audit event to the audit_logs table
 * 
 * @param {string|null} orgId - Organization ID (null for org creation)
 * @param {string|null} actorId - User ID performing the action
 * @param {string} eventType - Event type (e.g., 'org.create', 'deal.create')
 * @param {object|null} payload - Additional event data
 * @returns {Promise<void>}
 */
async function audit(orgId, actorId, eventType, payload = null) {
  try {
    if (!supabase) {
      console.warn('[AUDIT] Supabase client not available, skipping audit log');
      return;
    }

    const auditEntry = {
      org_id: orgId || null,
      actor_id: actorId || null,
      event_type: eventType,
      event_payload: payload || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error('[AUDIT] Failed to log event:', {
        eventType,
        error: error.message
      });
    } else {
      console.log('[AUDIT] Event logged:', eventType);
    }
  } catch (err) {
    // Catch any unexpected errors and log them
    console.error('[AUDIT] Unexpected error:', err.message);
  }
}

/**
 * Audit helper for organization creation
 */
async function auditOrgCreate(orgId, actorId, orgData) {
  return audit(orgId, actorId, 'org.create', {
    org_name: orgData.name,
    org_type: orgData.type || 'standard'
  });
}

/**
 * Audit helper for organization invite
 */
async function auditOrgInvite(orgId, actorId, inviteData) {
  return audit(orgId, actorId, 'org.invite.send', {
    invited_email: inviteData.email,
    invited_role: inviteData.role || 'member'
  });
}

/**
 * Audit helper for invite acceptance
 */
async function auditInviteAccept(orgId, actorId, inviteData) {
  return audit(orgId, actorId, 'org.invite.accept', {
    invite_id: inviteData.id,
    role: inviteData.role
  });
}

/**
 * Audit helper for deal creation
 */
async function auditDealCreate(orgId, actorId, dealData) {
  return audit(orgId, actorId, 'deal.create', {
    deal_id: dealData.id,
    deal_name: dealData.name || dealData.deal_name,
    loan_amount: dealData.loan_amount,
    asset_type: dealData.asset_type
  });
}

/**
 * Audit helper for deal update
 */
async function auditDealUpdate(orgId, actorId, dealId, changes) {
  return audit(orgId, actorId, 'deal.update', {
    deal_id: dealId,
    changes: changes
  });
}

/**
 * Audit helper for deal deletion
 */
async function auditDealDelete(orgId, actorId, dealId) {
  return audit(orgId, actorId, 'deal.delete', {
    deal_id: dealId
  });
}

module.exports = {
  audit,
  auditOrgCreate,
  auditOrgInvite,
  auditInviteAccept,
  auditDealCreate,
  auditDealUpdate,
  auditDealDelete
};
