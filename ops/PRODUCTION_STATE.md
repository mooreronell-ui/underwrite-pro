# 🔒 PRODUCTION STATE — Underwrite Pro

**Status:** LOCKED  
**Version:** v1.0.0-prod-lock  
**Date:** November 5, 2025

---

## ⚠️ CRITICAL: Development Workflow Frozen

**This application is now in PRODUCTION STATE.**

### What This Means

1. **NO REGENERATION** of layers 1–7
   - Do NOT regenerate backend scaffolding
   - Do NOT regenerate frontend scaffolding
   - Do NOT regenerate database schema
   - Do NOT regenerate authentication system
   - Do NOT regenerate API routes
   - Do NOT regenerate UI components
   - Do NOT regenerate deployment configuration

2. **PATCHES ONLY**
   - All changes MUST be submitted as diffs/patches
   - All changes MUST be reviewed via Pull Requests
   - All changes MUST pass CI checks (lint + tests)
   - All changes MUST include rollback plan

3. **INTEGRATION REQUIRED**
   - All new features MUST integrate existing auth system
   - All new features MUST respect org context
   - All new features MUST follow established patterns
   - All new features MUST include audit logging

---

## 📋 Change Requirements

### Before Making ANY Changes

1. **Create a Pull Request**
   - Use the PR template (`.github/pull_request_template.md`)
   - Fill out ALL required sections
   - Link to related issues

2. **Pass CI Checks**
   - ✅ `build` - Both frontend and backend must build
   - ✅ `test:backend` - All backend tests must pass
   - ✅ `test:frontend` - All frontend tests must pass
   - ✅ `lint` - Code must pass linting

3. **Get Code Review**
   - Requires approval from `@mooreronell-ui`
   - Address all review comments
   - Re-request review after changes

4. **Verify Deployment**
   - Test in staging environment (if available)
   - Verify no breaking changes
   - Confirm rollback plan works

---

## 🚫 Prohibited Actions

### NEVER Do These Without Approval

1. **Schema Changes**
   - Do NOT drop tables
   - Do NOT rename columns without migration
   - Do NOT change column types without compatibility layer
   - Do NOT remove indexes without performance analysis

2. **Breaking API Changes**
   - Do NOT change response formats
   - Do NOT remove endpoints
   - Do NOT change authentication requirements
   - Do NOT modify public endpoints without deprecation

3. **Infrastructure Changes**
   - Do NOT change deployment configuration without testing
   - Do NOT modify environment variables without documentation
   - Do NOT change database connection settings
   - Do NOT alter CORS or security headers

4. **Dependency Updates**
   - Do NOT update major versions without testing
   - Do NOT add new dependencies without justification
   - Do NOT remove dependencies without impact analysis

---

## ✅ Allowed Changes (With PR)

### Safe Changes That Require PR + CI

1. **Bug Fixes**
   - Fix logic errors
   - Correct validation issues
   - Resolve security vulnerabilities
   - Patch performance problems

2. **Feature Additions**
   - Add new endpoints (non-breaking)
   - Add new UI components
   - Add new database tables (with migrations)
   - Add new integrations (with feature flags)

3. **Improvements**
   - Optimize queries
   - Improve error messages
   - Enhance logging
   - Add monitoring

4. **Documentation**
   - Update README
   - Add API documentation
   - Improve code comments
   - Update deployment guides

---

## 🔐 Security Requirements

### All Changes Must

1. **Respect Authentication**
   - Use Supabase JWT verification
   - Validate tokens on protected routes
   - Include user context in requests

2. **Enforce Authorization**
   - Check organization membership
   - Verify user permissions
   - Respect RLS policies

3. **Protect Data**
   - Sanitize inputs
   - Validate outputs
   - Encrypt sensitive data
   - Log security events

4. **Follow Best Practices**
   - Use parameterized queries
   - Implement rate limiting
   - Handle errors gracefully
   - Avoid exposing secrets

---

## 📊 Monitoring Requirements

### All Features Must Include

1. **Logging**
   - Log important events
   - Include context (user, org, timestamp)
   - Use appropriate log levels
   - Avoid logging sensitive data

2. **Error Tracking**
   - Catch and report errors
   - Include stack traces
   - Add contextual information
   - Don't expose internals to users

3. **Performance Metrics**
   - Track response times
   - Monitor database queries
   - Measure API latency
   - Alert on anomalies

4. **Audit Trail**
   - Log sensitive actions
   - Record org/user context
   - Include event payloads
   - Retain for compliance

---

## 🧪 Testing Requirements

### All Changes Must Include

1. **Unit Tests**
   - Test individual functions
   - Cover edge cases
   - Mock external dependencies
   - Aim for 80%+ coverage

2. **Integration Tests**
   - Test API endpoints
   - Verify database interactions
   - Check authentication flows
   - Validate error handling

3. **Manual Testing**
   - Test in local environment
   - Verify UI changes
   - Check mobile responsiveness
   - Test with real data

4. **Regression Testing**
   - Verify existing features still work
   - Check for performance degradation
   - Ensure no breaking changes
   - Validate rollback procedure

---

## 🚀 Deployment Process

### Standard Deployment Flow

1. **Merge to Main**
   - PR approved and CI passed
   - All comments addressed
   - Conflicts resolved

2. **Automatic Deployment**
   - Render auto-deploys from main
   - Backend deploys first
   - Frontend deploys second
   - Monitor deployment logs

3. **Verification**
   - Check `/health` endpoint
   - Verify new features work
   - Test critical paths
   - Monitor error rates

4. **Rollback (If Needed)**
   - Revert commit on main
   - Trigger new deployment
   - Verify rollback successful
   - Document incident

---

## 🔧 Emergency Procedures

### If Something Breaks

1. **Assess Impact**
   - Is the site down?
   - Are users affected?
   - Is data at risk?
   - What's the scope?

2. **Immediate Action**
   - Rollback to last known good version
   - Disable problematic feature (feature flag)
   - Notify stakeholders
   - Document the issue

3. **Investigation**
   - Check logs for errors
   - Review recent changes
   - Identify root cause
   - Develop fix

4. **Resolution**
   - Create hotfix PR
   - Fast-track review
   - Deploy fix
   - Verify resolution

5. **Post-Mortem**
   - Document what happened
   - Identify prevention measures
   - Update runbooks
   - Share learnings

---

## 📚 Reference

### Key Files

- **Backend Entry:** `/backend/index.js`
- **Frontend Entry:** `/frontend/app/layout.tsx`
- **Auth Middleware:** `/backend/middleware/supabaseAuth.js`
- **API Client:** `/frontend/lib/api-client.ts`
- **Supabase Client:** `/backend/lib/supabaseClient.js`

### Key Endpoints

- **Health Check:** `GET /health`
- **Public Deals:** `GET /api/deals/public`
- **Protected Deals:** `GET /api/deals` (requires JWT)
- **Demo Dashboard:** `GET /demo` (feature flagged)

### Environment Variables

**Backend:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `FRONTEND_URL`
- `SENTRY_DSN_BACKEND`
- `FEATURE_DEMO_DASHBOARD`

**Frontend:**
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_FEATURE_DEMO`

---

## 🎯 Success Criteria

### Production State is Maintained When

- ✅ All changes go through PR process
- ✅ All CI checks pass before merge
- ✅ No direct commits to main
- ✅ All deployments are monitored
- ✅ Rollback procedures are tested
- ✅ Documentation is up to date
- ✅ Security best practices followed
- ✅ Performance is maintained or improved

---

## 📞 Support

### Questions or Issues?

1. **Check Documentation**
   - README.md
   - API documentation
   - This file

2. **Review Recent Changes**
   - Git history
   - PR discussions
   - Deployment logs

3. **Contact Team**
   - Create GitHub issue
   - Tag `@mooreronell-ui`
   - Include context and logs

---

**Remember:** This is a production application. Every change matters. Take your time, test thoroughly, and follow the process.

**Last Updated:** November 5, 2025  
**Maintained By:** @mooreronell-ui
