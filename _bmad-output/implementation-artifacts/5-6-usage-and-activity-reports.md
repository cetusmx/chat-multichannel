# Story 5.6: Usage and Activity Reports

Status: done

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
  - [x] Integrate API call in `metricsService.js` ensuring the fetch uses `.blob()` or `.text()` instead of `.json()`.
  - [x] Mount `UsageReport` component in the main Reports/Metrics page.

### Review Findings

- [x] [Review][Decision] Filename Format — Spec requested literal `report.csv`, but implementation provides `usage-report-YYYY-MM.csv`. Which should we keep? -> Decided to keep dynamic name.
- [x] [Review][Patch] Lenient Parameter Validation — `req.query.year` and `month` accept arrays or garbage strings like '2023abc' via `parseInt`. [backend/src/routes/metrics.routes.js]
- [x] [Review][Patch] Invalid Date Validation Gap — `NaN` bypasses the `start > now` check. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Missing Zero-Activity Days — SQL query omits days without messages/sessions, creating gaps in the time-series. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Timezone Mismatch — `DATE(created_at)` uses DB timezone, mismatching the UTC parameters. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Future Months Allowed in UI — Frontend allows selecting future months for the current year. [frontend/src/features/metrics/components/UsageReport.jsx]
- [x] [Review][Patch] Proxy Error Swallowing — `.catch(() => ({}))` on API response hides HTML proxy errors. [frontend/src/features/metrics/metricsService.js]
- [x] [Review][Patch] CSV Header Whitespace — Missing space padding after commas per AC. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Blob Snippet Deviation — Missing explicit `new Blob([data], {type: 'text/csv'})` wrapping. [frontend/src/features/metrics/components/UsageReport.jsx]
- [x] [Review][Defer] "Sesiones Activas" Logic — Only counts sessions created on that day, ignoring ongoing multi-day sessions. — deferred, pre-existing
- [x] [Review][Defer] Unindexed DATE() Joins — `FULL OUTER JOIN` on unindexed DATE derivations isn't scalable. — deferred, pre-existing
- [x] [Review][Defer] Hardcoded 5-year Lookback — UI year dropdown locked to 5 years. — deferred, pre-existing
- [x] [Review][Defer] Brittle CSV Concatenation — Manual string concatenation breaks if text columns are added. — deferred, pre-existing

### Review Findings (Iteración 2)
- [x] [Review][Patch] Broken Regex Validation — Regex rejects zero-padded months ("01"). [backend/src/routes/metrics.routes.js]
- [x] [Review][Patch] Incomplete SQL Timezone Fix — `generate_series` relies on `${start}::date`, ignoring UTC offset. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Corrupted CSV Parsing — Adding whitespace after commas breaks unquoted CSV parsing. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Local Date Shift — `new Date(log_date).toISOString()` shifts time based on server timezone. [backend/src/services/metrics.service.js]
- [x] [Review][Patch] Nested Blob Bug — Wrapping `blob()` in `new Blob()` causes `[object Blob]` downloads. [frontend/src/features/metrics/components/UsageReport.jsx]
- [x] [Review][Patch] Locked Stream Exception — Fetch error handling calls `.text()` after `.json()`, crashing the app. [frontend/src/features/metrics/metricsService.js]
- [x] [Review][Patch] Deferred Work Artifact Errors — Duplicated line and missing paths in `deferred-work.md`.
- [x] [Review][Defer] UI Month Restriction Relies on Local Time — Client TZ might allow selecting future month if they are a day ahead. — deferred, acceptable for MVP


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
