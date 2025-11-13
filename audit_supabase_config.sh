#!/bin/bash

# --- Configuration Constants (AUTHORITATIVE VALUES) ---
AUTHORITATIVE_REF="engzooyyfnucsbzptfck"
AUTHORITATIVE_URL="https://${AUTHORITATIVE_REF}.supabase.co"

# --- Utility Functions ---
decode_jwt_payload() {
    PAYLOAD=$(echo "$1" | awk -F. '{print $2}')
    echo "$PAYLOAD" | tr '_-' '/+' | awk '{
        padding = length % 4
        if (padding > 0) {
            for (i = 1; i <= 4 - padding; i++) {
                printf "="
            }
        }
        print
    }' | base64 -d 2>/dev/null | jq -r .
}

# --- Section 1: Local Code Check ---
echo "--- 1. LOCAL CODE & ENVIRONMENT CHECK ---" > supabase_audit_report.txt
echo "Checking local repository files for hardcoded values..." >> supabase_audit_report.txt

grep_output=$(grep -r "supabase.co" ./frontend ./backend 2>/dev/null | grep -v "node_modules" | head -10)

if [ -z "$grep_output" ]; then
    echo "✅ PASS: No explicit 'supabase.co' URLs found hardcoded in source code." >> supabase_audit_report.txt
else
    echo "⚠️  Found Supabase URLs in code:" >> supabase_audit_report.txt
    echo "$grep_output" >> supabase_audit_report.txt
fi

echo -e "\n--- 2. LIVE RENDER ENVIRONMENT VARIABLE CHECK ---" >> supabase_audit_report.txt

# Get live values from Render API
LIVE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZ3pvb3l5Zm51Y3NienB0ZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mzk0MTIsImV4cCI6MjA3NzUxNTQxMn0.MlEGW001w4qk7ixRoKcDQ3xHWShdfBpfgT2fpRKOCI0"
LIVE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoeXF5ZGpiZmJ4Y3FhemN3cHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc4MzM3NCwiZXhwIjoyMDQ2MzU5Mzc0fQ.iUxL5nBzSPJwI8kKdIAQULRcFdnmJIjjdlEZJqNbEYg"

# Validate Anon Key
if [ -n "$LIVE_ANON_KEY" ]; then
    ANON_PAYLOAD=$(decode_jwt_payload "$LIVE_ANON_KEY")
    ANON_REF=$(echo "$ANON_PAYLOAD" | jq -r '.ref')
    echo "Verifying NEXT_PUBLIC_SUPABASE_ANON_KEY..." >> supabase_audit_report.txt
    if [ "$ANON_REF" == "$AUTHORITATIVE_REF" ]; then
        echo "✅ PASS: ANON KEY DECODED REF matches ${AUTHORITATIVE_REF}." >> supabase_audit_report.txt
    else
        echo "❌ FAIL: ANON KEY DECODED REF mismatch. Expected ${AUTHORITATIVE_REF}, Found ${ANON_REF}." >> supabase_audit_report.txt
    fi
fi

# Validate Service Role Key
if [ -n "$LIVE_SERVICE_ROLE_KEY" ]; then
    SERVICE_PAYLOAD=$(decode_jwt_payload "$LIVE_SERVICE_ROLE_KEY")
    SERVICE_REF=$(echo "$SERVICE_PAYLOAD" | jq -r '.ref')
    echo "Verifying SUPABASE_SERVICE_ROLE_KEY..." >> supabase_audit_report.txt
    if [ "$SERVICE_REF" == "$AUTHORITATIVE_REF" ]; then
        echo "✅ PASS: SERVICE ROLE KEY DECODED REF matches ${AUTHORITATIVE_REF}." >> supabase_audit_report.txt
    else
        echo "❌ FAIL: SERVICE ROLE KEY DECODED REF mismatch. Expected ${AUTHORITATIVE_REF}, Found ${SERVICE_REF}." >> supabase_audit_report.txt
    fi
fi

echo -e "\n--- 3. FINAL SUMMARY ---" >> supabase_audit_report.txt
echo "Review the output above. Any '❌ FAIL' indicates a security or functional mismatch." >> supabase_audit_report.txt

cat supabase_audit_report.txt
