---
baseline_commit: NO_VCS
---

# Story 3.2: Complete Conversation History

## 📖 Story
As a Vendor,
I want to scroll back and see the entire history with a client,
So that I understand the full context of their case.

## 🎯 Acceptance Criteria
- **Given** a chat window, **when** I scroll up, **then** the system loads older messages with infinite scroll.
- **Given** a large chat history, **when** paginating, **then** 100% history persistence is guaranteed.
- **Given** pagination, **when** messages are loaded, **then** the user's scroll position is maintained (no jumping).

---

## 📋 Tasks/Subtasks

- [x] **1. Backend - Implement Cursor-based Pagination for Messages**
  - Update `GET /api/chat/:conversationId/messages` in `backend/src/routes/chat.routes.js` to accept `cursor` and `limit` query parameters.
  - Implement Prisma cursor-based pagination (using the message ID or createdAt as cursor).
  - Return pagination metadata (e.g. `nextCursor`, `hasMore`).
  - Write/update tests for the pagination endpoint.

- [x] **2. Frontend - Update Chat Store for Pagination**
  - Update `useChatStore.js` `fetchMessages(conversationId)` to accept a `cursor`.
  - Add `loadMoreMessages(conversationId)` function to the store to handle fetching older messages.
  - Track `hasMore` and `nextCursor` state per conversation in the store.
  - Ensure older messages are prepended to the array without duplicating existing messages.

- [x] **3. Frontend - Implement Infinite Scroll in Chat Interface**
  - Use `IntersectionObserver` or a scroll event listener in the chat window to detect when the user scrolls near the top.
  - When triggered, call `loadMoreMessages()` from the store.
  - Ensure the scroll position is maintained after prepending older messages so the UI doesn't jump unexpectedly.
  - Show a loading indicator (spinner) at the top of the chat area while `isLoadingMore` is true.

---

## 🧠 Dev Notes

### Architecture & Guardrails
- **Backend Pagination Strategy:** Use cursor-based pagination with Prisma (`take`, `skip: 1`, `cursor`). The cursor should be the ID of the oldest message currently loaded on the frontend.
- **Frontend Scroll Restoration:** When prepending elements to a scrollable container, the browser might lose the scroll position relative to the content. You may need to measure the `scrollHeight` before adding items and adjust `scrollTop` after the DOM updates.
- **State Management:** In `useChatStore`, ensure that `messages` are updated immutably and that deduplication logic handles overlapping messages safely. Update the `fetchMessages` logic so that the initial load fetches the most recent messages (e.g. last 50) and returns them in chronological order.
- **UI UX:** Follow UX-DR2. The loader should be subtle, perhaps a spinner at the top of the message list.

### Known Technical Debt / Previous Learnings
- **Socket vs REST:** Remember that while scrolling up uses the REST API for historical messages, Socket.IO continues to push new messages to the bottom. Ensure the store handles both simultaneously without race conditions.
- **Initial Load Order:** Prisma pagination typically returns items in descending order if you start from the latest. You must reverse the array before returning it to the frontend or before rendering so that the oldest message is at the top.

---

## 🧑‍💻 Dev Agent Record
- **Debug Log:** 
- **Completion Notes:** 

---

## 📁 File List
*(Agent will populate this list with files modified/created)*

---

## 📝 Change Log
*(Agent will summarize changes here)*

---

## 📊 Status
- **Phase:** done

---

### Review Findings

- [x] [Review][Patch] Limit parameter without maximum boundary [backend/src/routes/chat.routes.js:144]
- [x] [Review][Patch] Non-deterministic Pagination Ordering Edge Case (missing secondary sort) [backend/src/routes/chat.routes.js:150]
- [x] [Review][Patch] UI Jump during Pagination (useEffect instead of useLayoutEffect) [frontend/src/features/chat/components/MessageList.jsx:144]
- [x] [Review][Patch] Global dragover event hijacking without scoping [frontend/src/features/chat/components/MessageList.jsx:95]
- [x] [Review][Patch] crypto.randomUUID() crash in non-secure HTTP environments [frontend/src/stores/useChatStore.js:115]
- [x] [Review][Patch] Missing abort controllers for rapid fetch calls (Self-DDoS) [frontend/src/stores/useChatStore.js:265]
- [x] [Review][Defer] Blocking I/O during directory creation (fs.existsSync) [backend/src/routes/chat.routes.js:10] — deferred, pre-existing
- [x] [Review][Defer] Insecure Math.random() for filenames [backend/src/routes/chat.routes.js:22] — deferred, pre-existing
- [x] [Review][Defer] Missing pagination on GET /conversations [backend/src/routes/chat.routes.js:122] — deferred, pre-existing
- [x] [Review][Defer] Unauthenticated socket configuration [backend/src/socket.js] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded tenant data in integration tests [backend/tests/integration/chat.test.js] — deferred, pre-existing
- [x] [Review][Defer] Internal mutation of socket auth options [frontend/src/stores/useChatStore.js:215] — deferred, pre-existing
- [x] [Review][Defer] In-memory Map for webhook locking [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Missing progressive validation of downloaded bytes [backend/src/services/whatsapp.service.js] — deferred, pre-existing

### Review Findings (Round 2)

- [x] [Review][Patch] PrismaClient instantiated repeatedly in route handlers [backend/src/routes/chat.routes.js:124]
- [x] [Review][Patch] Synchronous fs.unlinkSync blocks event loop [backend/src/routes/chat.routes.js:113]
- [x] [Review][Patch] Pagination state not tracked per conversation [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Function signatures diverge from specified API contracts for pagination [frontend/src/stores/useChatStore.js]
- [x] [Review][Defer] Concurrency for incoming webhooks uses in-memory Map [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Socket.io allows any client to join any room without auth [backend/src/socket.js] — deferred, pre-existing
- [x] [Review][Defer] Websocket explicitly configures CORS origin: '*' [backend/src/socket.js] — deferred, pre-existing
- [x] [Review][Defer] fs, path, mime-types lazy required in loops [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Optimistic update logic fragile on conversation switch [frontend/src/stores/useChatStore.js] — deferred, edge case
- [x] [Review][Defer] ws URL relies on window.location.origin [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] SecureMedia downloads entire file to memory [frontend/src/features/chat/components/MessageList.jsx] — deferred, MVP
- [x] [Review][Defer] sendMessage trusts conversationId without tenant check [backend/src/services/whatsapp.service.js] — deferred, MVP
- [x] [Review][Defer] Webhook re-throws errors causing Meta retry loop [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] POST /messages lacks rigorous validation [backend/src/routes/chat.routes.js] — deferred, MVP

### Review Findings (Round 3)

- [x] [Review][Patch] Unwanted forced scroll to bottom while reading history [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Race condition in scroll restoration causes UI jump [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Defer] Contradictory store design with wiped messages array [frontend/src/stores/useChatStore.js] — deferred, MVP
- [x] [Review][Defer] Global pagination lock restricts concurrent state management [frontend/src/stores/useChatStore.js] — deferred, MVP
- [x] [Review][Defer] Massive IDOR vulnerabilities in chat routes without tenant checks [backend/src/routes/chat.routes.js] — deferred, MVP
- [x] [Review][Defer] Global window namespace collision for timeout variable [frontend/src/stores/useChatStore.js] — deferred, MVP
- [x] [Review][Defer] Hacking internal library state for socket reconnection [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Brutal full-page reloads for auth expiration [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] Predictable and insecure file naming [backend/src/routes/chat.routes.js] — deferred, pre-existing
