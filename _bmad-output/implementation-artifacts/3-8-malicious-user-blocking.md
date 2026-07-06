---
baseline_commit: NO_VCS
---

# Story 3.8: Malicious User Blocking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to block abusive clients,
So that they stop consuming resources.

## Acceptance Criteria

1. **Given** a client's profile, **When** the Coordinator clicks "Block", **Then** incoming messages from that number are ignored, **And** active chats are closed.
2. **Given** a blocked client, **When** the Coordinator clicks "Unblock", **Then** the system removes the block, and the client can send messages normally again.

## Tasks / Subtasks

- [x] Task 1: Backend API for Blocking & Unblocking (AC: 1, 2)
  - [x] Create endpoint `PATCH /api/clients/:id/block` (accepting a boolean `isBlocked`) to update the client's blocked status in the database.
  - [x] Add strict RBAC validation to ensure only `COORDINATOR` and `ADMIN` roles can block/unblock clients.
  - [x] Update webhook handler (e.g., `whatsapp.service.js`) to verify if the sender is blocked. If blocked, ignore the message and return early.
- [x] Task 2: Frontend UI for Blocking (AC: 1, 2)
  - [x] Update Coordinator UI (e.g., `FocusPanel` header) to include a "Block Client" or "Unblock Client" action button depending on their current status.
  - [x] Implement a confirmation modal to prevent accidental blocking or unblocking.
  - [x] Handle the API call with appropriate loading, success, and error states.
- [x] Task 3: State Management & Real-time Updates (AC: 1)
  - [x] Broadcast a Socket.IO event (`client_blocked`) when a client is blocked to notify relevant clients/vendors.
  - [x] Update `useChatStore.js` to handle the `client_blocked` event: automatically close/remove the active chat session from the vendor's view.

## Dev Notes

### Architecture & Guardrails
- **State Management:** When updating Zustand arrays or objects (like active conversations list), return a new array/object to ensure React re-renders properly. Do NOT mutate state directly.
- **Styling:** Use React 19 & Tailwind CSS 4. Follow utility class order: Layout → Sizing → Colors → Effects → Typography. Apply glassmorphism and the Slate/Coral/Orange palette.
- **Performance:** When checking if an incoming WhatsApp webhook message is from a blocked user, ensure this query is efficient (e.g., cached or properly indexed) to avoid latency on the webhook response.

### Known Technical Debt / Previous Learnings
- **MessageList Re-renders:** Be careful when using `MessageList.jsx`; memoization is required.
- **Socket Events:** Previous stories had issues with duplicate socket messages. For blocking, ensure the frontend handles the event idempotently.
- **Role Validation:** Blocking action must strictly validate roles on backend.
- **Optimistic Updates:** When updating UI optimistically, avoid naive ID generation.

### File Structure Requirements
- `backend/src/routes/client.routes.js` (NEW/UPDATE)
- `backend/src/controllers/client.controller.js` (NEW/UPDATE)
- `backend/src/services/whatsapp.service.js` (UPDATE)
- `backend/src/socket.js` (UPDATE - for blocking broadcasts)
- `frontend/src/features/chat/components/FocusPanel.jsx` or similar (UPDATE)
- `frontend/src/stores/useChatStore.js` (UPDATE)

### Project Structure Notes
- Component boundaries strictly follow the `/features/chat/components` domain-driven structure.
- State is managed via Zustand `useChatStore.js`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic_3]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional_Requirements] (FR22)

## Dev Agent Record

### Agent Model Used
gemini-2.5-pro

### Debug Log References
- Successfully created Prisma migration to add `isBlocked` to `Client` model.
- Wrote integration tests for client block endpoint.

### Completion Notes List
- ✅ Implemented `PATCH /api/clients/:id/block` with RBAC (`ADMIN`, `COORDINATOR`).
- ✅ Updated `whatsapp.service.js` to ignore incoming messages from blocked clients.
- ✅ Added `ClientBlockToggle` in `FocusPanel.jsx` with a confirmation modal to prevent accidental blocks/unblocks.
- ✅ Updated `useChatStore.js` to handle `client_blocked` socket event, closing active chats belonging to a blocked client.

### File List
- `backend/prisma/schema.prisma`
- `backend/src/app.js`
- `backend/src/routes/client.routes.js`
- `backend/src/services/whatsapp.service.js`
- `backend/tests/integration/client.test.js`
- `frontend/src/features/chat/components/FocusPanel.jsx`
- `frontend/src/stores/useChatStore.js`

## Change Log
- Added client block/unblock functionality with realtime socket broadcasts.
- Ignored webhook messages for blocked clients.

### Review Findings
- [x] [Review][Patch] Active conversations not closed in DB on block [backend/src/routes/client.routes.js]
- [x] [Review][Patch] Prevent outgoing messages (text & media) to blocked clients [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Blocked chats remain visible in dual Focus Panel view [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Improper utility class order in Tailwind styling [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Patch] socket.io `client_blocked` event broadcast to incorrect room or frontend doesn't join it [backend/src/routes/client.routes.js / frontend]
- [x] [Review][Patch] Prevent redundant block/unblock if state already matches [backend/src/routes/client.routes.js]
- [x] [Review][Patch] Fix misleading copy in unblock confirmation modal [frontend/src/features/chat/components/FocusPanel.jsx]
- [ ] [Review][Defer] Missing audit trail for blocking/unblocking actions
- [ ] [Review][Defer] Webhook spam from blocked numbers causing DB load without Redis cache
- [ ] [Review][Defer] Race condition with media downloads during block
