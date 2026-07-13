# Story 5.6: Usage and Activity Reports

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want to export system usage data,
so that I can analyze business volume.

## Acceptance Criteria

1. [Given the Reports tab, When I request a monthly report, Then I can download a CSV with message volume, AI usage, and active sessions.]

## Tasks / Subtasks

- [ ] Backend: CSV Generation Service
  - [ ] Implement query in `metrics.service.js` using Prisma `groupBy` or raw SQL to aggregate messages, AI interactions, and sessions per day/month, strictly scoped by `tenantId`.
  - [ ] Generate RFC 4180 compliant CSV string (Columns: `Fecha, Total Mensajes, Intervenciones IA, Sesiones Activas`). Avoid heavy dependencies if possible; map manually.
- [ ] Backend: Reports Endpoint
  - [ ] Create `GET /api/metrics/reports/usage` in `metrics.routes.js`.
  - [ ] Protect endpoint with `authenticate` and `authorize('ADMIN')` middleware.
  - [ ] Strictly validate `year` and `month` query parameters (must be integers, valid month, not in the future).
  - [ ] Return CSV with `Content-Type: text/csv` and appropriate `Content-Disposition: attachment; filename=report.csv` header. Include UTF-8 BOM `\uFEFF` for Excel compatibility.
- [ ] Frontend: UsageReport Component
  - [ ] Create `UsageReport.jsx` within the metrics features, containing a Date/Month selector and a Download button.
  - [ ] Add loading state (e.g., spinner while generating) and error handling (toast or alert on failure).
  - [ ] Trigger file download using `URL.createObjectURL(new Blob([data], {type: 'text/csv'}))` and a hidden temporary `<a>` element.
- [ ] Integration & Testing
  - [ ] Integrate API call in `metricsService.js` ensuring the fetch uses `.blob()` or `.text()` instead of `.json()`.
  - [ ] Mount `UsageReport` component in the main Reports/Metrics page.

## Dev Notes

- **Data Aggregation:** Do NOT fetch all database rows into memory. You must use SQL aggregations or Prisma `groupBy`.
- **Validation:** Enforce strict date parsing on query parameters to prevent injection or DoS.

### Project Structure Notes

- `backend/src/services/metrics.service.js` (Update)
- `backend/src/routes/metrics.routes.js` (Update)
- `frontend/src/features/metrics/components/UsageReport.jsx` (New)
- `frontend/src/features/metrics/metricsService.js` (Update)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5]

## Dev Agent Record

### Agent Model Used

BMad Context Engine (gemini-2.5-pro)

### Debug Log References

N/A

### Completion Notes List

- Comprehensive story specification generated with strict adherence to template.md and RBAC requirements.

### File List

- `backend/src/routes/metrics.routes.js`
- `backend/src/services/metrics.service.js`
- `frontend/src/features/metrics/components/UsageReport.jsx`
- `frontend/src/features/metrics/metricsService.js`
