---
baseline_commit: 9b0884a
---
# Story 4.6: Coordinator Escalation Alerts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to be alerted when the AI escalates a chat,
So that I can ensure it gets handled immediately.

## Acceptance Criteria

1. **Given** an AI handoff event is triggered (e.g., due to complex queries or explicit human request),
2. **When** the backend updates the conversation status to `ESCALATED` and emits the `chat:escalated` event,
3. **Then** the Coordinator dashboard (`DualView.jsx` and `ConversationList.jsx`) shows a high-priority alert badge with an appropriate aria-label.
4. **And** if a coordinator reloads the page, the badge remains visible because the `ESCALATED` status is persisted in the database and included in the initial fetch.
5. **And** when the conversation is assigned to a vendor or intervened by a coordinator, the badge is immediately removed.

## Tasks / Subtasks

- [x] Task 1: Backend Alert Event & Persistence (Backend)
  - [x] Update `backend/src/services/ai.service.js` (and any relevant DB operations) to persist the conversation status as `ESCALATED`.
  - [x] Ensure the REST API for fetching conversations includes the `ESCALATED` status so the UI can hydrate properly on reload.
  - [x] Emit a Socket.IO event when escalation occurs. Event format must strictly follow architecture pattern and namespace: `io.of('/chat').to('coordinators').emit('chat:escalated', { type: 'ESCALATION_ALERT', payload: { conversationId, tenantId, reason: string }, timestamp: new Date().toISOString(), correlationId: uuid() })`
- [x] Task 2: Frontend Alert UI (Frontend)
  - [x] In `frontend/src/features/chat/components/DualView.jsx` and the underlying `ConversationList`, listen for `chat:escalated`.
  - [x] Render a visually distinct, high-priority alert badge (e.g., using Tailwind `bg-red-500 text-white`) on the conversation item. Ensure it has an `aria-label="Chat escalado"` for accessibility.
- [x] Task 3: State Management (Frontend)
  - [x] Update `frontend/src/stores/useChatStore.js` to track `escalated` status per conversation.
  - [x] Ensure the alert badge clears when the conversation status changes by explicitly listening for `chat:assigned` or `chat:resolved` events.
- [x] Task 4: Testing & Validation
  - [x] Add unit/integration tests in `backend/tests/integration/chat.test.js` to ensure the status updates and socket events fire.
  - [x] Add component tests (using React Testing Library if available) for `DualView.jsx` or store tests for `useChatStore` to verify the state transitions.
  - [x] Use `jest.restoreAllMocks()` in `finally` blocks and `jest.clearAllMocks()` in `afterEach` to prevent state leakage (critical lesson from 4.4/4.5).

## Dev Notes

- **AI Service Integration:** Ensure the backend properly emits the necessary socket event when the escalation triggers (see `backend/src/socket.js` for `getIo()`).
- **Data Persistence:** The badge must survive page reloads. The backend MUST update the conversation's `status` to `ESCALATED` in the DB so `apiFetch('/conversations')` can rehydrate the state for newly connected coordinators.
- **Architecture Standard (Socket.IO):** You MUST use the standard payload wrapper: `{ type, payload, timestamp, correlationId }`. Do NOT send naked objects.
- **Testing Standard (State Leakage):** When mocking `aiService` or `socket.io`, ensure cleanup to prevent test state leakage and race conditions.

### Project Structure Notes

- Check/Update `backend/src/services/ai.service.js` or `chat.routes.js` to emit the socket event during escalation on the `/chat` namespace.
- Update `frontend/src/features/chat/components/DualView.jsx` or similar coordinator views to render the badge.
- Update `frontend/src/stores/useChatStore.js` to handle the real-time event.

### Previous Story Intelligence

- **From Story 4.5:** Be careful with React state updates on unmounted components (use `isMountedRef` or `AbortController`). Always clean up socket listeners in `useEffect` to prevent duplicate events or memory leaks. 
- **From Story 4.4:** Ensure that the state leakages in integration tests are handled properly by restoring mocks (`jest.restoreAllMocks()`) and tearing down the database properly.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-AI-Agent--RAG]
- [Source: _bmad/project-context.md]
- [Source: _bmad-output/planning-artifacts/architecture.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Review Findings

- [x] [Review][Decision] Socket Room Target Mismatch — Emitted to `tenant_${tenantId}_coordinators` instead of `coordinators` as stated in the spec. (Multi-tenancy vs strict spec compliance). (Dismissed: Keeping multi-tenant isolation)
- [x] [Review][Patch] Missing listeners for `chat:assigned` and `chat:resolved` in `useChatStore.js` [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Removed existing socket emission to conversation room (`conversation_escalated`) [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] `require('crypto')` placed inside an `if` block instead of top-level [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Fragile hardcoded `setTimeout` in integration tests [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Incomplete database cleanup in test teardown [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Conflicting `flex` and `truncate` classes on the same element [frontend/src/features/chat/components/ChatList.jsx]
- [x] [Review][Patch] Undefined `testTenantId` variable [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Uncaught TypeError if event payload is missing [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Misplaced mock cleanup in tests [backend/tests/integration/chat.test.js]

### Review Findings (Iter 2)

- [x] [Review][Patch] `chat:resolved` incorrectly resets status to `ACTIVE` instead of resolving it [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Missing store tests for `chat:assigned` and `chat:resolved` transitions [frontend/src/stores/useChatStore.test.js]
- [x] [Review][Patch] Database teardown data leak (TypeError in finally block if create fails) [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Redundant inline `require('../socket')` inside try-catch block [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] `updatedConv` can be null before status check in polling loop [backend/tests/integration/chat.test.js]### Review Findings (Iter 3)

- [x] [Review][Decision] UI Component Mismatch (Implemented in ChatList instead of DualView) (Dismissed: ChatList is the correct internal component)
- [x] [Review][Decision] REST API Hydration missing (Dismissed: Prisma `findMany` automatically includes the status column)
- [x] [Review][Patch] `updatedConv?.status` assertion in tests could throw (Dismissed: optional chaining returns undefined, which fails the assertion cleanly)
- [x] [Review][Patch] Test teardown leakage if `deleteMany` throws [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Phantom Status in tests (`chat:resolved` asserts `RESOLVED` instead of `CLOSED`) [frontend/src/stores/useChatStore.test.js]
