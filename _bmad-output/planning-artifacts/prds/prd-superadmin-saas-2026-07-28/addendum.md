# Addendum: Superadmin SaaS Management

## Technical & Architecture Constraints

### 1. Database Schema Migrations
To support the Superadmin role, the following schema updates are required:
- **RoleType Enum:** Add `SUPERADMIN` to `RoleType`.
- **Tenant Isolation Bypass:** Currently, `User.tenantId` is a required field. For Superadmins who oversee the entire system, this field must become optional (`String?`). [ASSUMPTION] Changing this to optional might require updating existing Prisma queries that strictly expect `tenantId` to be non-null for regular users. We might need a dummy tenant or just handle null checks carefully in the admin routes.

### 2. API Routing Strategy
- Instead of mixing Superadmin logic into existing controllers (e.g., `tenant.controller.js`), a dedicated routing namespace `/api/superadmin/` should be created.
- This ensures clean separation of concerns and simplifies RBAC middleware application.

### 3. Quota Enforcement Mechanism
- **AI Tokens:** [ASSUMPTION] We will need a cron job or a rolling-window metric in the `metrics` table to track monthly consumption and reset it at the start of each billing cycle.
- **Seat Limit:** Enforced dynamically on the `POST /api/users` endpoint by counting existing active users under the tenant and rejecting the request if the quota is reached.
