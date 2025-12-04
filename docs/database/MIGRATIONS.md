# Database Migrations

This project uses [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) for database schema management.
This ensures that all database changes are versioned, reproducible, and reversible.

## Migration Status

- **order-service**: Migrations initialized.
- **auth-service**: Pending initialization.
- **billing-service**: Pending initialization.
- **catalog-service**: Pending initialization.
- **notification-service**: Pending initialization.

## Scripts

We have added the following NPM scripts to `package.json` to manage migrations across all services:

- `npm run db:migrate:dev`: Applies migrations in development (runs for all services).
- `npm run db:migrate:deploy`: Applies pending migrations in production/staging (runs for all services).

You can also run for specific services:
- `npm run db:migrate:dev:auth`
- `npm run db:migrate:deploy:auth`
- `npm run db:migrate:dev:order`
- ... and so on for `billing`, `catalog`, `notification`.

## Workflow

### 1. Development: Creating a New Migration

When you modify a `schema.prisma` file, you must create a migration:

```bash
# Modify apps/[service]/prisma/schema.prisma

# Generate and apply migration locally
npm run db:migrate:dev:[service]
# Example:
# npm run db:migrate:dev:auth
```

This command will:
1. Update your local database schema.
2. Generate a new migration folder in `apps/[service]/prisma/migrations`.
3. Generate the Prisma Client.

**Commit the generated migration folder to Git.**

### 2. Production/Staging: Applying Migrations

In production environments, we do **not** run `migrate dev`. Instead, we use `migrate deploy`.
This command applies all pending migrations from the `migrations` directory to the database.

```bash
# Run as part of the deployment pipeline
npm run db:migrate:deploy
```

This is integrated into our CI/CD pipeline.

## Rollback

Prisma does not have a built-in "down" migration command. To rollback:
1. Revert the changes in `schema.prisma`.
2. Create a new migration that undoes the changes.
   ```bash
   npm run db:migrate:dev:[service]
   ```
3. Deploy the new migration.

## CI/CD Integration

Ensure your deployment pipeline (e.g., GitHub Actions, GitLab CI) includes the migration step **before** starting the application.

Example `deployment.yaml` snippet:

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4

  - name: Install dependencies
    run: npm ci

  - name: Run Database Migrations
    run: npm run db:migrate:deploy
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      # Add other service DB URLs if they differ
      # DATABASE_URL_AUTH: ...
      # DATABASE_URL_ORDER: ...

  - name: Deploy Application
    run: ...
```

## Best Practices

1. **Never edit migration SQL manually** unless necessary and you know what you are doing.
2. **One migration per feature**: Try to keep migrations atomic.
3. **Review migration SQL**: Always check the generated SQL file before committing.
4. **Data Loss Warnings**: Pay attention to Prisma warnings about potential data loss (e.g., dropping columns).

## Troubleshooting

If you encounter "drift" (database schema differs from migration history):
1. **Dev**: You might need to reset the database: `npx prisma migrate reset`.
2. **Prod**: `migrate resolve` might be needed to mark failed migrations as resolved, but proceed with extreme caution.
