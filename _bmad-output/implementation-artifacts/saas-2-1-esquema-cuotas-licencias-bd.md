# Story 2.1: Esquema de Cuotas y Licencias en BD

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Desarrollador Backend,
I want agregar los campos de licenciamiento al Tenant,
so that el sistema sepa qué límites aplicar a cada cliente.

## Acceptance Criteria

1. Given el esquema de base de datos actual con al menos 1 Tenant existente, When ejecuto la migración automatizada, Then la tabla `Tenant` incluye campos requeridos para `maxUsers`, `maxAiTokens`, `licenseType` (enum: SUBSCRIPTION, LIFETIME), y un campo opcional `subscriptionEndDate`.
2. Given 1 Tenant existente con usuarios y configuraciones IA activas, When la migración se ejecuta, Then el Tenant existente es conservado de forma segura ("grandfathered") como tipo `LIFETIME` por defecto, con cuotas dinámicas adaptadas a su uso actual, evitando la interrupción del servicio y sin pérdida de datos.

## Tasks / Subtasks

- [ ] Task 1 (AC: 1, 2)
  - [ ] Add an enum `LicenseType` with values `SUBSCRIPTION` and `LIFETIME`, and add `@@map("license_type")` to the enum definition in `backend/prisma/schema.prisma`.
  - [ ] Add the following explicitly mapped fields and index to the `Tenant` model in `backend/prisma/schema.prisma`:
    ```prisma
    maxUsers            Int         @default(1) @map("max_users")
    maxAiTokens         Int         @default(0) @map("max_ai_tokens") /// 0 = disabled, -1 = unlimited
    licenseType         LicenseType @default(LIFETIME) @map("license_type")
    subscriptionEndDate DateTime?   @db.Timestamptz(3) @map("subscription_end_date") /// NULL is valid for LIFETIME or unbounded SUBSCRIPTION

    @@index([licenseType, subscriptionEndDate], map: "idx_tenant_license_end_date")
    ```
  - [ ] Run `npx prisma format`.
  - [ ] Run `npx prisma migrate dev --name add_tenant_licenses --create-only` to generate the migration file without applying it.
  - [ ] Append the provided custom SQL script to the end of the `migration.sql` file.
  - [ ] Run `npx prisma migrate dev` to apply the modified migration.
  - [ ] Run `npx prisma generate` to ensure TypeScript types are updated.
  - [ ] Verify using Prisma Studio or SQL that existing tenants now have `max_users` equal to their actual active user count and appropriate `max_ai_tokens`.

## Dev Notes

- Relevant architecture patterns and constraints:
  - Database: PostgreSQL 16 managed by Prisma ORM.
  - Multitenancy is applied; these fields live exclusively in the `Tenant` entity.
  - The `Tenant` table STRICTLY uses the `@map` directive for snake_case column mapping (e.g., `@map("max_users")`).
- Custom Data Migration Logic (Grandfathering & Constraints):
  - Append this SQL to the migration script to enforce defaults, grandfather tenants dynamically, and add check constraints:
    ```sql
    -- Set defaults
    ALTER TABLE tenants ALTER COLUMN max_users SET DEFAULT 1;
    ALTER TABLE tenants ALTER COLUMN max_ai_tokens SET DEFAULT 0;
    ALTER TABLE tenants ALTER COLUMN license_type SET DEFAULT 'LIFETIME'::"license_type";

    -- Grandfather existing tenants based on active usage
    WITH tenant_stats AS (
        SELECT 
            t.id,
            COUNT(u.id) as user_count,
            MAX(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) as has_ai
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
        LEFT JOIN ai_configs a ON a.tenant_id = t.id AND a.is_active = true
        GROUP BY t.id
    )
    UPDATE tenants
    SET 
        max_users = GREATEST(1, ts.user_count::integer),
        max_ai_tokens = CASE WHEN ts.has_ai = 1 THEN -1 ELSE 0 END
    FROM tenant_stats ts
    WHERE tenants.id = ts.id;

    -- Check constraints
    ALTER TABLE tenants ADD CONSTRAINT tenants_max_users_check CHECK (max_users >= 1);
    ALTER TABLE tenants ADD CONSTRAINT tenants_max_ai_tokens_check CHECK (max_ai_tokens >= -1);
    ALTER TABLE tenants ADD CONSTRAINT tenants_lifetime_no_end_date_check CHECK (license_type = 'SUBSCRIPTION'::"license_type" OR subscription_end_date IS NULL);
    ```
  - **Important:** Verify table and column names for `ai_configs` in the database schema before applying this SQL.
- Rollback Strategy:
  - If the migration fails or locking issues occur, restore service immediately by reverting the schema manually or rolling back. Use `npx prisma migrate resolve --rolled-back add_tenant_licenses` to mark the migration as rolled back, then drop the added constraints, columns and enum: `ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_max_users_check, DROP CONSTRAINT IF EXISTS tenants_max_ai_tokens_check, DROP CONSTRAINT IF EXISTS tenants_lifetime_no_end_date_check, DROP COLUMN max_users, DROP COLUMN max_ai_tokens, DROP COLUMN license_type, DROP COLUMN subscription_end_date CASCADE; DROP TYPE license_type;`
- Source tree components to touch:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/*_add_tenant_licenses/migration.sql`
- Testing standards summary:
  - Verify migration succeeds locally without data loss on existing records.
  - Verify the custom SQL successfully set the correct dynamic defaults for grandfathered tenants.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): All DB schema changes must go in `backend/prisma/schema.prisma` and strictly respect snake_case `@map` naming.
- Detected conflicts or variances (with rationale): None.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Story 2.1: Esquema de Cuotas y Licencias en BD]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database]

## Dev Agent Record

### Agent Model Used

Antigravity Product Planning Agent

### Debug Log References

N/A

### Completion Notes List

- Added the required db schema fields. Enforcement rules will be implemented in subsequent stories.

### File List

- `backend/prisma/schema.prisma`

### Review Findings
- [x] [Review][Patch] Unspecified `Superadmin` model added without migration (Scope Creep & Crash) [backend/prisma/schema.prisma]
- [x] [Review][Patch] Ghost Table Reference in migration (`ai_configs`) [backend/prisma/migrations/20260801034625_add_tenant_licenses/migration.sql:22]
- [x] [Review][Patch] Grandfathered max_users inflated by Cartesian product [backend/prisma/migrations/20260801034625_add_tenant_licenses/migration.sql:22]
- [x] [Review][Defer] Inefficient Compound Index for low-cardinality enum [backend/prisma/migrations/20260801034625_add_tenant_licenses/migration.sql:7] - deferred, pre-existing

