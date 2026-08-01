# Story 1.5: Suspensión de Inquilinos

Status: DONE

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Superadmin,
I want to be able to suspend or reactivate a Tenant,
so that I can block access to the system for a company due to non-payment or cancellation, and halt their WhatsApp webhook processing and outgoing messages.

## Acceptance Criteria

1. **Given** a Superadmin on the Tenants list, **when** they click the Suspend (or Reactivate) button for a specific tenant, **then** the tenant's `status` should be updated to `suspended` (or `active`) via an idempotent API endpoint, logging the administrative action.
2. **Given** a suspended tenant, **when** any user belonging to that tenant attempts to log in or use an active session, **then** the authentication/request should be rejected with a standardized 403 Forbidden error indicating the tenant is suspended.
3. **Given** a suspended tenant, **when** their WhatsApp webhook receives a new message from Meta or the system attempts to send an outgoing message, **then** the action should be blocked/discarded early in the pipeline without processing it.

## Tasks / Subtasks

- [x] Task 1: Shared Infrastructure - Centralized Caching
  - [x] Create `backend/src/utils/tenant-cache.util.js` that exports a centralized in-memory singleton `tenantStatusCache`. Implement manual TTL checks (e.g., storing `{ status, expiresAt }`) since standard `Map` has no TTL, or use `node-cache` if available.
  - [x] Export cache management functions (`getTenantStatus`, `setTenantStatus`, `invalidateTenantCache`).
- [x] Task 2: Backend API for Status Toggle (AC: 1)
  - [x] In `backend/src/services/superadmin.tenant.service.js`, modify the existing `updateTenantStatus` method to execute the following sequence atomically:
    1. Validate anti-lockout: Prevent suspension if the tenant is the master tenant (identify via `process.env.MASTER_TENANT_ID`).
    2. Retain the existing idempotency check.
    3. Update `status` field in the database. Ensure the service injects `"active"` (lowercase) consistently, not `'ACTIVE'`.
    4. Call `setTenantStatus(tenantId, status)` on the centralized cache to proactively update it instead of just invalidating.
    5. Graceful Socket Disconnect: Emit a `"tenant_suspended"` event to active WebSockets so the frontend can show a graceful suspension screen. Then iterate over namespaces (e.g. `/chat`), decode `socket.handshake.auth.token` to check `tenantId`, and call `socket.disconnect(true)`.
    6. Output structured audit logging by importing `backend/src/utils/logger.js` and calling `logger.info(JSON.stringify({ event: 'TENANT_STATUS_CHANGED', tenantId, status }))`.
  - [x] Verify the existing `PATCH /api/superadmin/tenants/:id/status` route and its Zod controller validate `['active', 'suspended']` consistently, and enforce a standardized HTTP 400 error payload for invalid status payloads.
- [x] Task 3: Block Login and Active Sessions (AC: 2)
  - [x] In `backend/src/services/auth.service.js`, modify login logic to reject if `tenant.status === 'suspended'` and user is not Superadmin.
  - [x] Update global authentication middleware (`backend/src/middleware/auth.js`) to check if the tenant is suspended by calling `getTenantStatus`.
  - [x] **DB Fallback (High Traffic)**: If `getTenantStatus` returns `undefined` (cache miss), fetch from `prisma.tenant.findUnique`. Implement promise-deduplication or a local locking mechanism so concurrent requests don't trigger a thundering herd on Prisma. Cache it via `setTenantStatus`, and then evaluate.
  - [x] Ensure the 403 response payload is standardized (e.g., `{ error: "TENANT_SUSPENDED" }`).
- [x] Task 4: Block Webhook & Outgoing Processing for Suspended Tenants (AC: 3)
  - [x] In `backend/src/services/whatsapp.service.js`, verify if the tenant is active before processing incoming messages in `handleIncomingMessage`. Extract the exact `tenantId` parameter passed directly from the route and use `getTenantStatus` from `tenant-cache.util.js`.
  - [x] If suspended, return a 200 OK to Meta early (to avoid retries) and skip saving.
  - [x] Modify `sendMessage` and `sendMedia` in `whatsapp.service.js` to also verify the tenant status using `getTenantStatus`. If suspended, return an exact HTTP 403 Forbidden response with a standardized payload `{ error: "TENANT_SUSPENDED", message: "Tenant is suspended. Cannot send messages." }`.
- [x] Task 5: Frontend UI for Status Toggle (AC: 1)
  - [x] Verify/Add the `updateTenantStatus(id, status)` method in `superadmin-frontend/src/services/api.js`.
  - [x] In `superadmin-frontend/src/pages/Tenants.jsx`, add/verify the toggle button in each row. Ensure it includes required ARIA attributes for screen reader accessibility and works consistently across Chrome, Firefox, and Safari.
  - [x] Implement loading state (`isToggling`), disabling the button during the request.
  - [x] Add error toast fallback handling if the request fails. Mandate using the project's standardized toast component with exact professional UX verbiage (e.g. "Error al actualizar el estado del inquilino").
  - [x] Perform an optimistic UI update of the specific row's status to prevent a full page reload.
- [x] Task 6: Testing & QA Coverage
  - [x] Unit test backend service and controller logic for the status toggle.
  - [x] Unit test the authentication and middleware logic (including cache miss deduplication).
  - [x] Unit test the WhatsApp webhook rejections and outgoing message blocks ensuring exact 403 outputs.
  - [x] Add frontend unit/integration tests for the Toggle component, verifying loading states, optimistic UI updates, and ARIA attributes.

## Dev Notes

- Source tree components to touch
  - `backend/src/utils/tenant-cache.util.js`
  - `backend/src/services/superadmin.tenant.service.js`
  - `backend/src/controllers/superadmin.tenant.controller.js`
  - `backend/src/routes/superadmin.tenant.routes.js`
  - `backend/src/services/auth.service.js`
  - `backend/src/middleware/auth.js`
  - `backend/src/services/whatsapp.service.js`
  - `superadmin-frontend/src/services/api.js`
  - `superadmin-frontend/src/pages/Tenants.jsx`
- Relevant architecture patterns and constraints
  - Keep the endpoint protected with `isSuperadmin` middleware.
  - In webhooks, returning 200 early is critical so Meta doesn't queue and retry messages for suspended tenants.
- Testing standards summary
  - Adhere to the consolidated "Testing & QA Coverage" task. Ensure all frontend component tests cover accessibility (ARIA).

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - Ensure we use RESTful conventions: `PATCH /api/superadmin/tenants/:id/status`.
- Detected conflicts or variances (with rationale)
  - Field `status` is currently a `String` in the Prisma schema. While a native Prisma `Enum` would ensure stronger database-level integrity, we will keep it as `String` to avoid a DB migration now, but enforce strict `"active" | "suspended"` values via Zod validation.

### References

- [Source: superadmin-saas-prd.md#Epica-1]
- [Source: backend/prisma/schema.prisma#Tenant]

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

### Review Findings
- [x] [Review][Patch] Master tenant suspension protection bypass (missing environment variable check) [backend/src/services/superadmin.tenant.service.js]
- [x] [Review][Patch] Orphaned users bypass suspension (missing null check on user.tenant) [backend/src/services/auth.service.js]
- [x] [Review][Patch] Token missing tenantId bypasses suspension middleware [backend/src/middleware/auth.js]
- [x] [Review][Patch] Global 403 handling logs out user and breaks optimistic updates [superadmin-frontend/src/services/api.js]
- [x] [Review][Patch] Inconsistent logging using console.log instead of logger [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Missing unit and integration tests for Auth, WhatsApp blocks, and Frontend UI [backend/tests, superadmin-frontend/src/pages]
- [x] [Review][Defer] tenantStatusCache lacks periodic memory eviction for unread keys [backend/src/utils/tenant-cache.util.js] — deferred, pre-existing
- [x] [Review][Defer] Pagination inputs lack strict Zod validation [backend/src/controllers/superadmin.tenant.controller.js] — deferred, pre-existing
- [x] [Review][Defer] Slug regex allows purely numeric values — deferred, pre-existing
- [x] [Review][Defer] userWithoutPassword uses blacklist pattern for sensitive fields — deferred, pre-existing
- [x] [Review][Defer] api.js timeout on non-idempotent operations can create ghost resources — deferred, pre-existing
- [x] [Review][Defer] Tenants.jsx shows jarring skeleton loader flicker on page transition — deferred, pre-existing
- [x] [Review][Defer] fetchSockets() could cause memory issues with massive connected clients — deferred, pre-existing
- [x] [Review][Patch] `pendingTenantFetches` logic is duplicated [backend/src/middleware/auth.js]
- [x] [Review][Patch] `pendingTenantFetches` lacks TTL and can cause deadlock [backend/src/middleware/auth.js]
- [x] [Review][Patch] Predictable password generation format [superadmin-frontend/src/components/CreateTenantModal.jsx]
- [x] [Review][Patch] Backend Zod schema for passwords misses special char requirement [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Socket disconnect fallback to 'fallback_secret' is unsafe [backend/src/services/superadmin.tenant.service.js]
- [x] [Review][Patch] Unique constraint error handling assumes err.meta.target is array [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Service throwing err.statusCode === 403 results in 500 error [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Prisma DB error in middleware masked as 401 [backend/src/middleware/auth.js]
- [x] [Review][Patch] `tenantId` undefined causes Prisma error instead of early rejection [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Exact HTTP 403 payload for outgoing messages deviates from spec [backend/src/services/whatsapp.service.js]
- [x] [Review][Defer] `updateTenantStatus` performs non-atomic TOCTOU read-then-update [backend/src/services/superadmin.tenant.service.js] — deferred, pre-existing

- [x] [Review][Patch] Event Loop Blocking (DoS Risk) [backend/src/services/superadmin.tenant.service.js]
- [x] [Review][Patch] Dangling Timers / Memory Leak [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Uncached DB queries for invalid IDs [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Swallowed Database Errors [backend/src/middleware/auth.js]
- [x] [Review][Patch] Inconsistent Environment Variable Access [backend/src/services/superadmin.tenant.service.js]
- [x] [Review][Patch] Deviation in 403 Error Payload para Mensajes Salientes [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Webhooks ignorados silenciosamente en errores DB [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Manejo inadecuado de TENANT_SUSPENDED (desloguea superadmin) [superadmin-frontend/src/services/api.js]
- [x] [Review][Patch] Validación de password incompleta/contradictoria [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Faltan pruebas unitarias para bloqueo de mensajes [backend/tests/whatsapp.service.test.js]
- [x] [Review][Patch] Librerías de validación inconsistentes (regex) [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Patch] Rate limiting por IP se puede saltar [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Defer] Rate limiting en memoria es ineficiente en multi-instancia [backend/src/controllers/superadmin.auth.controller.js] - deferred, pre-existing
- [x] [Review][Defer] Catch-All genérico de logs en creación de tenant [backend/src/controllers/superadmin.tenant.controller.js] - deferred, pre-existing
- [x] [Review][Defer] Verificación frágil de status (estricto a 'suspended') [backend/src/services/auth.service.js] - deferred, pre-existing

### Review Findings (Pass 7)
- [x] [Review][Patch] Thundering herd mitigation causes UnhandledPromiseRejection and memory leak [backend/src/utils/tenant-cache.util.js:58-69]
- [x] [Review][Patch] fetch abort listener never removed [superadmin-frontend/src/services/api.js:21-25]
- [x] [Review][Patch] Optimistic update race condition on catch block [superadmin-frontend/src/pages/Tenants.jsx:154-156]
- [x] [Review][Patch] Deviation in 403 error payload message for outgoing messages [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Missing unit tests for backend service status toggle logic [backend/tests/unit/superadmin.tenant.service.test.js]
- [x] [Review][Patch] Missing unit test for WhatsApp sendMedia outgoing block [backend/tests/whatsapp.service.test.js]
- [x] [Review][Patch] Missing explicit test assertion for loading state in frontend toggle [superadmin-frontend/src/pages/__tests__/Tenants.test.jsx]
- [x] [Review][Patch] Missing UUID validation for tenant ID in updateTenantStatus [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Defer] Password validation regex blindly accepts whitespace [backend/src/controllers/superadmin.tenant.controller.js:17] — deferred, pre-existing
- [x] [Review][Defer] Brittle error handling for Prisma unique constraint errors [backend/src/controllers/superadmin.tenant.controller.js:64-67] — deferred, pre-existing
- [x] [Review][Defer] Authorization middleware hardcodes suspension check to 'suspended' [backend/src/middleware/auth.js] — deferred, pre-existing
- [x] [Review][Defer] Duplicated tenant suspension logic in auth.service.js [backend/src/services/auth.service.js] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded low salt rounds for bcrypt [backend/src/services/superadmin.tenant.service.js] — deferred, pre-existing
- [x] [Review][Defer] verifyWebhook inconsistently throws raw Error [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Cache TTL rigidly hardcoded [backend/src/utils/tenant-cache.util.js:4] — deferred, pre-existing
- [x] [Review][Defer] handleToggleStatus relies on window.confirm [superadmin-frontend/src/pages/Tenants.jsx] — deferred, pre-existing
- [x] [Review][Defer] Pagination text inaccurate [superadmin-frontend/src/pages/Tenants.jsx] — deferred, pre-existing

### Review Findings (Pass 8)
- [x] [Review][Patch] Webhook Retry Prevention Violation (Returns 500 instead of 200 OK) [backend/src/routes/whatsapp.routes.js]
- [x] [Review][Patch] Frontend Session Handling Lobotomy (Removed TENANT_SUSPENDED interception) [superadmin-frontend/src/services/api.js]
- [x] [Review][Patch] Fragile Cache Fallback Logic (Implicit Suspension on Timeout) [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Unhandled Zod Exceptions for Tenant ID Validation [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Blind Environment Variable Trust (MASTER_TENANT_ID) [backend/src/config/env.js]
- [x] [Review][Patch] Hostile Rate Limiter Design [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Patch] Inconsistent Error Response Structure [backend/src/middleware/errorHandler.js]
- [x] [Review][Patch] Silent Failure Swallowing [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Deviation from Requested ID Validation (CUID instead of UUID) [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Naive Zod Error Concatenation [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Patch] Lazy Configuration Validation [backend/src/services/superadmin.tenant.service.js]
- [x] [Review][Defer] Janky Event Loop Management [backend/src/services/superadmin.tenant.service.js] - deferred, pre-existing
- [x] [Review][Defer] Hardcoded low salt rounds for bcrypt [backend/src/services/superadmin.tenant.service.js] — deferred, pre-existing
- [x] [Review][Defer] verifyWebhook inconsistently throws raw Error [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Cache TTL rigidly hardcoded [backend/src/utils/tenant-cache.util.js:4] — deferred, pre-existing
- [x] [Review][Defer] handleToggleStatus relies on window.confirm [superadmin-frontend/src/pages/Tenants.jsx] — deferred, pre-existing
- [x] [Review][Defer] Pagination text inaccurate [superadmin-frontend/src/pages/Tenants.jsx] — deferred, pre-existing

### Review Findings (Pass 9)
- [x] [Review][Patch] Webhook Retry Prevention Violation (Returns 500 instead of 200 OK) [backend/src/routes/whatsapp.routes.js]
- [x] [Review][Patch] Frontend Session Handling Lobotomy (Removed TENANT_SUSPENDED interception) [superadmin-frontend/src/services/api.js]
- [x] [Review][Patch] Reckless Error Handling Deletion (Missing try/catch around getTenantStatusAsync) [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Hostile Rate Limiter Block for Unresolvable IPs [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Patch] Deviation from Requested ID Validation (CUID instead of UUID) [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Lazy Environment Configuration (MASTER_TENANT_ID) [backend/src/config/env.js]
- [x] [Review][Patch] Clumsy Optimistic UI Revert relies on stale closure variable [superadmin-frontend/src/pages/Tenants.jsx]
- [x] [Review][Patch] Hardcoded Magic Timeout (5000ms) [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Naive Error Message Joins for Zod schema [backend/src/controllers/superadmin.auth.controller.js]
- [x] [Review][Patch] Unhandled Zod Exceptions for Tenant ID Validation (uses .parse) [backend/src/controllers/superadmin.tenant.controller.js]
- [x] [Review][Patch] Silent Database Error Swallowing in Cache Fallback [backend/src/utils/tenant-cache.util.js]
- [x] [Review][Patch] Inconsistent Error Response Structure in Error Handler [backend/src/middleware/errorHandler.js]
- [x] [Review][Patch] Missing removeEventListener method check on options.signal [superadmin-frontend/src/services/api.js]
- [x] [Review][Defer] OOM Time Bomb (fetchSockets) [backend/src/services/superadmin.tenant.service.js] — deferred, pre-existing
- [x] [Review][Defer] Security Theater Password Validation (whitespace) [backend/src/controllers/superadmin.tenant.controller.js] — deferred, pre-existing
