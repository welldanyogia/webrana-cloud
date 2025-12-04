# Operations Runbook

## Table of Contents
1. [Staging Environment](#staging-environment)
2. [Incident Response](#incident-response)

---

## Staging Environment

### Deployment Procedure

**Objective**: Deploy the latest version of the application to the staging environment.

**Prerequisites**:
- SSH access to the staging server.
- `.env` file configured (see `docs/deployment/STAGING.md`).

**Steps**:

1.  **Pull Latest Changes**:
    ```bash
    cd /root/webrana-cloud
    git pull origin master
    ```

2.  **Update Configuration (if needed)**:
    Check `.env.staging.example` for any new variables and update `.env` accordingly.

3.  **Restart Services**:
    ```bash
    docker-compose -f docker-compose.staging.yml up -d --build
    ```

4.  **Verify Deployment**:
    - Check container status:
      ```bash
      docker-compose -f docker-compose.staging.yml ps
      ```
    - Check logs for errors:
      ```bash
      docker-compose -f docker-compose.staging.yml logs --tail=100 -f
      ```
    - Access the application endpoints to ensure connectivity.

### Resetting Staging Database

**Warning**: This will delete ALL data in the staging database.

1.  **Stop Services**:
    ```bash
    docker-compose -f docker-compose.staging.yml down
    ```

2.  **Remove Volume**:
    ```bash
    docker volume rm webrana-cloud_postgres_staging_data
    ```

3.  **Start Services**:
    ```bash
    docker-compose -f docker-compose.staging.yml up -d
    ```

---

## Incident Response

*(To be populated)*
