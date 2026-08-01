---
baseline_commit: "4fadef758ed47194d6a4578c52478c1429563295"
---

# Story 1.3: Listado Global de Inquilinos

Status: review

## Story

As a Superadmin,
I want ver una lista de todos los inquilinos,
So that pueda monitorear quiénes están registrados en la plataforma.

## Acceptance Criteria

- **Given** que estoy logueado en el panel,
- **When** navego a la sección "Inquilinos",
- **Then** veo una tabla con todos los tenants (Nombre, Dominio, Fecha de Creación, Estado).
- **And** los datos provienen de un nuevo servicio backend `superadmin.tenant.service.js` con paginación y ordenamiento.

## Tasks / Subtasks

- [x] Create Backend Service & Controller
  - [x] Implement `superadmin.tenant.service.js` with pagination and sorting
  - [x] Implement `superadmin.tenant.controller.js` for handling the request
- [x] Setup Backend Routing
  - [x] Create `superadmin.tenant.routes.js` protected by `superadmin.auth.middleware.js`
  - [x] Register new route in `app.js` under `/api/superadmin/tenants`
- [x] Refactor Frontend Layout
  - [x] Create `SuperadminLayout.jsx` with persistent sidebar navigation link to `/tenants`
  - [x] Refactor `Dashboard.jsx` to use the new layout
  - [x] Update `App.jsx` with the layout change
- [x] Implement Tenants Data View
  - [x] Create `Tenants.jsx` page component with API client fetching (`api.get`)
  - [x] Implement UI Table with Lucide icons for statuses/headers
  - [x] Add skeleton loaders and error state management

## Dev Notes

This story implements the first major UI view of the Superadmin SaaS platform. It connects the frontend SPA with a newly exposed dedicated backend endpoint for retrieving global tenants.

- **Architecture Compliance (AD-2 - Parallel Service Ecosystem):**
  - Existing services (e.g., `tenant.service.js`) **MUST** remain completely blind to the Superadmin role and continue enforcing `tenantId` strict isolation.
  - Global queries required by the Superadmin MUST be implemented in a parallel ecosystem of dedicated services (`superadmin.tenant.service.js`).
- **Database:** The `Tenant` Prisma model already contains `name`, `domain`, `createdAt`, `status`. Do not add new fields. Use Prisma's `skip`, `take`, and `orderBy`.
- **Frontend Constraints:** Use the existing native `fetch` wrapper (`superadmin-frontend/src/services/api.js`). **Do not introduce Axios.** Note that `api.js` automatically handles auth headers and 401 redirects, so do not duplicate this logic.

### Project Structure Notes

- **Backend:** Create `backend/src/services/superadmin.tenant.service.js`, `backend/src/controllers/superadmin.tenant.controller.js`, and `backend/src/routes/superadmin.tenant.routes.js`. Update `backend/src/app.js`.
- **Frontend:** Create `superadmin-frontend/src/pages/Tenants.jsx` and `superadmin-frontend/src/components/SuperadminLayout.jsx`. Update `superadmin-frontend/src/pages/Dashboard.jsx` and `superadmin-frontend/src/App.jsx`.

### References

- [Epic 1: Ciclo de Vida de Inquilinos (FR-S2.3 from SaaS Superadmin PRD)]

## Developer Context

### Technical Requirements

#### Backend Requirements
- **Endpoint Specification:** Create `GET /api/superadmin/tenants`.
  - **Query Parameters:** `page` (default: 1), `limit` (default: 10), `sortBy` (default: createdAt), `sortOrder` (default: desc).
  - **Response Structure:** Must return JSON in the format `{ data: [...], meta: { total, page, limit } }`.
- **Middleware:** Protect the new route using the existing `superadmin.auth.middleware.js` to ensure only superadmins can access it.

#### Frontend Requirements
- **Table Implementation:**
  - Present a clean, paginated, and sortable data table matching the premium Tailwind v4 design established in Story 1.2.
  - Use local component state for the table data unless global sharing is strictly needed.

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro

### Debug Log References
- Successfully ran tests in backend (`npm run test -- superadmin.tenant.service.test.js` and `npm run test -- superadmin.tenant.controller.test.js`)
- Re-structured `Dashboard.jsx` separating `SuperadminLayout.jsx`

### Completion Notes List
- Implemented `superadmin.tenant.service.js` returning paginated tenants sorted and formatted properly.
- Implemented `superadmin.tenant.controller.js` catching requests and handling responses nicely.
- Protected `superadmin.tenant.routes.js` with existing `superadminAuth` middleware and registered under `/api/superadmin/tenants`.
- Built `SuperadminLayout.jsx` for persistent sidebar wrapping an `<Outlet />`.
- Added premium frontend design in `Tenants.jsx` component matching specifications including standard `api.get` call.

### File List
- backend/src/services/superadmin.tenant.service.js
- backend/tests/unit/superadmin.tenant.service.test.js
- backend/src/controllers/superadmin.tenant.controller.js
- backend/tests/unit/superadmin.tenant.controller.test.js
- backend/src/routes/superadmin.tenant.routes.js
- backend/src/app.js
- superadmin-frontend/src/components/SuperadminLayout.jsx
- superadmin-frontend/src/pages/Dashboard.jsx
- superadmin-frontend/src/pages/Tenants.jsx
- superadmin-frontend/src/App.jsx
