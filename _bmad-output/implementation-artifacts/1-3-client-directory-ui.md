# Story 1.3: Client Directory Frontend UI

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to view and manage a directory of clients via a frontend UI,
so that I can easily search, paginate, and track client interactions and purchases.

## Acceptance Criteria

1. The UI must consume the `GET /api/clients?page=1&limit=10&phoneNumber=...&rfc=...` endpoint to fetch client data using standard server-state fetching. It must handle `isLoading` (display a skeleton or spinner initially, but when re-fetching data due to search/pagination, keep previous data visible and show a localized loading indicator like reduced opacity or a spinner overlay to prevent jarring layout shifts), `isError` (toast notification or inline error message), and `isEmpty` (a nice graphic or message when 0 results are returned).
2. The UI must display a responsive data table (`overflow-x-auto` on mobile viewports) with the exact columns: Name, Phone Number, RFC, Last Inbound Contact, Last Purchase, and Last Vendor. Time-based columns ("Last Inbound Contact", "Last Purchase") must be formatted nicely in the user's local timezone (e.g. `DD/MM/YYYY HH:mm` or relative time like "2 hours ago").
3. The UI must include a search functionality allowing searches by `phoneNumber` and `RFC`. There must be TWO distinct search input fields: one for RFC and one for Phone Number. This search MUST implement a 500ms debounce to prevent network spam.
4. The UI must support data pagination. Whenever search filters (RFC or phone) change, the pagination `page` MUST be reset to 1.

## Tasks / Subtasks

- [ ] Create Client Directory UI Component (AC: 1, 2)
  - [ ] Scaffold the main React component.
  - [ ] Implement data fetching logic consuming `GET /api/clients`. Explicitly map over `response.data.data` for the table rows and use `response.data.meta` for pagination controls.
- [ ] Implement Data Table (AC: 2)
  - [ ] Render exact columns: Name, Phone Number, RFC, Last Inbound Contact, Last Purchase, Last Vendor. All table cells MUST use a fallback value (e.g., "N/A" or "-") for nullable fields like "Last Purchase" or "RFC" to prevent rendering crashes.
  - [ ] Format time-based columns in the user's local timezone. Mandate the use of native `Intl.DateTimeFormat` for dates to prevent pulling in libraries like `date-fns`.
  - [ ] Implement horizontal scrolling (`overflow-x-auto`) for mobile responsiveness. Mandate the use of the `whitespace-nowrap` class on `<td>` and `<th>` elements to preserve the layout on mobile.
- [ ] Implement Search functionality (AC: 3)
  - [ ] Add TWO distinct search input UI elements (one for RFC and one for Phone Number) with a 500ms debounce. Debounce the *value* (`debouncedSearchTerm`) rather than the `onChange` handler to prevent input lag. Create a custom `useDebounce` hook in `frontend/src/hooks/useDebounce.js` (or use an existing one if it exists) rather than installing third-party packages like `lodash`.
  - [ ] Implement filtering logic based on `phoneNumber` and `RFC`.
- [ ] Implement Pagination (AC: 4)
  - [ ] Add pagination UI controls. Mandate disabling the "Previous" button when `page === 1` and disabling "Next" when `page >= response.data.meta.totalPages`.
  - [ ] Integrate pagination logic with the API and data table.
  - [ ] Reset page to 1 when search filters change.
- [ ] Handle Async UI States (AC: 1)
  - [ ] Render `isLoading` state (spinner/skeleton initially; localized overlay/opacity when re-fetching data due to search/pagination to avoid unmounting the table and causing layout shifts). Explicitly distinguish between `isInitialLoad` (showing a skeleton) and `isRefetching` (showing a localized overlay) using logic like `(isLoading && !clients.length)` vs `(isLoading && clients.length > 0)`.
  - [ ] Render `isError` state.
  - [ ] Render `isEmpty` state (0 results). Provide a "Clear Filters" button if search fields are populated.

## Dev Notes

- Follow the existing Vite/React frontend architecture patterns.
- Use standard TailwindCSS for styling to achieve the Glassmorphism + Gradients aesthetic (Coral/Orange UI). Avoid importing any unapproved third-party UI libraries like Shadcn if not already present. Explicitly use `bg-white/10 backdrop-blur-md border border-white/20` for glass containers, and `bg-gradient-to-r from-orange-400 to-rose-400` for primary accents/buttons.
- Use a standard `useEffect` hook to fetch from `/api/clients` using `axios`, since the project does not have React Query installed. The `useEffect` hook MUST use an `AbortController` to cancel stale requests and prevent race conditions. You MUST catch and suppress the `AbortError` (e.g., using `axios.isCancel(error)`) so it does not trigger the `isError` UI state when requests are cancelled.

### Project Structure Notes

- File path: `frontend/src/features/clients/components/ClientDirectory.jsx`.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 1.3]
- [Source: superadmin-saas-prd.md#Client Directory UI]
- [Source: _bmad-output/implementation-artifacts/1-2-client-directory-api.md#API Response]

## Dev Agent Record

### Agent Model Used

[Leave blank for Dev Agent]

### Debug Log References

[Leave blank for Dev Agent]

### Completion Notes List

[Leave blank for Dev Agent]

### File List

[Leave blank for Dev Agent]
