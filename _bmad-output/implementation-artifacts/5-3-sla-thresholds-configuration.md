---
baseline_commit: 9d3d803dd6e7c0b430c34d8570c912d9ea2c645b
---
# Story 5.3: SLA Thresholds Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to define acceptable response times (SLAs),
so that I can measure team performance.

## Acceptance Criteria

1. **Given** the SLA settings, **When** I set a limit of 15 minutes for first response, **Then** the system uses this threshold for alerts and reports.

## Tasks / Subtasks

- [x] Task 1: Database Schema Expansion (AC: 1)
  - [x] Subtask 1.1: Add `SlaConfig` model in `schema.prisma`. It must belong to `Tenant` (1:1 relation) and store `firstResponseMins` (Int). Optional: `resolutionMins` (Int) for future-proofing.
  - [x] Subtask 1.2: Add the inverse relation `slaConfig SlaConfig?` to the `Tenant` model.
  - [x] Subtask 1.3: Run `npx prisma format` and create a migration (or let dev agent handle migration step).
- [x] Task 2: Backend Service & API (AC: 1)
  - [x] Subtask 2.1: Create `backend/src/services/sla.service.js` with methods to `getSlaConfig(tenantId)` and `updateSlaConfig(tenantId, data)`.
  - [x] Subtask 2.2: Expose REST endpoints (`GET` and `PUT` `/api/metrics/sla`) in `backend/src/routes/metrics.routes.js` and mount this route in `backend/src/app.js` (e.g., `app.use('/api/metrics', metricsRoutes)`).
  - [x] Subtask 2.3: Protect the endpoints using `authMiddleware` and `rbacMiddleware(['ADMIN', 'COORDINATOR'])`.
  - [x] Subtask 2.4: Validate inputs (ensure minutes > 0).
- [x] Task 3: Frontend UI & State (AC: 1)
  - [x] Subtask 3.1: Create `frontend/src/features/settings/SlaConfigSection.jsx` to configure SLA limits.
  - [x] Subtask 3.2: Wire this new component into `frontend/src/pages/Settings.jsx` by adding a new tab: `{ id: 'sla', label: 'SLA y Tiempos', roles: ['ADMIN', 'COORDINATOR'] }`.
  - [x] Subtask 3.3: On component mount, `GET` the current configuration to pre-fill the form fields.
  - [x] Subtask 3.4: Use `apiFetch` (from `services/api.js`) to load and save the SLA configuration.
  - [x] Subtask 3.5: Implement simple form validation and success/error toasts.
- [x] Task 4: Testing & Quality (AC: 1)
  - [x] Subtask 4.1: Write unit tests for `sla.service.js` logic and integration tests for the `/api/metrics/sla` endpoints as required by DoD.

## Dev Notes

- **Multi-tenancy:** Always scope Prisma queries with `tenantId` from the authenticated user (`req.user.tenantId`).
- **RBAC Check:** Use `rbacMiddleware(['ADMIN', 'COORDINATOR'])` to enforce strict role access.
- **Prisma Schema:** `SlaConfig` must map to `sla_configs` table. You MUST use `@map("first_response_mins")`, `@map("tenant_id")`, etc., to comply with the project's strict `snake_case` DB column naming convention.
- **Error Handling:** Backend should use `ApiError` utility or standard Express error handling per project-context.md.
- **Frontend State:** `Zustand` or local `useState` is fine for the form. If fetched globally, consider where it should live, but standard fetch on the settings page is acceptable.

### Project Structure Notes

- **Backend:** `backend/src/services/sla.service.js`, `backend/src/routes/metrics.routes.js`, `backend/src/app.js`.
- **Frontend:** Components should be in `frontend/src/features/settings/` and follow existing patterns (e.g., `SlaConfigSection.jsx`), integrated into `Settings.jsx`.
- **Database:** `backend/prisma/schema.prisma`

### References

- [Source: _bmad/project-context.md#Code Quality & Style Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements Coverage Validation]
- [Source: backend/prisma/schema.prisma]

## Dev Agent Record

### Agent Model Used

Gemini 3.1 Pro (High)

### Debug Log References

### Completion Notes List

- ✅ Database: Added `SlaConfig` model to Prisma schema, mapped to `sla_configs` and ran migration.
- ✅ Backend Service: Created `sla.service.js` with `getSlaConfig` and `updateSlaConfig` methods, handling validation and upsert logic.
- ✅ Backend API: Created `metrics.routes.js`, secured with `authenticate` and `authorize('ADMIN', 'COORDINATOR')` middlewares, and mounted under `/api/metrics` in `app.js`.
- ✅ Frontend UI: Created `SlaConfigSection.jsx` to render the configuration form, with fetch and save behavior via `api.js`.
- ✅ Frontend Integration: Mounted the SLA Config section as a new tab in `Settings.jsx` following existing patterns.
- ✅ Tests: Implemented unit tests for `sla.service.js` and integration tests for `/api/metrics/sla`, both with 100% pass rate.

### File List

- `backend/prisma/schema.prisma` (Modified)
- `backend/prisma/migrations/20260708172731_add_sla_config/migration.sql` (New)
- `backend/src/app.js` (Modified)
- `backend/src/routes/metrics.routes.js` (New)
- `backend/src/services/sla.service.js` (New)
- `backend/tests/integration/metrics.test.js` (New)
- `backend/tests/unit/sla.service.test.js` (New)
- `frontend/src/features/settings/SlaConfigSection.jsx` (New)
- `frontend/src/pages/Settings.jsx` (Modified)
- `frontend/src/services/api.js` (Modified)

### Review Findings

- [x] [Review][Patch] Unbounded configuration values — Apply an upper limit of 10080 minutos (7 days) for both fields. [backend/src/services/sla.service.js]
- [x] [Review][Patch] Missing payload object validation [backend/src/services/sla.service.js]
- [x] [Review][Patch] Missing integer and NaN validation for SLA minutes [backend/src/services/sla.service.js]
- [x] [Review][Patch] Logical inconsistency allowing firstResponseMins > resolutionMins [backend/src/services/sla.service.js]
- [x] [Review][Patch] Missing integration tests for COORDINATOR role [backend/tests/integration/metrics.test.js]
- [x] [Review][Patch] Test cleanup failure risk with potentially undefined tenantId [backend/tests/integration/metrics.test.js]
- [x] [Review][Patch] Missing input IDs and a11y labels [frontend/src/features/settings/SlaConfigSection.jsx]
- [x] [Review][Patch] Incomplete Swagger documentation for 400 and 500 error responses [backend/src/routes/metrics.routes.js]
- [x] [Review][Patch] UI state override vulnerability if backend payload properties are missing [frontend/src/features/settings/SlaConfigSection.jsx]
- [x] [Review][Patch] Missing implementation of success/error toasts [frontend/src/features/settings/SlaConfigSection.jsx]

### Review Findings (Round 2)

- [ ] [Review][Patch] Swagger documentation fails to define response schema object structure [backend/src/routes/metrics.routes.js]
- [ ] [Review][Patch] Frontend input fields lack `max` attribute [frontend/src/features/settings/SlaConfigSection.jsx]
- [ ] [Review][Patch] State-managed timeouts do not clear previous timeout IDs [frontend/src/features/settings/SlaConfigSection.jsx]
- [ ] [Review][Patch] Form inputs remain interactive while submitting [frontend/src/features/settings/SlaConfigSection.jsx]
- [ ] [Review][Patch] If initial config fetch fails, UI renders defaults (could accidentally overwrite) [frontend/src/features/settings/SlaConfigSection.jsx]
- [ ] [Review][Patch] Partial update bypasses SLA bounds consistency check [backend/src/services/sla.service.js]
- [ ] [Review][Patch] Empty no-op update if no valid fields [backend/src/services/sla.service.js]
- [x] [Review][Defer] SlaConfigSection fails to implement AbortController [frontend/src/features/settings/SlaConfigSection.jsx] — deferred, pre-existing pattern
- [x] [Review][Defer] Frontend duplicates business defaults [frontend/src/features/settings/SlaConfigSection.jsx] — deferred, minor
- [x] [Review][Defer] Test suite neglects testing Prisma errors [backend/tests/unit/sla.service.test.js] — deferred, pre-existing pattern
- [x] [Review][Defer] Global router-level authorization limits scope of metrics routes [backend/src/routes/metrics.routes.js] — deferred, current scope is SLA only
