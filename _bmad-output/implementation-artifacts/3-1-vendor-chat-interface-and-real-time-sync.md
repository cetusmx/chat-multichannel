---
baseline_commit: "NO_VCS"
status: "done"
story_id: "3.1"
title: "Vendor Chat Interface & Real-time Sync"
epic: "Epic 3: Conversation Management"
created_at: "2026-07-04"
---

# Story 3.1: Vendor Chat Interface & Real-time Sync

## 📖 Story Requirements

**User Story:**
As a Vendor,
I want to see my assigned conversations updating in real-time,
So that I can reply instantly to clients.

**Acceptance Criteria:**
- **Given** the chat dashboard (UX-DR2),
- **When** a new message arrives,
- **Then** Socket.IO pushes the update,
- **And** the UI reflects the new message without reloading (response < 3s).

**Business Value & Context:**
Real-time sync is crucial for the primary functionality of the app. Without instantaneous updates, vendors will experience message delays and collisions, hurting the overall customer experience and responsiveness SLAs.

## 🛠 Developer Context & Guardrails

### Current State vs. What Changes
Currently, Epic 2 implemented the WhatsApp webhook processing and media sending. The backend already emits `new_message` to a room `conversation:${id}` via `socketService`. 
In the frontend, `useChatStore.js` already has basic socket connection logic and emits `join:conversation`, but the UI layout for the Vendor (Sidebar + Chat Area) needs to be firmly established and styled according to the UX design requirements (UX-DR2: Fixed non-collapsible sidebar with icons + text).

### Files Expected to be Modified
- `frontend/src/features/chat/components/ChatLayout.jsx` (or similar) - Ensure proper sidebar structure and chat routing.
- `frontend/src/stores/useChatStore.js` - Verify that `socket.on('new_message')` and `socket.on('conversation_updated')` correctly update the global Zustand state.
- `backend/src/services/socket.service.js` - Ensure the server-side rooms and events strictly match the frontend expectations.

### What Must Be Preserved
- The Epic 2 media attachment logic and UI (DO NOT break `MessageList.jsx` media features or the `SecureMedia` component).
- The `fetchFormData` and cancelable `AbortController` implementation in file uploads.
- Ensure the socket connection utilizes the `useAuthStore` token for authentication on handshake.

## 🏗 Architecture & Stack Compliance

- **Frontend Stack:** React 19, Vite 8, Tailwind 4, Zustand.
- **Backend Stack:** Node.js, Express 5, Prisma 6, Socket.IO.
- **Pattern:** Use Zustand for chat/real-time state (`useChatStore.js`).
- **Socket Pattern:** Namespaces: `/chat`. Event naming: `message:new` (if adopting the ADR pattern) or match the existing `new_message` if already established. Make sure to adhere to `{ type, payload, timestamp, correlationId }` payload patterns where applicable.

## 🧠 Previous Story Intelligence (Learnings from Epic 2)

- **Strict Validation:** Meta API is extremely strict. In Epic 2, we learned that sending unverified Mime Types (like `audio/webm` with captions) crashes the API. Keep strict validations in place for any new message types.
- **Race Conditions:** In `whatsapp.service.js`, we used Promise-based locks. If dealing with asynchronous real-time events on the frontend (like receiving a socket event while a fetch request is pending), ensure state isn't duplicated or overwritten. Optimistic updates must be reconciled carefully with server payloads.
- **Error Handling:** Backend operations should not block the Node event loop. Avoid synchronous `fs` methods. 

## 📝 Subtasks / Checklist for Dev Agent

- [x] Implement robust Socket.IO connection handling in `useChatStore.js` (auto-reconnect, token refresh handling).
- [x] Implement the `message:new` / `new_message` listener to dynamically append incoming messages to the active conversation state.
- [x] Build the Vendor layout sidebar (UX-DR2) ensuring it is fixed and non-collapsible.
- [x] Implement the conversation list in the sidebar that updates immediately when new messages arrive.
- [x] Verify that real-time sync pushes updates in under 3s.
- [x] Ensure optimistic updates on the client side reconcile correctly with socket echo messages (avoid duplicate message rendering).

### Review Findings
- [x] [Review][Patch] Missing `conversation_updated` Socket Listener [`useChatStore.js`]
- [x] [Review][Patch] Inefficient Pull-based Update / DDoS risk on `new_message` triggering full `fetchConversations()` [`useChatStore.js`]
- [x] [Review][Patch] False Optimistic Update Implementation (awaits HTTP before state update) [`useChatStore.js`]
- [x] [Review][Patch] Missing Error Handling and `res.ok` checks across HTTP methods leading to silent failures [`useChatStore.js`]
- [x] [Review][Patch] Missing safe access checks for `data.data` / `newMsg.data` causing TypeErrors [`useChatStore.js`]
- [x] [Review][Patch] Flawed media upload debounce lock preventing same-file uploads and clearing loading state prematurely [`useChatStore.js`]
- [x] [Review][Defer] `SOCKET_URL` hacky origin check [`useChatStore.js`] — deferred, pre-existing / MVP acceptable
- [x] [Review][Defer] Non-compliant Socket Payload Pattern [`useChatStore.js`] — deferred, backend emits raw record currently
- [x] [Review][Defer] Improper socket auth mutation on `connect_error` [`useChatStore.js`] — deferred, functional workaround for v4

## 🧑‍💻 Dev Agent Record
- Added robust socket event listeners (connect_error, disconnect) in `useChatStore.js`.
- Expanded the layout sidebar in `Sidebar.jsx` to be fixed `w-64` with icons and text visible.
- Reused and validated existing `new_message` handler and `fetchConversations` dispatch for immediate UI updates.
- Added tests for Socket functionality and Sidebar layout using Vitest + React Testing Library.

## 📂 File List
- `frontend/src/stores/useChatStore.js`
- `frontend/src/stores/useChatStore.test.js`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Sidebar.test.jsx`
- `frontend/package.json`

## 📋 Change Log
- Refactored `Sidebar.jsx` to be non-collapsible width matching UX-DR2.
- Hardened socket reconnection strategy in `useChatStore.js`.
- Setup frontend unit testing framework and tests for robust state verification.

---
**Status Note:** Ultimate context engine analysis completed - comprehensive developer guide created. Ready for dev implementation.
