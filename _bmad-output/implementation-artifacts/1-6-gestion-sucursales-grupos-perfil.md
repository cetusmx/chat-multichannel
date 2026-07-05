---
status: implemented
epic: 1
story: 1.6
type: feature
---

# Story 1.6 — Gestión de sucursales, grupos y perfil de empresa

## Acceptance Criteria Covered

- [x] AC1: Admin puede ver y editar nombre, dominio e info de contacto de la empresa
- [x] AC2: Admin puede crear sucursales con nombre, dirección y teléfono
- [x] AC3: Admin puede crear grupos bajo una sucursal con nombre y descripción
- [x] AC4: Admin puede asignar vendedores a grupos desde la edición de usuario
- [x] AC5: Al eliminar sucursal con grupos activos, el sistema advierte

## Backend Changes

### Schema (`backend/prisma/schema.prisma`)
- Added `phone`, `email`, `address` fields to `Tenant` model
- Migration: `20260508204755_add_tenant_contact_info`

### New files
- `backend/src/services/tenant.service.js` — `getProfile()`, `updateProfile()`
- `backend/src/services/branch.service.js` — `listBranches()`, `createBranch()`, `updateBranch()`, `deleteBranch()`
- `backend/src/services/group.service.js` — `listGroups()`, `createGroup()`, `updateGroup()`, `deleteGroup()`
- `backend/src/routes/tenant.routes.js` — `GET /api/tenant/profile`, `PUT /api/tenant/profile` (admin-only)
- `backend/src/routes/branch.routes.js` — `GET /api/branches`, `POST /api/branches`, `PUT /api/branches/:id`, `DELETE /api/branches/:id`
- `backend/tests/integration/settings.test.js` — 25 tests for tenant, branch, group, and user group assignment

### Modified files
- `backend/src/routes/groups.routes.js` — Added `POST /api/groups`, `PUT /api/groups/:id`, `DELETE /api/groups/:id`
- `backend/src/services/users.service.js` — `updateUser()` now supports `groupIds` for vendor group reassignment
- `backend/src/routes/users.routes.js` — Updated Swagger doc for PUT to include `groupIds`
- `backend/src/app.js` — Registered `tenantRoutes` and `branchRoutes`
- `backend/prisma/seed.js` — Added tenant contact info (phone, email, address)

## Frontend Changes

### New files
- `frontend/src/features/settings/CompanyProfileSection.jsx` — Edit tenant name, domain, phone, email, address
- `frontend/src/features/settings/BranchListSection.jsx` — CRUD table for branches with delete protection
- `frontend/src/features/settings/GroupListSection.jsx` — CRUD table for groups with branch selector

### Modified files
- `frontend/src/pages/Settings.jsx` — Replaced placeholder with tabbed layout (Empresa, Sucursales, Grupos)
- `frontend/src/features/users/UserListPage.jsx` — EditUserModal now loads groups and allows group toggle for VENDOR users

## Tests

**49 tests passing** (4 suites):

| Suite | Tests | Coverage |
|-------|-------|----------|
| `tests/unit/health.test.js` | 2 | Health endpoint |
| `tests/integration/auth.test.js` | 9 | Login, refresh, protected endpoints |
| `tests/integration/users.test.js` | 13 | User CRUD, RBAC, group validation |
| `tests/integration/settings.test.js` | 25 | Tenant profile, branches CRUD, groups CRUD, user group assignment |

Key test scenarios:
- Tenant profile: read (any auth'd user), update (admin only), reject non-admin
- Branches: list, create, update, delete empty branch OK, delete with groups → 400 error
- Groups: create with/without branchId validation, update, delete, RBAC enforcement
- User group assignment: reassign vendor groups, reject invalid group IDs, reject empty groups
