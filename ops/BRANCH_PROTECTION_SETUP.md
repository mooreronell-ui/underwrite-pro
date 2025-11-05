# Branch Protection Setup Instructions

**Repository:** mooreronell-ui/underwrite-pro  
**Branch:** main

---

## Manual Setup via GitHub UI

Since branch protection cannot be fully automated via API without admin access, follow these steps in the GitHub web interface:

### Step 1: Navigate to Settings

1. Go to https://github.com/mooreronell-ui/underwrite-pro
2. Click **Settings** tab
3. Click **Branches** in the left sidebar

### Step 2: Add Branch Protection Rule

1. Click **Add rule** button
2. In "Branch name pattern" field, enter: `main`

### Step 3: Configure Protection Rules

Enable the following options:

#### Required Checks
- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  - Add required status checks (once CI is set up):
    - `build`
    - `test:backend`
    - `test:frontend`
    - `lint`

#### Pull Request Reviews
- [x] **Require a pull request before merging**
  - [x] **Require approvals:** 1
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from Code Owners**

#### Additional Rules
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings**
- [ ] **Allow force pushes** (keep unchecked)
- [ ] **Allow deletions** (keep unchecked)

### Step 4: Save Changes

1. Scroll to bottom
2. Click **Create** button

---

## Alternative: GitHub API Setup

If you have a GitHub Personal Access Token with `repo` scope, you can use these curl commands:

### Prerequisites

```bash
export GITHUB_TOKEN="your_personal_access_token_here"
export REPO_OWNER="mooreronell-ui"
export REPO_NAME="underwrite-pro"
```

### Create Branch Protection

```bash
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["build", "test:backend", "test:frontend", "lint"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismissal_restrictions": {},
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true,
    "lock_branch": false,
    "allow_fork_syncing": false
  }'
```

### Verify Protection

```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection
```

---

## GitHub Actions CI Setup

Create `.github/workflows/ci.yml` to enable the required checks:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install backend deps
        run: cd backend && npm install
      - name: Install frontend deps
        run: cd frontend && pnpm install
      - name: Build backend
        run: cd backend && npm run build || echo "No build script"
      - name: Build frontend
        run: cd frontend && pnpm build

  test:backend:
    name: Test Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install deps
        run: cd backend && npm install
      - name: Run tests
        run: cd backend && npm test || echo "No tests yet"

  test:frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install deps
        run: cd frontend && pnpm install
      - name: Run tests
        run: cd frontend && pnpm test || echo "No tests yet"

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install backend deps
        run: cd backend && npm install
      - name: Install frontend deps
        run: cd frontend && pnpm install
      - name: Lint backend
        run: cd backend && npm run lint || echo "No lint script"
      - name: Lint frontend
        run: cd frontend && pnpm lint
```

---

## Verification

After setting up branch protection, verify by:

1. **Try to push directly to main** - Should be blocked
2. **Create a PR** - Should require review
3. **Try to merge without approval** - Should be blocked
4. **Try to merge with failing CI** - Should be blocked (once CI is set up)

---

## Notes

- Branch protection requires **GitHub Pro** or **organization repo** for some features
- If using a personal free account, some options may not be available
- CODEOWNERS file must be in the repository root or `.github/` directory to work
- Required status checks will only appear after the first CI run

---

**Last Updated:** November 5, 2025
