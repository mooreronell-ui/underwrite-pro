# 🚀 Manual Setup Instructions - Underwrite Pro

This guide will help you complete the manual setup required to make your Underwrite Pro application fully functional.

---

## 📋 Prerequisites

Before starting, you'll need:

1. **Supabase Service Role Key**
   - Go to: https://supabase.com/dashboard
   - Select project: `engzooyyfnucsbzptfck`
   - Navigate to: Project Settings → API
   - Copy the `service_role` key (secret, not anon)

2. **Render Dashboard Access**
   - URL: https://dashboard.render.com
   - You should have access to `underwrite-pro-api` service

3. **Node.js** (for running the setup script)
   - Version 18+ recommended

---

## 🛠️ Step 1: Run Organization Setup Script

This script creates the organization and membership for your test user.

### Option A: Run Locally (Recommended)

```bash
# Navigate to project directory
cd /path/to/underwrite-pro

# Install dependencies if needed
cd backend && npm install && cd ..

# Run the setup script with your service role key
node scripts/setup-test-org.js YOUR_SERVICE_ROLE_KEY_HERE
```

### Option B: Run in Sandbox

If you're in the sandbox environment:

```bash
cd /home/ubuntu/underwrite-pro/backend
npm install
cd ..
node scripts/setup-test-org.js YOUR_SERVICE_ROLE_KEY_HERE
```

### Expected Output

```
🚀 Starting organization setup...

Configuration:
  Supabase URL: https://engzooyyfnucsbzptfck.supabase.co
  Test User ID: 4ab4fdd4-a16e-434f-8b7d-40a34788df1e
  Organization Name: Test Complete Organization

📋 Step 1: Checking for existing organization...
📝 Step 2: Creating organization...
✅ Organization created: <org-id>
📋 Step 3: Checking for existing membership...
📝 Step 4: Creating membership...
✅ Membership created
📝 Step 5: Setting active organization...
✅ Active organization set

🎉 SUCCESS! Organization setup complete!

Summary:
  Organization ID: <org-id>
  Organization Name: Test Complete Organization
  User ID: 4ab4fdd4-a16e-434f-8b7d-40a34788df1e
  Role: owner
```

---

## 🔐 Step 2: Set Environment Variable in Render

Now that the organization is created, you need to add the service role key to Render so future users can have organizations auto-created.

### Instructions

1. **Log into Render Dashboard**
   - Go to: https://dashboard.render.com
   - Sign in with your credentials

2. **Navigate to Backend Service**
   - Find and click on: `underwrite-pro-api`

3. **Open Environment Settings**
   - Click on "Environment" in the left sidebar

4. **Add New Environment Variable**
   - Click "Add Environment Variable"
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `<paste your service role key here>`
   - Click "Save Changes"

5. **Trigger Manual Deploy**
   - Render will automatically redeploy after saving
   - Wait for deployment to complete (~3-5 minutes)
   - Check deployment logs for any errors

### Verification

After deployment completes, check the logs for:

```
[SUPABASE] Environment Check: { 'URL Present': true, 'Service Key Present': true }
[SUPABASE] Client initialized successfully
```

---

## ✅ Step 3: Verify Deal Creation

Now test that everything works end-to-end.

### Test Procedure

1. **Open Application**
   - URL: https://underwrite-pro-ui.onrender.com
   - You should already be logged in as: test.complete@underwritepro.com

2. **Navigate to Deals**
   - Click "Deals" in the header
   - Click "Create Your First Deal" or "New Deal"

3. **Fill Out Form**
   - **Deal Name:** Test Deal Alpha
   - **Loan Amount:** 2500000
   - **Asset Type:** Multifamily
   - **Address:** 123 Main Street
   - **City:** Austin
   - **State:** TX
   - **Zip Code:** 78701
   - **Loan Purpose:** Purchase
   - **Loan Type:** Bridge
   - **Requested LTV:** 70
   - **Requested Rate:** 7.5
   - **Requested Term:** 36
   - **Notes:** This is a test deal for verification

4. **Submit Form**
   - Click "Create Deal"
   - You should see a success message
   - The deal should appear in the deals list

### Expected Result

✅ **Success:** Deal is created and appears in the list  
❌ **Failure:** Error message appears (see Troubleshooting below)

---

## 🔍 Troubleshooting

### Issue: Script fails with "Invalid API key"

**Solution:**
- Verify you copied the `service_role` key, not the `anon` key
- Check for extra spaces or line breaks in the key
- Ensure the key is from the correct Supabase project

### Issue: Script fails with "Failed to create organization"

**Solution:**
- Check Supabase project is active and accessible
- Verify database tables exist (organizations, user_org_memberships, user_active_org)
- Check Row Level Security (RLS) policies allow service role access

### Issue: Deal creation still fails after setup

**Possible Causes:**

1. **Render deployment not complete**
   - Wait for deployment to finish
   - Check Render logs for errors

2. **Environment variable not set correctly**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is in Render environment
   - Check for typos in variable name
   - Ensure value is correct

3. **Backend not using new code**
   - Force a manual deploy in Render
   - Clear any caches
   - Check commit hash in deployment logs

4. **Database connection issues**
   - Verify `DATABASE_URL` is correct in Render
   - Check database is accessible
   - Review database logs for errors

### Issue: "An internal error occurred" message

**Debug Steps:**

1. Open browser console (F12)
2. Look for network requests to `/api/deals`
3. Check the response body for detailed error
4. Common errors:
   - HTTP 400: Validation error (check all required fields)
   - HTTP 500: Server error (check Render logs)
   - HTTP 401: Authentication error (re-login)

---

## 📊 Verification Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] Supabase service role key obtained
- [ ] Organization setup script executed successfully
- [ ] Organization exists in database
- [ ] User membership created
- [ ] Active org set for user
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Render
- [ ] Backend redeployed successfully
- [ ] Deployment logs show Supabase client initialized
- [ ] Application loads without errors
- [ ] User can navigate to deals page
- [ ] Deal creation form loads
- [ ] Deal can be created successfully
- [ ] Deal appears in deals list

---

## 🎯 Success Criteria

Your setup is complete when:

1. ✅ Script output shows "SUCCESS! Organization setup complete!"
2. ✅ Render environment shows `SUPABASE_SERVICE_ROLE_KEY` is set
3. ✅ Backend deployment completed without errors
4. ✅ Deal can be created through the UI
5. ✅ Deal appears in the deals list

---

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check the `TESTING_REPORT.md` for detailed bug information
2. Review Render deployment logs for errors
3. Check Supabase logs for database errors
4. Verify all environment variables are set correctly

---

## 🚀 Next Steps After Setup

Once setup is complete, you can:

1. **Test Full Deal Lifecycle**
   - Create deals
   - Edit deals
   - Delete deals
   - View deal details

2. **Test Underwriting Features**
   - Run underwriting analysis
   - Generate reports
   - Review recommendations

3. **Test Term Sheet Generation**
   - Create term sheets
   - Export as PDF
   - Send to clients

4. **Test Multi-User Features**
   - Create additional users
   - Test organization switching
   - Verify permissions

---

**Last Updated:** November 13, 2025  
**Version:** 1.0  
**Status:** Ready for execution
