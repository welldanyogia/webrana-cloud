# CI/CD Setup Guide

This document describes the GitHub Actions CI/CD pipeline configuration for WeBrana Cloud.

## Overview

The CI/CD pipeline consists of three workflows:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI Pipeline | `ci.yml` | PR to `master`, push to `master` | Lint, test, build verification |
| Deploy Staging | `deploy-staging.yml` | Manual, push to `develop` | Deploy to staging environment |
| Deploy Production | `deploy-prod.yml` | Release published | Deploy to production with approval |

## Required GitHub Secrets

Configure these secrets in your repository settings (Settings → Secrets and variables → Actions):

### SSH Deployment Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key for deployment | Full private key content |
| `SSH_HOST` | Server IP address | `103.171.84.222` |
| `SSH_USER` | SSH username for deployment | `deploy` or `webrana` |
| `DEPLOY_PATH` | (Optional) Deployment directory | `/opt/webrana-cloud` |

### Optional Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `DOCKER_REGISTRY` | Docker registry URL | `ghcr.io/username` |
| `DOCKER_USERNAME` | Docker registry username | `username` |
| `DOCKER_PASSWORD` | Docker registry password/token | `ghp_xxx...` |

## Setting Up SSH Key

1. Generate a new SSH key pair on your local machine:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/webrana_deploy
   ```

2. Add the public key to the server's `~/.ssh/authorized_keys`:
   ```bash
   cat ~/.ssh/webrana_deploy.pub >> ~/.ssh/authorized_keys
   ```

3. Add the private key content to GitHub Secrets as `SSH_PRIVATE_KEY`:
   ```bash
   cat ~/.ssh/webrana_deploy
   ```

## GitHub Environments

For production deployments, configure GitHub Environments:

1. Go to Settings → Environments
2. Create `staging` environment (optional)
3. Create `production` environment with:
   - Required reviewers (add team members who can approve deployments)
   - Wait timer (optional, e.g., 5 minutes)
   - Deployment branches: Only `master` or tags

## Workflow Details

### CI Pipeline (`ci.yml`)

Runs on every PR to `master` and push to `master`.

**Jobs:**
1. **Lint** - Runs ESLint to check code quality
2. **Test** - Runs unit tests with Jest
3. **Build** - Builds all services (depends on lint & test)
4. **Docker Build** - Verifies Docker images build successfully (matrix strategy)

**Features:**
- Parallel job execution where possible
- npm cache for faster builds
- Artifact upload for failed tests
- Matrix build for all backend services

### Deploy Staging (`deploy-staging.yml`)

Triggers:
- Manual dispatch (workflow_dispatch)
- Push to `develop` branch

**Process:**
1. Optional pre-deployment checks (lint, test)
2. SSH to staging server
3. Pull latest code
4. Run `deploy.sh update`
5. Health check

### Deploy Production (`deploy-prod.yml`)

Triggers:
- Release published on GitHub
- Manual dispatch with version input

**Process:**
1. Validate version format (v1.0.0)
2. Run lint and tests
3. Build verification
4. Pre-deployment database backup
5. **Requires approval** (via GitHub environment)
6. SSH to production server
7. Checkout specific version tag
8. Run `deploy.sh deploy <version>`
9. Health check
10. Automatic rollback on failure

## Server Setup

Ensure the deployment server has:

1. **Git** installed and repository cloned:
   ```bash
   git clone https://github.com/your-org/webrana-cloud.git /opt/webrana-cloud
   ```

2. **Docker** and **Docker Compose V2** installed:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Deploy user** with Docker permissions:
   ```bash
   useradd -m -G docker deploy
   ```

4. **Environment file** configured:
   ```bash
   cp /opt/webrana-cloud/docker/.env.example /opt/webrana-cloud/docker/.env
   # Edit .env with production values
   ```

## Deployment Commands

The `deploy.sh` script supports:

```bash
# Deploy specific version
./deploy.sh deploy v1.0.0

# Deploy latest
./deploy.sh deploy

# Rollback to previous version
./deploy.sh rollback

# Check current version
./deploy.sh version

# Other commands
./deploy.sh start|stop|restart|update|status|logs|health|backup
```

## Troubleshooting

### SSH Connection Failed
- Verify `SSH_PRIVATE_KEY` is correctly formatted (include BEGIN/END lines)
- Check server firewall allows SSH from GitHub Actions IPs
- Verify SSH user exists and has correct permissions

### Build Failed
- Check Node.js version matches (v20)
- Run `npm ci --legacy-peer-deps` locally to verify dependencies
- Check for missing environment variables

### Deployment Failed
- Check server has enough disk space
- Verify Docker daemon is running
- Check container logs: `./deploy.sh logs <service>`

### Rollback Not Working
- Ensure previous deployment was successful
- Check `.deployment-versions` file exists
- Manually checkout a tag: `git checkout v1.0.0`

## Security Best Practices

1. **Never** commit secrets to the repository
2. Use GitHub Environments for production approval gates
3. Rotate SSH keys periodically
4. Use read-only tokens where possible
5. Review deployment logs for sensitive data exposure
