---
baseline_commit: b5f0b2a955c9cf58f85edf2ca35c1a7a14dca877
---

# Story saas-2.3: Enforcement de Cuotas de Asientos

Status: completed

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dueño del SaaS,
I want que el sistema rechace la creación de nuevos usuarios si el cliente llegó a su límite,
so that se respete el modelo de negocio.

## Acceptance Criteria

1. **Given** un inquilino con límite de 5 usuarios,
   **When** el Admin del inquilino intenta crear el usuario número 6,
   **Then** el API devuelve un error HTTP `403 Forbidden` con código de error `QUOTA_EXCEEDED` indicando que excedió la cuota.
2. **Given** un inquilino con `maxUsers` en `-1` (ilimitado),
   **When** el Admin del inquilino intenta crear un usuario,
   **Then** la creación procede normalmente sin validación de cuota de asientos.
3. **Given** un inquilino con `maxUsers` en `0` (bloqueado/sin usuarios permitidos),
   **When** el Admin del inquilino intenta crear un usuario,
   **Then** el API rechaza inmediatamente la creación devolviendo un error HTTP `403 Forbidden` con código de error `QUOTA_EXCEEDED`.
4. **Given** la validación de cuotas de usuario,
   **When** el sistema cuenta el número actual de usuarios,
   **Then** solo se cuentan aquellos con estado activo (`isActive: true`), ignorando a los usuarios inactivos o eliminados.
5. **Given** un usuario previamente inactivo o eliminado,
   **When** el Admin intenta reactivar el usuario (actualizar `isActive` de false a true),
   **Then** el sistema verifica la cuota de asientos, y si se excede el límite, rechaza la reactivación devolviendo `403 Forbidden` con `QUOTA_EXCEEDED`. (Reactivation Loophole)
6. **Given** un inquilino enviando una invitación a un nuevo usuario,
   **When** la invitación queda en estado "pendiente",
   **Then** el conteo de invitaciones pendientes se difiere si no existe el modelo Invitation; por seguridad la cuota solo se basa en los usuarios con `isActive: true` en el modelo User. (Invitation State)
7. **Given** una carga masiva de usuarios o una lista enviada al API,
   **When** el número total de usuarios activos/pendientes existentes más los nuevos usuarios a insertar/reactivar excede la cuota de asientos,
   **Then** toda la operación es rechazada devolviendo `403 Forbidden` con `QUOTA_EXCEEDED`. (Bulk imports)
8. **Given** un Global Superadmin creando usuarios en nombre de un inquilino,
   **When** se alcanza el límite de `maxUsers` de ese inquilino,
   **Then** la operación es rechazada con `403 Forbidden` (`QUOTA_EXCEEDED`); los Superadmins están sujetos a los mismos límites de cuota de inquilinos. (Multi-tenancy Role Edge Cases)

## Tasks / Subtasks

- [ ] Task 1: Update users.service.js for quota enforcement (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] Locate the `createUser`, `updateUser`, and `reactivateUser` functions in `backend/src/services/users.service.js`.
  - [ ] Implement quota validation logic that handles single user creation/reactivation as well as arrays of users (protection for bulk imports).
  - [ ] Add strict Zod validation (e.g. max limits, strict integer checks) for any bulk payload array length / sizes before adding to active counts.
  - [ ] For `reactivateUser`, return early silently or succeed instantly if the user is already `isActive: true` during a reactivation request, bypassing the quota math and lock entirely.
  - [ ] Execute the logic within an interactive Prisma transaction. ALL queries inside the transaction MUST use the `tx` client, not `prisma`, to prevent deadlocks.
  - [ ] Utilize row-level locking on the Tenant with Prisma tagged templates and strict uuid casting: `tx.$queryRaw(Prisma.sql\`SELECT id FROM "Tenant" WHERE id = ${tenantId}::uuid FOR UPDATE\`)`.
  - [ ] Catch Prisma transaction timeouts explicitly and convert them to `409 Conflict` (e.g., "System busy, please try again") rather than a generic 500 error.
  - [ ] Query the tenant by `tenantId` to fetch `maxUsers` inside the transaction.
  - [ ] If `maxUsers === -1`, skip quota checks.
  - [ ] If `maxUsers === 0`, immediately throw an `ApiError` (`403 Forbidden`, code `QUOTA_EXCEEDED`).
  - [ ] Query the current active user count explicitly scoped by `tenantId`. This count MUST strictly scope to `isActive: true` on the User model.
  - [ ] If `currentCount + newUsersCount > maxUsers`, throw an `ApiError` (`403 Forbidden`, code `QUOTA_EXCEEDED`). Log a specific business event (`QUOTA_EXCEEDED_ATTEMPT`) con `tenantId` to telemetry/auditing to alert the sales team.
  - [ ] Explicitly invalidate or refresh any Tenant caching mechanisms (e.g., Redis or in-memory caches) to prevent returning stale user counts after a successful user insertion or reactivation.
  - [ ] Retain existing validations (email duplicate, valid creator roles, group constraints) within the transaction and complete the operation, explicitly ensuring Global Superadmins bypass no tenant seat limits.
- [ ] Task 2: Verify and update ApiError utility
  - [ ] Verify `backend/src/utils/ApiError.js` supports passing a custom `code` (e.g., `QUOTA_EXCEEDED`) or custom metadata properties, and modify it if necessary.
- [ ] Task 3: Expose Quota State to Frontend via Backend Contract
  - [ ] Update `GET /tenant` (or the respective tenant config endpoint) to expose both `maxUsers` and the calculated `currentUsersCount` (active users) to the frontend.
- [ ] Task 4: Handle quota errors in Frontend (AC: 1, 3, 5, 7)
  - [ ] Proactively disable the "Create User" and "Invite" buttons in the UI when `currentUsersCount >= maxUsers` (and `maxUsers !== -1`), displaying usage labels like "Seats: {current}/{max}".
  - [ ] Modify the global Axios/fetch `403` interceptor to explicitly catch `error.response?.data?.error?.code === 'QUOTA_EXCEEDED'`.
  - [ ] Trigger a global "Upgrade Plan" modal via the interceptor rather than just local form errors, for reusability.
- [ ] Task 5: Write Unit Tests for users.service
  - [ ] Implement a dense test matrix in `users.service.test.js` covering: limits (under, exact, over), edge limits (-1, 0), pending invitations, the Reactivation Loophole, transaction concurrency lock, and bulk creation validation against quotas.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - AD-4 (Quota Enforcement Layer): Quotas MUST be checked at the service mutation boundaries (`users.service.js` in this case).
- **Source tree components to touch**:
  - `backend/src/services/users.service.js`
  - `backend/src/utils/ApiError.js`
  - `backend/src/services/users.service.test.js`
  - `backend/src/controllers/tenant.controller.js` (for exposing quota state)
  - `frontend/src/services/api/axios.js` (or interceptor config)
  - `frontend/src/features/users/CreateUserForm.jsx`
  - `frontend/src/features/users/UserManagement.jsx` (or relevant lists for button disabling)
- **Testing standards summary**:
  - Implement a dense test matrix covering concurrency, boundaries, reactivation, bulk updates, and invitations.

### Project Structure Notes

- **Alignment with unified project structure**: The quotas apply strictly to tenant-scoped actions, so we enforce them inside the existing tenant-scoped service (`users.service.js`).
- **Detected conflicts or variances**: None.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Epic 2: Motor de Monetización y Licenciamiento]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-4: Quota Enforcement Layer]
- [Source: backend/src/services/users.service.js#L50-L100]
- [Source: backend/src/utils/ApiError.js]

### Review Findings

- [ ] [Review][Patch] Unhandled Zod errors in `enforceQuota` cause 500 errors — Zod validation uses `.parse()` without catching, throwing raw ZodErrors instead of standard ApiErrors.
- [ ] [Review][Patch] Swallowed database errors in row-level lock mask true failures — `try/catch` around `SELECT FOR UPDATE` throws generic "System busy", masking UUID cast errors and deadlocks.
- [ ] [Review][Patch] Raw `SELECT FOR UPDATE` lock is not tied to Prisma ORM query — Executing raw lock then standard `findUnique` does not guarantee lock applies to ORM query.
- [ ] [Review][Patch] `createBulkUsers` executes N+1 database queries in loop — Sequential `for...of` loop up to 10k items will hammer DB and cause timeouts.
- [ ] [Review][Patch] Synchronous `bcrypt.hash` inside bulk loop blocks Node.js event loop — CPU-intensive operations inside loop freeze the application for all requests.
- [ ] [Review][Patch] Race condition checking user state outside transaction — `reactivateUser` and `updateUser` fetch user outside transaction, bypassing quota checks for concurrent requests.
- [ ] [Review][Patch] Admins can be created with groups — Role ADMIN and groupIds non-empty succeeds in creation, but is disallowed in update.
- [ ] [Review][Patch] Unnecessary deletion and recreation of `groupVendor` records — In `updateUser`, relationships are deleted/recreated unconditionally, bloating replication logs.
- [ ] [Review][Patch] Coordinators can bypass role restrictions via bulk creation and reactivation — Missing checks allow Coordinators to create/reactivate Admin users.
- [ ] [Review][Patch] Vendors can be assigned multiple groups via bulk creation — Missing validation allows bypassing the single-group limitation.
- [ ] [Review][Patch] Concurrent reactivations of the same user cause spurious QUOTA_EXCEEDED — Double counting user state leads to incorrect quota limits.
- [ ] [Review][Patch] TypeError on null `groupIds` causes 500 error — Accessing `.length` on null crashes instead of validating.
- [ ] [Review][Patch] Redundant tenant profile fetches in `UserListPage` — Fetched concurrently with user list on pagination/search, wasting bandwidth.
- [ ] [Review][Patch] Swapping `<a>` for `<button>` degrades accessibility — Dynamically changing element types breaks browser behavior.
- [ ] [Review][Patch] Haphazard 403 error interception in `api.js` — Duplicated logic risks double-firing modals; empty catch blocks swallow parsing errors.
- [ ] [Review][Patch] Tenant caching mechanism is not invalidated — Violates Task 1: Caches not refreshed after user changes.
- [ ] [Review][Patch] Transaction timeouts on broader Prisma queries not caught — Violates Task 1: 409 Conflict only handled on lock, not main transaction.
- [ ] [Review][Patch] Quota state not exposed in GET `/tenant` — Violates Task 3: Backend does not send data expected by frontend `/tenant/profile`.
- [ ] [Review][Patch] Create/Invite actions not fully disabled — Violates Task 4: Missing disabling logic in `CreateUserForm.jsx` and invitations.
- [ ] [Review][Patch] Global "Upgrade Plan" modal is missing — Violates Task 4: Event dispatched but modal component is unimplemented.

## Dev Agent Record

### Agent Model Used

Antigravity 2.0

### Debug Log References

### Completion Notes List

### File List
