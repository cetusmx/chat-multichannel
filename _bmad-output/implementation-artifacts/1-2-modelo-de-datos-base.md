# Story 1.2: Modelo de datos base

Status: done ✅

## Story

As a developer,
I want define the initial Prisma schema with Tenant, Branch, Group, User, and Role models,
So that the platform has the organizational structure to support multi-sucursal and multi-grupo operations.

## Acceptance Criteria

1. **Migration creates all tables**
   Given the Prisma schema is defined
   When I run `npx prisma migrate dev`
   Then the migration creates tables: `tenants`, `branches`, `groups`, `users`, `group_vendors` with proper foreign keys and indexes

2. **Tenant structure**
   Given the Tenant model includes name, domain, and status fields
   When a new tenant is created
   Then it is assigned a unique domain slug and active status by default

3. **Branch structure**
   Given the Branch model includes name, address, phone, and belongs to a Tenant
   When a branch is created
   Then it is linked to a tenant and can have multiple groups assigned

4. **Group structure**
   Given the Group model includes name, description, and belongs to a Branch
   When a group is created
   Then it is linked to a branch and can have multiple vendors assigned

5. **User structure**
   Given the User model includes name, email, phone, password hash, role (enum), and tenant reference
   When a user is created
   Then the password is stored as a bcrypt hash, and the user is linked to a tenant

6. **GroupVendor join table**
   Given the GroupVendor join table links Vendors to Groups (many-to-many)
   When a vendor is assigned to groups
   Then the assignments are stored in `group_vendors` table

7. **Indexes for performance**
   Given the schema includes indexes on foreign keys
   When queries filter by tenant, branch, or group
   Then the database uses the indexes for efficient lookups

## Tasks / Subtasks

- [x] Add `@@index` annotations on all foreign key columns for query performance
- [x] Create new Prisma migration with indexes
- [x] Re-run seed and verify data integrity
- [x] Verify raw SQL in generated migration

## Dev Notes

### Architecture Patterns

- **RoleType enum** instead of separate Role model (per architecture decision)
- All IDs use `cuid()` for distributed uniqueness
- Snake_case table and column names with `@@map` and `@map`
- Relations use `onDelete: Cascade` for referential integrity
- Soft-delete not implemented in MVP (hard delete with cascade)

### Schema Details

```
tenants
  id          String  @id @default(cuid())
  name        String
  domain      String  @unique
  status      String  @default("active")
  created_at  DateTime
  updated_at  DateTime
  → users[]
  → branches[]

branches
  id          String  @id @default(cuid())
  name        String
  address     String?
  phone       String?
  tenant_id   String  → tenants.id
  created_at  DateTime
  updated_at  DateTime

groups
  id          String  @id @default(cuid())
  name        String
  description String?
  branch_id   String  → branches.id
  created_at  DateTime
  updated_at  DateTime

users
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  phone         String?
  password_hash String
  role          RoleType  (enum: ADMIN, COORDINATOR, VENDOR)
  tenant_id     String    → tenants.id
  is_active     Boolean   @default(true)
  last_login_at DateTime?
  created_at    DateTime
  updated_at    DateTime

group_vendors
  group_id  String  → groups.id
  user_id   String  → users.id
  PK: (group_id, user_id)
```

### Indexes to Add

- `branches`: `@@index([tenantId])`
- `groups`: `@@index([branchId])`
- `users`: `@@index([tenantId])`, `@@index([role])`
- `group_vendors`: `@@index([groupId])`, `@@index([userId])`

### Testing

- Run `npx prisma migrate dev` and verify SQL output
- Run `npx prisma db push` to verify schema syncs
- Verify with `\dt` and `\d tablename` in psql

## References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` → Data Architecture section, Naming Patterns
- Epics: `_bmad-output/planning-artifacts/epics.md` → Story 1.2 section
- Migration already created: `backend/prisma/migrations/20260508061214_init/`
- Current schema verified with PostgreSQL 16 via Docker

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

- Initial migration `20260508061214_init` created during Story 1.1
- Schema validated against running PostgreSQL 16 container
- Seed data created: demo tenant, branch, group, admin user

### Completion Notes List

### File List

- backend/prisma/schema.prisma (updated with indexes)
- backend/prisma/migrations/20260508161236_add_indexes/ (new migration with 6 indexes)
