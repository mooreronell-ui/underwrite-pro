# Underwrite Pro - Full Stack SaaS Platform

This repository contains the complete source code for the Underwrite Pro SaaS platform, a commercial loan underwriting application built with a modern tech stack. This document provides all the necessary instructions for setting up, running, testing, and deploying the application.

---

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Tech Stack](#tech-stack)
3.  [Local Development Setup](#local-development-setup)
4.  [Running Automated Tests](#running-automated-tests)
5.  [Deployment Instructions](#deployment-instructions)
    -   [Backend (Docker)](#backend-docker)
    -   [Frontend (Vercel)](#frontend-vercel)
6.  [Environment Variables](#environment-variables)
7.  [CI/CD Pipeline](#cicd-pipeline)

---

## 1. Project Overview

Underwrite Pro is a multi-tenant SaaS platform designed for commercial real estate finance. It enables brokers, underwriters, and investors to manage loan applications, perform financial analysis (DSCR, NOI, LTV), and generate term sheets. The platform is built with a decoupled architecture, featuring a Node.js backend and a Next.js frontend.

**Core Features**:
- Multi-tenant architecture with role-based access control (RBAC).
- Core underwriting engine for CRE financial calculations.
- API-first design with a comprehensive set of endpoints.
- Integrations with Stripe, DocuSign, GoHighLevel, and Make.com.
- Compliance features including audit logging and KYC/KYB scaffolding.

---

## 2. Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
- **Database**: PostgreSQL
- **Deployment**: Docker (Backend), Vercel (Frontend)
- **Testing**: Jest & Supertest (API), Playwright (E2E)
- **CI/CD**: GitHub Actions

---

## 3. Local Development Setup

To run the full stack locally, you will need **Docker** and **Docker Compose** installed.

### Steps:

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd <your-repo-directory>
    ```

2.  **Create Environment Files**:
    -   Copy the `backend/.env.example` file to `backend/.env`.
    -   Copy the `frontend/.env.example` file to `frontend/.env.local`.

3.  **Update Environment Variables**:
    -   In `backend/.env`, fill in the required secrets, especially `JWT_SECRET` and a `POSTGRES_PASSWORD`.
    -   In `docker-compose.yml`, ensure the `POSTGRES_PASSWORD` matches the one in your `.env` file.

4.  **Run Docker Compose**:
    From the root directory, run the following command:
    ```bash
    docker-compose up --build
    ```
    This command will:
    -   Build the Docker image for the backend.
    -   Start the backend API service.
    -   Start the PostgreSQL database service.
    -   Apply database migrations located in the `migrations` directory.

5.  **Run the Frontend**:
    In a separate terminal, navigate to the `frontend` directory and run:
    ```bash
    npm install
    npm run dev
    ```

### Accessing the Application:

-   **Backend API**: `http://localhost:3000`
-   **Frontend UI**: `http://localhost:3001`
-   **PostgreSQL Database**: Connect on port `5432`.

---

## 4. Running Automated Tests

### Backend API Tests (Jest & Supertest)

Navigate to the `backend` directory and run:
```bash
npm install --dev
npm test
```
This will execute the API tests defined in `backend/tests/api.test.js` against a test database.

### Frontend E2E Tests (Playwright)

Navigate to the `frontend` directory and run:
```bash
npm install --dev
npx playwright install
npx playwright test
```
This will launch a browser and run the end-to-end smoke tests defined in `frontend/tests/e2e.spec.ts`.

---

## 5. Deployment Instructions

### Backend (Docker)

The backend is designed to be deployed as a Docker container.

1.  **Build and Push the Image**: The CI/CD pipeline will automatically build and push the Docker image to a container registry (e.g., Docker Hub) when changes are merged to `main`.

2.  **Deploy to a Server**: On your production server (e.g., an AWS EC2 instance, DigitalOcean Droplet), you can use `docker-compose` to pull the latest image and run the services. You will need a managed PostgreSQL database and will need to set the environment variables accordingly.

    ```bash
    # On the server
    docker-compose pull
    docker-compose up -d
    ```

### Frontend (Vercel)

The frontend is optimized for deployment on Vercel.

1.  **Connect Your Git Repository**: In your Vercel dashboard, import the Git repository.

2.  **Configure the Project**:
    -   **Framework Preset**: Vercel should automatically detect Next.js.
    -   **Root Directory**: Set to `frontend`.
    -   **Build Command**: `npm run build`.
    -   **Output Directory**: `.next`.

3.  **Add Environment Variables**:
    In the Vercel project settings, add the following environment variables:
    -   `NEXT_PUBLIC_API_URL`: The public URL of your deployed backend API.
    -   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your public Stripe key.

4.  **Deploy**: Vercel will automatically deploy the frontend whenever you push changes to the `main` branch.

---

## 6. Environment Variables

Refer to the `.env.example` files in both the `backend` and `frontend` directories for a complete list of required environment variables. Key variables are listed below.

### Backend (`.env`)
```
# Database
DATABASE_URL=postgresql://user:password@host:port/db

# Auth
JWT_SECRET=<your-jwt-secret>

# Integrations
STRIPE_SECRET_KEY=<your-stripe-secret-key>
DOCUSIGN_INTEGRATOR_KEY=<your-docusign-key>
GHL_API_KEY=<your-ghl-key>
MAKE_WEBHOOK_URL=<your-make-webhook-url>

# Compliance
ALLOY_API_KEY=<your-alloy-key>
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-public-stripe-key>
```

---

## 7. CI/CD Pipeline

A GitHub Actions workflow is defined in `.github/workflows/ci-cd.yml`. This pipeline automates the following process:

-   **On Pull Request to `main`**: Runs linting and testing for both frontend and backend.
-   **On Push to `main` or `staging`**: 
    1.  Runs all tests and linting.
    2.  Builds and pushes a Docker image for the backend to the container registry.
    3.  Triggers a deployment to the corresponding environment (production for `main`, staging for `staging`).

To use the pipeline, you will need to configure the following secrets in your GitHub repository settings:
-   `DOCKER_USERNAME`, `DOCKER_PASSWORD`: For pushing to Docker Hub.
-   `PRODUCTION_DEPLOY_KEY`, `PRODUCTION_HOST`: For deploying to the production server.
-   `STAGING_DEPLOY_KEY`, `STAGING_HOST`: For deploying to the staging server.
-   `SLACK_WEBHOOK_URL`: For failure notifications.
