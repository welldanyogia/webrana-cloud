# Webrana Cloud

A cloud services platform built with Nx monorepo architecture.

## Project Structure

```
webrana-cloud/
├── apps/                          # Application projects
│   ├── api-gateway/               # API Gateway service (Express)
│   ├── auth-service/              # Authentication service (Express)
│   ├── catalog-service/           # Service catalog management (Express)
│   ├── billing-service/           # Billing and payments (Express)
│   ├── instance-service/          # Cloud instance management (Express)
│   ├── provider-service/          # Provider integration (Express)
│   ├── notification-service/      # Notification service (Express)
│   ├── customer-web/              # Customer portal (React + Vite)
│   └── admin-web/                 # Admin portal (React + Vite)
│
├── libs/                          # Shared libraries
│   ├── common/                    # Common utilities and types
│   ├── events/                    # Event definitions and handlers
│   ├── database/                  # Database utilities and models
│   ├── ui/                        # Shared UI components (React)
│   └── frontend-api/              # Frontend API client utilities
│
└── package.json
```

## Apps

| App | Type | Description | Port |
|-----|------|-------------|------|
| `api-gateway` | Express | API Gateway for routing requests | 3000 |
| `auth-service` | Express | Handles authentication and authorization | 3001 |
| `catalog-service` | Express | Manages service catalog | 3002 |
| `billing-service` | Express | Handles billing and payments | 3003 |
| `instance-service` | Express | Manages cloud instances | 3004 |
| `provider-service` | Express | Provider integration layer | 3005 |
| `notification-service` | Express | Notification delivery | 3006 |
| `customer-web` | React | Customer-facing web portal | 4200 |
| `admin-web` | React | Admin web portal | 4201 |

## Libs

| Library | Description |
|---------|-------------|
| `common` | Shared utilities, constants, and TypeScript types |
| `events` | Event definitions for inter-service communication |
| `database` | Database connection utilities and models |
| `ui` | Shared React UI components |
| `frontend-api` | API client utilities for frontend apps |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Development

Run a backend service:
```bash
npx nx serve auth-service
npx nx serve api-gateway
```

Run a frontend application:
```bash
npx nx serve customer-web
npx nx serve admin-web
```

### Build

Build a specific project:
```bash
npx nx build auth-service
npx nx build customer-web
```

Build all projects:
```bash
npx nx run-many -t build
```

### Testing

Run tests for a specific project:
```bash
npx nx test auth-service
```

Run all tests:
```bash
npx nx run-many -t test
```

## Nx Commands

```bash
# Show project graph
npx nx graph

# List all projects
npx nx show projects

# Show project details
npx nx show project auth-service

# Run affected projects only
npx nx affected -t build
npx nx affected -t test
```

## Architecture

The platform follows a microservices architecture:

- **Backend Services**: Express.js microservices handling specific domains
- **Frontend Applications**: React SPAs for customer and admin interfaces
- **Shared Libraries**: Common code shared across applications

Import shared libraries in your code:
```typescript
import { common } from '@webrana-cloud/common';
import { events } from '@webrana-cloud/events';
import { database } from '@webrana-cloud/database';
import { Ui } from '@webrana-cloud/ui';
import { frontendApi } from '@webrana-cloud/frontend-api';
```
