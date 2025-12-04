# Deployment Runbook - WeBrana Cloud

## Overview
This runbook details the deployment procedures for WeBrana Cloud services (specifically **Order Service** and related components) to Staging and Production environments. Deployments are primarily automated via GitHub Actions, with SSH-based execution on the target servers.

## Pre-deployment Checklist

Before initiating any deployment, ensure the following criteria are met:

- [ ] **Code Review**: All code changes have been reviewed and merged.
- [ ] **QA Sign-off**: All features and bug fixes have passed QA in the lower environment.
- [ ] **PM Approval**: Release content is approved by the Product Manager (Required for Production).
- [ ] **Release Tag**: A valid semantic version tag (e.g., `v1.0.0`) exists or is ready to be created (Required for Production).
- [ ] **Rollback Plan**: A clear understanding of how to revert changes if the deployment fails.
- [ ] **On-call Notification**: The on-call team is aware of the deployment window.

## Deployment Steps

### 1. Staging Deployment

Staging deployments are triggered automatically or manually via GitHub Actions.

**Method A: Automatic (Push to Develop)**
1.  Merge PRs into the `develop` branch.
2.  The **Deploy Staging** workflow will automatically trigger.
3.  Monitor the GitHub Action for completion.

**Method B: Manual Trigger**
1.  Go to the **Actions** tab in GitHub.
2.  Select **Deploy Staging** workflow.
3.  Click **Run workflow**.
4.  Optionally check "Skip tests before deployment" if needed (not recommended).
5.  Select branch `develop` and run.

**Under the hood (Staging):**
- Connects to Staging server via SSH.
- Pulls latest code from `develop`.
- Runs `docker/scripts/deploy.sh update`.

### 2. Production Deployment

Production deployments require a tagged release and manual environment approval.

**Method A: Release Trigger (Recommended)**
1.  Draft a new release in GitHub.
2.  Tag version (e.g., `v1.2.0`).
3.  Publish the release.
4.  The **Deploy Production** workflow will trigger automatically.
5.  **Approval**: A notification will be sent to the deployment approvers group. Approve the deployment in the GitHub Environment section.

**Method B: Manual Trigger**
1.  Go to the **Actions** tab in GitHub.
2.  Select **Deploy Production** workflow.
3.  Click **Run workflow**.
4.  Enter the **Version tag** to deploy (e.g., `v1.2.0`).
5.  Click Run.
6.  **Approval**: Approve the deployment in the GitHub Environment section when prompted.

**Under the hood (Production):**
- **Backup**: Automatically runs `docker/scripts/backup-db.sh pre-deploy-{version}`.
- **Deploy**:
    - Fetches specific git tag.
    - Runs `docker/scripts/deploy.sh deploy {version}`.
- **Verify**: Runs `docker/scripts/health-check.sh`.

## Post-deployment Verification

After the pipeline completes, perform these checks:

### 1. Pipeline Verification
- [ ] Check GitHub Action logs for "✅ Production deployment completed successfully!".
- [ ] Ensure the "Health Check" step passed.

### 2. Health Check Endpoint
- **Staging**: `curl -f https://staging.webrana.cloud/health` (or configured URL).
- **Production**: `curl -f https://webrana.cloud/health` (or configured URL).
- Expected response: `200 OK` with status info.

### 3. Smoke Tests
- [ ] Log in to the Admin Dashboard.
- [ ] Verify recent orders list loads.
- [ ] Attempt to create a test order (if in Staging).
- [ ] Check external integrations (e.g., DigitalOcean API status).

### 4. Metrics Monitoring
- [ ] Check CPU/Memory usage in Grafana or `docker stats`.
- [ ] Check error rates in logs/sentry.

## Rollback Procedures

### When to Rollback
- **Deployment Failure**: Pipeline fails during the deploy step.
- **Health Check Failure**: Post-deployment health check returns 500s or times out.
- **Critical Bug**: Sev-1 issue discovered immediately after launch.

### Rollback Steps

#### Option A: Automated Rollback (GitHub Actions)
If the **Deploy Production** job fails, the pipeline is configured to attempt an automatic rollback locally on the server, but you can also trigger the "Rollback (Manual)" job if available in the workflow run.

#### Option B: Manual SSH Rollback
If the pipeline is stuck or unavailable:
1.  SSH into the server:
    ```bash
    ssh user@production-server
    ```
2.  Navigate to the project directory:
    ```bash
    cd /opt/webrana-cloud/docker
    ```
3.  Execute rollback script:
    ```bash
    bash scripts/deploy.sh rollback
    ```
    *This script is expected to revert to the previous docker image or tag.*

4.  **Verify Rollback**:
    ```bash
    docker ps
    bash scripts/health-check.sh
    ```

#### Option C: Database Restore (If DB corruption occurred)
1.  Locate the pre-deployment backup:
    ```bash
    ls -l /opt/webrana-cloud/backups/
    ```
2.  Restore the database (Caution: Data loss since backup):
    ```bash
    cat /opt/webrana-cloud/backups/pre-deploy-v1.X.X.sql | docker exec -i order-service-db psql -U postgres -d order_service
    ```

## Troubleshooting

### Issue: Database Connection Failed
**Symptoms**: Service logs show `P1001: Can't reach database server`.
**Solution**:
1.  Check database container status:
    ```bash
    docker ps | grep order-service-db
    ```
2.  Check logs:
    ```bash
    docker logs order-service-db
    ```
3.  Verify `DATABASE_URL` environment variable in `apps/order-service/.env.docker` or injected env vars.

### Issue: Service Not Starting (CrashLoopBackOff)
**Symptoms**: Container constantly restarts.
**Solution**:
1.  Check application logs for startup errors:
    ```bash
    docker logs order-service --tail 100
    ```
2.  Common causes:
    - Missing environment variables.
    - Database migration failures (`npx prisma migrate deploy` failed).
    - Invalid configuration.

### Issue: Deployment Script Permission Denied
**Symptoms**: `bash: scripts/deploy.sh: Permission denied`.
**Solution**:
1.  Fix permissions:
    ```bash
    chmod +x scripts/*.sh
    ```

### Issue: "Health check failed" in Pipeline
**Symptoms**: Pipeline fails at verification step.
**Solution**:
1.  The application started but isn't responding on the health endpoint.
2.  Check if the application port (3333) is exposed correctly.
3.  Check if the server firewall is blocking requests.
4.  Check application logs for runtime errors.

## Emergency Contacts

| Role | Contact | Phone/Pager |
|------|---------|-------------|
| **DevOps On-call** | @devops-oncall | +1-555-0100 |
| **Backend Lead** | @backend-lead | +1-555-0101 |
| **Product Manager** | @pm-webrana | +1-555-0102 |
| **Infra Provider** | DigitalOcean Support | https://cloud.digitalocean.com/support |
