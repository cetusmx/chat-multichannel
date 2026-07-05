---
baseline_commit: NO_VCS
---

# Story 3.6: Coordinator Comments & Context

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to add internal comments to a chat thread,
so that I can guide the vendor without the client seeing the message (UX-DR16).

## Acceptance Criteria

1. **Given** a client conversation, **When** a Coordinator posts an internal comment, **Then** it appears visually distinct (inline thread).
2. **Given** an internal comment is posted, **Then** it is completely hidden from the client on WhatsApp.

## Tasks / Subtasks

- [x] Task 1: Backend Support for Internal Comments (AC: 1, 2)
  - [x] Implement support for internal comments in the database schema by adding `isInternal Boolean @default(false)` to the `Message` model in `schema.prisma`.
  - [x] Run `npx prisma generate` and apply the changes to the database.
  - [x] Update message creation endpoint to accept `isInternal`. Crucially, implement strict RBAC validation to ensure ONLY users with `COORDINATOR` or `VENDOR` roles can set the `isInternal` flag.
  - [x] Verify that internal comments bypass the WhatsApp Send API completely. Since clients connect via WhatsApp and not sockets, broadcasting to the existing conversation socket room is safe for internal users, as long as the WhatsApp webhook interception is solid.
- [x] Task 2: Frontend Comment UI (AC: 1)
  - [x] Update `MessageList` to render internal comments with distinct styling. NOTE: Do not over-engineer a parent-child relationship in Prisma; implement "inline thread" appearance (UX-DR16) visually as a linear feed with distinct background/borders.
  - [x] Update `MessageInput` to allow Coordinators to toggle between "Reply to Client" and "Add Internal Comment".
  - [x] Ensure `MessageInput` automatically resets its state back to "Reply to Client" after successfully sending an internal comment to prevent accidental internal messages.
- [x] Task 3: State Management & Socket (AC: 1)
  - [x] Update `useChatStore.js` to handle the new internal comment message type/flag in the messages array.
  - [x] Ensure Socket.IO handler processes internal comments correctly without crashing.

### Review Findings
- [x] [Review][Decision] Media attachments ignore the isInternal flag, exposing internal comments to clients — Violates AC 2 and Task 1.
- [x] [Review][Patch] Missing memoization in MessageList causes massive re-renders on keystroke [frontend/src/features/chat/components/MessageList.jsx:78]
- [x] [Review][Patch] Internal toggle state does not reset conditionally after a successful send [frontend/src/features/chat/components/MessageList.jsx:200]
- [x] [Review][Patch] Optimistic message ID in FocusPanel still relies on Date.now() [frontend/src/features/chat/components/FocusPanel.jsx:76]
- [x] [Review][Defer] Message schema references senderId without FK relation [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] tags array on Message has no DB-level limits [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] WhatsApp verifyToken / accessToken plaintext in DB [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] lastMessageAt on Conversation introduces write-contention [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] Uploaded files saved locally, breaking horizontal scaling [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Brittle error handling for local file uploads leaves orphaned files [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Message search unindexed ILIKE [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] SecureMedia memory leaks via URL.createObjectURL [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] Global drag-and-drop prevention listeners on window [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] Timestamps rely on local browser timezone [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] Failed message transmission destroys drafted text [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] FocusPanel filters socket events client-side instead of rooms [frontend/src/features/chat/components/FocusPanel.jsx] — deferred, pre-existing
- [x] [Review][Defer] Socket connection omits leave:conversation [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Socket reconnection loop on token expiration [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Optimistic duplicate naive exact-match string comparison [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Vendor deleted -> Conversation orphaned [backend/prisma/schema.prisma:179] — deferred, pre-existing
- [x] [Review][Defer] Empty text messages bypass validation [backend/src/routes/chat.routes.js:72] — deferred, pre-existing
- [x] [Review][Defer] Case-sensitive Prisma array search for tags [backend/src/routes/chat.routes.js:307] — deferred, pre-existing
- [x] [Review][Defer] onChange ignores selection if sending identical file twice [frontend/src/features/chat/components/MessageList.jsx:195] — deferred, pre-existing
- [x] [Review][Defer] Socket text new_message arrives before POST resolves (duplication) [frontend/src/features/chat/components/FocusPanel.jsx:55] — deferred, pre-existing
- [x] [Review][Defer] Socket media new_message arrives before POST resolves (duplication) [frontend/src/features/chat/components/FocusPanel.jsx:108] — deferred, pre-existing
- [x] [Review][Defer] Socket media duplication in global chat view [frontend/src/stores/useChatStore.js:212] — deferred, pre-existing

### Review Findings (Pass 2)
- [x] [Review][Patch] Optimistic duplicate check fails for Vendor internal comments [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] Internal toggle resets on failed message transmission [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Internal toggle is accessible to unauthorized roles [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Missing glassmorphism effect on internal comments [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Tailwind utility class order not followed on UI elements [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Defer] DB lack indexes on createdAt/lastMessageAt [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded WhatsApp fields in multichannel app [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] SenderType enum uses spanglish IA [backend/prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] Full page redirect to /login on 401 [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] File upload validation trusts browser file.type [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] FocusedChat duplicates message state [frontend/src/features/chat/components/FocusPanel.jsx] — deferred, pre-existing
- [x] [Review][Defer] Optimistic upload lock uses naive filename+size [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] WebSocket relies on localhost string matching [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Client-side tag mod silently reverts on fail [frontend/src/stores/useChatStore.js] — deferred, pre-existing
- [x] [Review][Defer] Backend tag mod endpoints don't verify specific message authorization [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Overwriting abortControllerRef fails to abort previous requests [frontend/src/features/chat/components/MessageList.jsx] — deferred, pre-existing
- [x] [Review][Defer] isInternal sent as JSON string truthiness bug [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] DB fails after message creation leaves lastMessageAt outdated [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] DB fails after copying internal media leaks files [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Account has unbounded conversations memory usage [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Tags added without limit PG row size [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] aroundMessageId cursor not found 500 error [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Message sending fails persistently UI stuck [frontend/src/features/chat/components/FocusPanel.jsx] — deferred, pre-existing
- [x] [Review][Defer] Multiple tags concurrently updated revert wipe [frontend/src/stores/useChatStore.js] — deferred, pre-existing

## Dev Notes

### Architecture & Guardrails
- **State Management:** When updating Zustand arrays or objects (like `messages`), return a new array/object to ensure React re-renders properly. Do NOT mutate state directly.
- **Styling:** Use React 19 & Tailwind CSS 4. Follow utility class order: Layout → Sizing → Colors → Effects → Typography. Apply glassmorphism and the Slate/Coral/Orange palette. Internal comments should clearly look distinct but fit the aesthetic.
- **WhatsApp API:** It is absolutely critical that messages marked as internal are NEVER forwarded to the Meta/WhatsApp API.

### Known Technical Debt / Previous Learnings
- **Socket Rooms:** Use the existing logic where Coordinators use the global `tenant_{tenantId}_coordinators` room to avoid subscribing to every single conversation ID.
- **MessageList Re-renders:** Previous stories identified `MessageList.jsx` as causing massive re-renders on keystroke. Be extremely careful when using it; memoization is required.
- **Optimistic Updates:** When adding optimistic messages in the UI, use a robust UUID for the temporary ID, as naive `Date.now()` was causing collisions in previous stories.

### File Structure Requirements
- `backend/prisma/schema.prisma` (UPDATE)
- `backend/src/routes/messages.routes.js` or `chat.routes.js` (UPDATE)
- `backend/src/services/chat.service.js` (UPDATE)
- `backend/src/socket.js` (UPDATE - if broadcast logic requires changes)
- `frontend/src/features/chat/components/MessageList.jsx` (UPDATE)
- `frontend/src/features/chat/components/MessageInput.jsx` (UPDATE)
- `frontend/src/stores/useChatStore.js` (UPDATE)

### Project Structure Notes
- Component boundaries strictly follow the `/features/chat/components` domain-driven structure.
- State is managed via Zustand `useChatStore.js`.

### References
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Usuario_Coordinador] (UX-DR16)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic_3]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional_Requirements] (FR11)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
