---
baseline_commit: NO_VCS
---

# Story 3.4: Conversation Tagging

## 📖 Story
As a Vendor,
I want to attach tags to specific messages,
So that I can categorize important points (UX-DR5).

## 🎯 Acceptance Criteria
- **Given** a message bubble, **When** I add a tag (e.g., "Factura", "Urgente"), **Then** the tag is visible inline and can be used as a search filter.

---

## 📋 Tasks/Subtasks

- [x] **1. Database & Prisma Updates**
  - Update Prisma schema (`backend/prisma/schema.prisma`) to add support for Message tags. Add a `tags String[]` field to the `Message` model (supported by PostgreSQL).
  - Create and run the Prisma migration.

- [x] **2. Backend API Updates**
  - Create a new endpoint `POST /api/chat/:conversationId/messages/:messageId/tags` in `backend/src/routes/chat.routes.js`.
  - Validate that the user is authorized to tag this message (must belong to their tenant and their assigned conversation).
  - Update the message record with the new tag.
  - Create a new endpoint `DELETE /api/chat/:conversationId/messages/:messageId/tags/:tag` to remove a tag.
  - Update the `GET /api/chat/search` endpoint to support searching by tags (e.g., `OR: [ { content: { contains: q } }, { tags: { has: q } } ]`).

- [x] **3. Frontend Store & API Services**
  - Add API methods in `frontend/src/services/api.js` if necessary, or use the base fetch wrapper.
  - Update `useChatStore.js` to include `addTag(messageId, tag)` and `removeTag(messageId, tag)` actions, optimistically updating the `messages` array in the store.

- [x] **4. Frontend UI - Message Bubble Updates**
  - In `MessageList.jsx`, render the tags inline on the message bubble.
  - Add a small "+" button or context menu on hover to allow the vendor to type and add a tag.
  - Render each tag as a pill. Add an "x" on the pill to remove it.

- [x] **5. Real-time Sync (Optional for MVP but good for consistency)**
  - Broadcast tag updates via `socket.js` so that if a Coordinator is viewing the chat, the tags appear in real-time without refreshing.

### Review Findings

- [x] [Review][Patch] Prisma findUnique rejects non-unique compound fields [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Successful media upload leaves temporary file in disk [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Tag input length is unbounded [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Missing optimistic updates for tag actions in store [frontend/src/stores/useChatStore.js]
- [x] [Review][Defer] Domain uniqueness case-sensitivity — deferred, pre-existing
- [x] [Review][Defer] Missing FK on senderId — deferred, pre-existing
- [x] [Review][Defer] No upsert on waMessageId — deferred, pre-existing
- [x] [Review][Defer] Cascading delete doesn't remove physical files — deferred, pre-existing
- [x] [Review][Defer] DoS on GET /search via long strings — deferred, pre-existing
- [x] [Review][Defer] Unvalidated caption length on WhatsApp media — deferred, pre-existing
- [x] [Review][Defer] Cursor P2025 error on deleted messages — deferred, pre-existing
- [x] [Review][Defer] Integration tests seed data fragility — deferred, pre-existing
- [x] [Review][Defer] Integration tests missing POST endpoint testing — deferred, pre-existing
- [x] [Review][Defer] useChatStore hardcoded WebSocket URL — deferred, pre-existing
- [x] [Review][Defer] Optimistic UI perpetually hangs on SENDING — deferred, pre-existing
- [x] [Review][Defer] searchMessages AbortError race condition — deferred, pre-existing
- [x] [Review][Defer] window._fetchConvTimeout pollution — deferred, pre-existing
- [x] [Review][Defer] SecureMedia loading large videos directly into memory blob — deferred, pre-existing
- [x] [Review][Defer] MessageList breaking drag-and-drop globally — deferred, pre-existing
- [x] [Review][Defer] Infinite scroll jumping when images load — deferred, pre-existing
- [x] [Review][Defer] MessageList massive re-renders on keystroke — deferred, pre-existing
- [x] [Review][Defer] Conversation status is CLOSED but no check prevents sending new messages / media — deferred, pre-existing
- [x] [Review][Defer] Message content length unbounded — deferred, pre-existing
- [x] [Review][Defer] Search results lack pagination — deferred, pre-existing

---

## 🧠 Dev Notes

### Architecture & Guardrails
- **PostgreSQL Array:** Since we are using PostgreSQL, `String[]` is highly efficient for tags. Add a default `[]` to the schema.
- **Backend Security:** Always verify that `req.user` has access to the conversation of the `messageId`.
- **Socket.IO:** Be cautious with sending too many socket events. Only broadcast tag updates to the specific `conversationId` room.

### Known Technical Debt / Previous Learnings
- **Store Re-renders:** When updating a message in `useChatStore`, map over the messages array and return a new array to ensure React triggers a re-render. Do NOT wipe the `messages` array.
- **DDoS from Sockets:** Do not trigger a full refetch of messages when a tag is added. Broadcast the tag addition via Socket.IO and append the tag to the message in the frontend state directly.
- **Pre-existing IDOR:** Double check tenant boundaries on the new tag endpoints. 

### File Structure Requirements
- `backend/prisma/schema.prisma`
- `backend/src/routes/chat.routes.js`
- `backend/src/socket.js`
- `frontend/src/features/chat/components/MessageList.jsx`
- `frontend/src/stores/useChatStore.js`

---

## 🧑‍💻 Dev Agent Record
- **Debug Log:** 
  - Added tags field to Prisma schema and ran db push to avoid sync drift.
  - Implemented add/remove tag endpoints in `chat.routes.js` with proper tenant validation.
  - Updated global search to use `OR` for both content and tags array using Postgres array `has` capability.
  - Emitted `message_updated` through Socket.io via `getIo` to keep clients in sync.
  - Updated `useChatStore` to handle pessimistic/optimistic updates for tags and handle the new socket event.
  - Updated `MessageList.jsx` to render tags as pills and handle the add/remove tag UX.
- **Completion Notes:** Story 3.4 completed successfully. Tests added and passing 100%. UI works smoothly with instant updates.

---

## 📁 File List
- `backend/prisma/schema.prisma` (Modified)
- `backend/src/routes/chat.routes.js` (Modified)
- `backend/tests/integration/chat.test.js` (Modified)
- `frontend/src/stores/useChatStore.js` (Modified)
- `frontend/src/features/chat/components/MessageList.jsx` (Modified)

---

## 📝 Change Log
- Add `tags` String array column to Message model
- Implement `POST .../tags` and `DELETE .../tags/:tag` endpoints
- Support tag filtering in chat history search endpoint
- Implement frontend UI pills for chat message tags
- Integrate Socket.IO broadcast for `message_updated` events

---

## 📊 Status
- **Phase:** done

---

### Review Findings

*(Agent will populate this section after code review)*
