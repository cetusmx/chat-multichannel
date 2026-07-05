# Deferred Work

## Deferred from: code review of 3-1-vendor-chat-interface-and-real-time-sync.md (2026-07-04)
- `SOCKET_URL` hacky origin check (`useChatStore.js`) — Relies on window.location.origin.includes('localhost') instead of standard env vars. Acceptable for MVP.
- Non-compliant Socket Payload Pattern (`useChatStore.js`) — new_message listener expects raw msg object instead of { type, payload }. The backend currently emits raw records, so this requires a backend migration first.
- Improper socket auth mutation on `connect_error` (`useChatStore.js`) — Mutates newSocket.io.opts.auth directly instead of standard Socket.IO auth refresh handling. Works in v4, but is hacky.

## Deferred from: code review of 3-2-complete-conversation-history.md (2026-07-04)
- Blocking I/O during directory creation (fs.existsSync) [backend/src/routes/chat.routes.js:10]
- Insecure Math.random() for filenames [backend/src/routes/chat.routes.js:22]
- Missing pagination on GET /conversations [backend/src/routes/chat.routes.js:122]
- Unauthenticated socket configuration [backend/src/socket.js]
- Hardcoded tenant data in integration tests [backend/tests/integration/chat.test.js]
- Internal mutation of socket auth options [frontend/src/stores/useChatStore.js:215]
- In-memory Map for webhook locking [backend/src/services/whatsapp.service.js]
- Sequential non-transactional database calls in webhook [backend/src/services/whatsapp.service.js]
- Missing progressive validation of downloaded bytes [backend/src/services/whatsapp.service.js]

## Deferred from: code review of 3-3-chat-history-search-and-command-palette.md (2026-07-04)
- Pre-existing IDOR vulnerabilities across adjacent chat routes [backend/src/routes/chat.routes.js]
- Upload path hardcoded and Math.random filename generation [backend/src/routes/chat.routes.js]
- Integration tests rely on shared database state (demo.salesflow.app) [backend/tests/integration/chat.test.js:16]
- Missing strict validation for route parameters (conversationId, limit) [backend/src/routes/chat.routes.js]

## Deferred from: code review of 3-3-chat-history-search-and-command-palette.md (2026-07-04 Frontend)
- Prisma contains insensitive performance on large datasets [backend/src/routes/chat.routes.js]
- Search endpoint lacks pagination [backend/src/routes/chat.routes.js]
- fs.mkdirSync blocks event loop [backend/src/routes/chat.routes.js]
- Multer original extension spoofing risk [backend/src/routes/chat.routes.js]
- api.js refreshPromise state corruption / hard reload [frontend/src/services/api.js]
- Store massive re-renders / Optimistic update revert bugs [frontend/src/stores/useChatStore.js]
- Temp files accumulate on upload success [backend/src/routes/chat.routes.js]
- Store Pollution / Unintended Wiping of Messages Array on conversation switch [frontend/src/stores/useChatStore.js]
- Deep fetch implementation lacks pagination for scrolling to newer messages [backend/src/routes/chat.routes.js]
- Socket blindly triggers fetchConversations on every new message (DDoS vector) [frontend/src/stores/useChatStore.js]
## Deferred from: code review of 3-4-conversation-tagging.md (2026-07-05)
- Domain uniqueness case-sensitivity — deferred, pre-existing
- Missing FK on senderId — deferred, pre-existing
- No upsert on waMessageId — deferred, pre-existing
- Cascading delete doesn't remove physical files — deferred, pre-existing
- DoS on GET /search via long strings — deferred, pre-existing
- Unvalidated caption length on WhatsApp media — deferred, pre-existing
- Cursor P2025 error on deleted messages — deferred, pre-existing
- Integration tests seed data fragility — deferred, pre-existing
- Integration tests missing POST endpoint testing — deferred, pre-existing
- useChatStore hardcoded WebSocket URL — deferred, pre-existing
- Optimistic UI perpetually hangs on SENDING — deferred, pre-existing
- searchMessages AbortError race condition — deferred, pre-existing
- window._fetchConvTimeout pollution — deferred, pre-existing
- SecureMedia loading large videos directly into memory blob — deferred, pre-existing
- MessageList breaking drag-and-drop globally — deferred, pre-existing
- Infinite scroll jumping when images load — deferred, pre-existing
- MessageList massive re-renders on keystroke — deferred, pre-existing
- Conversation status is CLOSED but no check prevents sending new messages / media — deferred, pre-existing
- Message content length unbounded — deferred, pre-existing
- Search results lack pagination — deferred, pre-existing

## Deferred from: code review of 3-5-coordinator-dual-view.md (2026-07-05)
- Socket.io lacking auth for join:conversation / join:tenant_coordinators
- WhatsApp service incomingLocks mutex broken
- Double-deletion of temporary media files
- Message search route /chat/search un-paginated
- Updating lastMessageAt outside Prisma transaction
- Meta media download logic validates content-length late
- Media handling suppresses filesystem cleanup errors
- Socket emission errors swept under rug
- Webhook payload missing message.from
- Message type unsupported
- Meta API returns non-ok status for metadata
- Meta JSON lacks media url
- Meta API file empty body
- aroundMessageId cursor does not exist
- Conversation lacks lastMessageAt and createdAt displays Invalid Date
