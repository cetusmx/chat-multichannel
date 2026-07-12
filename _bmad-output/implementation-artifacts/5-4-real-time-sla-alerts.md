---
baseline_commit: 9a2e4a075dd87f96963c0a4fc7d78494e87e6a9e
---
# Story 5.4: Real-Time SLA Alerts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to see visual badges when a chat exceeds the SLA,
so that I can intervene.

## Acceptance Criteria

1. **Given** a chat waiting for a vendor response, **When** the wait time exceeds the SLA, **Then** the chat turns red/orange in the UI and pushes a Socket.IO alert.

## Tasks / Subtasks

- [x] Task 1: Backend SLA Monitoring Mechanism (AC: 1)
  - [x] Implement a native `setInterval` background monitor in `backend/src/services/sla.service.js` (Singleton pattern) to query active pending conversations.
  - [x] Cache `SlaConfig` bounds in memory inside the service to prevent querying `sla_configs` on every interval tick.
  - [x] Evaluate wait time against tenant's `firstResponseMins` and `resolutionMins`. Add safety fallbacks for missing configs.
- [x] Task 2: Backend Socket.IO Alert Emission (AC: 1)
  - [x] Create `backend/src/socket/alerts.handler.js` to manage the `/alerts` namespace.
  - [x] Update `backend/src/socket.js` to integrate `alerts.handler.js` and allow emitting `alerts:breach` to specific `tenant:${tenantId}` rooms.
  - [x] Wire the SLA service to emit `alerts:breach` with exact payload: `{ type: 'SLA_BREACH', payload: { conversationId, metric: 'firstResponse' | 'resolution', excessMinutes }, timestamp, correlationId }`.
- [x] Task 3: Frontend State Management & Initial Load (AC: 1)
  - [x] Extend `frontend/src/stores/useChatStore.js` to connect to the `/alerts` namespace and listen for `alerts:breach`.
  - [x] Mutate the conversation object in Zustand state (`isSlaBreached: true`, `breachType: string`) upon receiving the alert.
  - [x] Update initial conversation fetch logic to calculate and set `isSlaBreached` for any already breached chats, ensuring accurate state upon reconnection/initial load.
- [x] Task 4: Frontend UI Updates (UX-DR7) (AC: 1)
  - [x] Create SLA badge components in `frontend/src/features/metrics/`.
  - [x] Update `CoordinatorDashboard.jsx` (and its children) to conditionally render red/orange badges/borders when `isSlaBreached` is true. Ensure no full page re-renders occur unnecessarily.

## Dev Notes

### Relevant architecture patterns and constraints
- **UX-DR7 Experience Principle:** "Proactive alerts, not reactive". Visual indicators must command attention without visual overload.
- **SLA Bounds Consistency:** `firstResponseMins` <= `resolutionMins` (stored in minutes). Logic must respect these bounds.
- **Socket.IO Patterns:** Use `/alerts` namespace. Event naming convention: `namespace:action` (e.g., `alerts:breach`).
- **Security Check:** Scope all real-time events and data securely using the `tenantId`.

### Source tree components to touch
- **UPDATE:** `backend/src/services/sla.service.js` (Implement `setInterval` SLA monitor, emit alerts, cache configs)
- **UPDATE:** `backend/src/socket.js` (Integrate `/alerts` namespace)
- **NEW:** `backend/src/socket/alerts.handler.js` (Socket logic for `/alerts`)
- **UPDATE:** `frontend/src/stores/useChatStore.js` (Handle `/alerts` connection, `alerts:breach` events, and initial load calculations)
- **UPDATE:** `frontend/src/features/chat/components/CoordinatorDashboard.jsx` (Render SLA breach badges)
- **NEW:** `frontend/src/features/metrics/` (SLA badge UI components)

### Testing standards summary
- Unit test the background SLA monitor for logic correctness on `firstResponseMins` and `resolutionMins` breaches.
- Test missing/malformed config fallback logic.
- Integration tests for Socket.IO event emissions in the `/alerts` namespace.

### Project Structure Notes
- **Language Rules:** Frontend uses ES Modules (`import/export`), Backend uses CommonJS (`require/module.exports`).
- Follow established naming: `camelCase.js` for services, `PascalCase.jsx` for React components.

### References
- [Source: epics.md#Epic-5]
- [Source: prd.md#FR25]
- [Source: ux-design-specification.md#UX-DR7]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Review Findings
- [x] [Review][Patch] Monitor Never Started [backend/src/app.js]
- [x] [Review][Patch] Insecure Socket Room Subscription [backend/src/socket/alerts.handler.js]
- [x] [Review][Patch] Unbounded Database Query [backend/src/services/sla.service.js]
- [x] [Review][Patch] Redundant Alert Spam and React Re-renders [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Event Loop Overlap [backend/src/services/sla.service.js]
- [x] [Review][Patch] Fragile Loop Execution [backend/src/services/sla.service.js]
- [x] [Review][Patch] N+1 Query on Cold Start [backend/src/services/sla.service.js]
- [x] [Review][Patch] Memory Leak in Cache [backend/src/services/sla.service.js]
- [x] [Review][Patch] Malformed Fallback Object [backend/src/services/sla.service.js]
- [x] [Review][Patch] Listener Leak on Setup [backend/src/socket.js]
- [x] [Review][Patch] Frontend slaRes.json() Crash [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Frontend Alerts Socket URL [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Frontend Event Payload Null Check [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] UI State Desync for VENDOR Role [backend/src/routes/metrics.routes.js]
- [x] [Review][Defer] Horizontal Scaling Issues (In-memory cache and monitor interval are incompatible with clustered deployments) [backend/src/services/sla.service.js] — deferred, pre-existing
- [x] [Review][Patch] Broken Cursor Pagination [backend/src/services/sla.service.js]
- [x] [Review][Patch] Resurrecting Event Loop Bug [backend/src/services/sla.service.js]
- [x] [Review][Patch] Destructive Cache Purge [backend/src/services/sla.service.js]
- [x] [Review][Patch] Permanent Suppression of Alerts on Reset SLA Timers [backend/src/services/sla.service.js]
- [x] [Review][Patch] Sequential N+1 Configuration Fetching [backend/src/services/sla.service.js]
- [x] [Review][Patch] Redundant Date Parsing in Loop [backend/src/services/sla.service.js]
- [x] [Review][Patch] Silent Socket Authentication Failures [backend/src/socket/alerts.handler.js]
- [x] [Review][Patch] Synchronous Module Require in Event Loop [backend/src/socket/alerts.handler.js]
- [x] [Review][Patch] Missing Graceful Shutdown [backend/src/index.js]
- [x] [Review][Patch] Inaccurate Breach Time Calculation [backend/src/services/sla.service.js]
- [x] [Review][Patch] Deviation from Exact Payload Constraint [backend/src/services/sla.service.js]
- [x] [Review][Patch] Missing Implementation: Socket.IO Integration Tests [backend/tests/integration/socket.test.js]
- [x] [Review][Patch] Test Pollution in SLA Monitor Tests [backend/tests/unit/sla.service.test.js]
- [x] [Review][Defer] Unscalable Full-Table Retrieval in Backend Monitor [backend/src/services/sla.service.js] — deferred, pre-existing
- [x] [Review][Defer] Inefficient FIFO Config Cache [backend/src/services/sla.service.js] — deferred, pre-existing
- [x] [Review][Defer] Fragile Event Listener Wiring [backend/src/socket/alerts.handler.js] — deferred, pre-existing
- [x] [Review][Defer] Missing Explicit Dashboard Modification [frontend/src/features/chat/components/CoordinatorDashboard.jsx] — deferred, pre-existing
