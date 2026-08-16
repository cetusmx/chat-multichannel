# Story 1.2: Client Directory Backend API

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a sales representative,
I want a robust API that serves a paginated and searchable list of clients with their engagement metrics,
so that the frontend directory can quickly display the needed data.

## Acceptance Criteria

1. **Given** a request to the Client List Endpoint
   **When** queried with pagination and optional filters (phoneNumber or cartData.rfc)
   **Then** it returns the paginated list of clients matching the criteria
   **And** each client record includes the computed fields: Last Vendor, Last Purchase Date (from `CLOSED_WON`), and Last Inbound Contact Date (`isOutbound` = false).

## Tasks / Subtasks

- [ ] Create or update the Client List Endpoint logic
  - [ ] Implement pagination: Explicitly cast `page` and `limit` to integers (`parseInt`), calculate `skip` as `(page - 1) * limit`, and add a max cap for `limit` (e.g., 100).
  - [ ] Implement optional filtering logic for `phoneNumber` (partial or exact match)
  - [ ] Implement optional filtering logic for `cartData.rfc` (partial match). **Note:** Prisma does not support `contains` or `mode: insensitive` directly inside JSON filtering. Instruct the dev to use Prisma's `path` syntax (`cartData: { path: ['rfc'], string_contains: query }`) if using PostgreSQL JSONB, or use a safe raw query strictly enforcing `tenantId` isolation.
- [ ] Implement aggregation for computed fields avoiding N+1 problems
  - [ ] Use Prisma's `include` feature on the `clients` table query: `conversations: { orderBy: { lastMessageAt: 'desc' } }`.
  - [ ] From those returned conversations in JavaScript, map over the clients to extract the last vendor, last purchase (`CLOSED_WON`), and last inbound contact (`isOutbound: false`). This avoids N+1 and raw query risks.
- [ ] Ensure Multi-tenant data isolation
  - [ ] Filter clients strictly by the authenticated user's `tenantId`

## Dev Notes

- **Architecture Compliance:** The project uses Node.js, Express 5, and Prisma 6. Multi-tenant isolation MUST be strictly enforced via `tenantId` on all queries.
- **Optimization:** Computing aggregates like Last Purchase Date and Last Inbound Contact Date must be optimized to prevent N+1 query problems. Avoid raw query risks by using Prisma's `include` feature (`conversations: { orderBy: { lastMessageAt: 'desc' } }`) and calculating aggregates in JavaScript.
- **Pagination & Security:** Ensure `page` and `limit` are cast to integers (`parseInt`), limit is capped (max 100), and `skip` is calculated securely as `(page - 1) * limit`.
- **JSON Filtering:** Prisma does not support `contains` or `mode: insensitive` directly inside JSON filtering for `cartData->>'rfc'`. Use Prisma's `path` and `string_contains` if using PostgreSQL JSONB, or use raw SQL enforcing `tenantId` strict isolation for the search.
- **API Standards:** Ensure the API response separates `data` and `meta` (for pagination). Maintain existing project conventions in controllers, services, and routing.
- **Target Files:** Relevant files to touch likely include `src/controllers/client.controller.js`, `src/services/client.service.js`, and `src/routes/client.routes.js`.

### Project Structure Notes

- Follow established backend folder structure.
- Adhere to existing error handling and input validation logic.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/architecture.md]

## Dev Agent Record

### Agent Model Used

Product Planning Agent

### Debug Log References

N/A

### Completion Notes List

- Comprehensive contextual analysis completed. Developer guide generated focusing on multi-tenant isolation (tenantId filtering) and Prisma query optimization to prevent N+1 issues for aggregated fields.

### File List
- _bmad-output/implementation-artifacts/1-2-client-directory-api.md
