---
baseline_commit: 08e5022b7c5ff41f5571a7def3cb2027ba68b75a
---

# Story 3.9: Coordinator Direct Intervention

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to reply directly to a client in a vendor's chat,
So that I can de-escalate complex situations.

## Acceptance Criteria

1. **Given** a conversation assigned to a vendor,
   **When** the Coordinator sends a message,
   **Then** it is sent to the client,
   **And** marked visually in the UI as sent by the Coordinator.

## Tasks / Subtasks

- [x] Task 1: Backend API/Socket for Coordinator Messages
  - [x] Update `prisma/schema.prisma` to add `COORDINATOR` and `ADMIN` to the `SenderType` enum (or add a boolean flag `isIntervention`) to accurately distinguish the sender.
  - [x] Create endpoint or socket event allowing coordinators to post messages to chats assigned to vendors.
  - [x] Add strict RBAC validation to ensure only `COORDINATOR` and `ADMIN` roles can intervene in this manner.
  - [x] Ensure the message payload includes the new `SenderType` or `senderId` to distinguish it from a normal vendor reply.
  - [x] Deliver the message via the WhatsApp API to the client.
- [x] Task 2: Frontend UI for Coordinator Interventions
  - [x] Update Coordinator UI (e.g., `FocusPanel` chat input) to enable typing and sending messages to any active vendor conversation.
  - [x] Visually style messages from the Coordinator distinctively in the chat timeline (e.g., different background color, avatar, or badge) as per UX-DR18.
- [x] Task 3: State Management & Real-time Updates
  - [x] Broadcast the new message via Socket.IO so the vendor currently assigned sees the Coordinator's message appear in real time.
  - [x] Update `useChatStore.js` to handle real-time UI updates for coordinator messages.

## Dev Notes

### Architecture & Guardrails
- **State Management:** Update Zustand state immutably when appending new messages.
- **Styling:** Use React 19 & Tailwind CSS 4. Apply glassmorphism and the Slate/Coral/Orange palette. Ensure visual distinctiveness (UX-DR18) for coordinator intervention.
- **Role Validation:** Must strictly validate roles on the backend before allowing message transmission to ensure vendors cannot masquerade as coordinators.
- **WhatsApp Integration:** The message should flow through the existing WhatsApp delivery pipeline (`whatsapp.service.js`) just like normal replies, but with correct database tracking of the actual sender.

### Known Technical Debt / Previous Learnings
- **Socket Events:** Previous stories had issues with duplicate socket messages or improper room routing. Ensure the broadcast goes to the correct conversation room so both vendor and coordinator receive the update properly.
- **MessageList Re-renders:** Ensure `MessageList.jsx` handles memoization properly when appending new messages from coordinators.
- **Optimistic Updates:** If updating UI optimistically, ensure generated IDs are handled carefully until DB confirmation.

### File Structure Requirements
- `backend/src/routes/message.routes.js` (UPDATE)
- `backend/src/controllers/message.controller.js` (UPDATE)
- `backend/src/services/whatsapp.service.js` (UPDATE)
- `backend/src/socket.js` (UPDATE)
- `frontend/src/features/chat/components/FocusPanel.jsx` or `MessageList.jsx` (UPDATE)
- `frontend/src/features/chat/components/MessageInput.jsx` (UPDATE)
- `frontend/src/stores/useChatStore.js` (UPDATE)

### Project Structure Notes
- Component boundaries strictly follow the `/features/chat/components` domain-driven structure.
- State is managed via Zustand `useChatStore.js`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic_3]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional_Requirements] (FR26)
- [Source: _bmad-output/planning-artifacts/prd.md#UX_Design_Requirements] (UX-DR18)

## Dev Agent Record

### Agent Model Used
Antigravity 2.0 (Amelia)

### Debug Log References
- Checked Prisma schema changes via `npx prisma generate`

### Completion Notes List
- Added `COORDINATOR` and `ADMIN` to `SenderType` enum in `schema.prisma`.
- Updated `chat.routes.js` to correctly capture and pass the `req.user.role` to `whatsapp.service.js`.
- Modified `whatsapp.service.js` methods (`sendMessage`, `sendMedia`) to accept `senderType` and store the specific role instead of hardcoding `VENDOR` or `SYSTEM`.
- Updated `MessageList.jsx` to render Coordinator messages visually distinct using a glassmorphism style and the `coral` palette as specified in UX-DR18.
- Updated optimistic update payload in `useChatStore.js` and `FocusPanel.jsx` to capture `useAuthStore.getState().user?.role` accurately avoiding UI jumps.
- Real-time broadcasts already correctly reached both Coordinators and Vendors via the existing socket infrastructure.

### File List
- `backend/prisma/schema.prisma`
- `backend/src/routes/chat.routes.js`
- `backend/src/services/whatsapp.service.js`
- `frontend/src/features/chat/components/FocusPanel.jsx`
- `frontend/src/features/chat/components/MessageList.jsx`
- `frontend/src/stores/useChatStore.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings
- [x] [Review][Patch] ADMIN role blocked from sending internal notes [backend/src/routes/chat.routes.js, frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Missing deduplication for optimistic updates and media uploads causes duplicate messages in dual view [frontend/src/features/chat/components/FocusPanel.jsx]
- [ ] [Review][Defer] Orphaned `senderId` relations lacking DB referential integrity [backend/prisma/schema.prisma]
- [ ] [Review][Defer] Unrestricted WebSocket room sniffing potential [frontend/src/stores/useChatStore.js]
- [ ] [Review][Defer] Memory lock deadlock risk in clustered environments [backend/src/services/whatsapp.service.js]
