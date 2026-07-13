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
- Task 1.4: "Write integration tests that ensure endpoints correctly enforce limits for both scenarios" was deferred in story 1.3 since limits apply globally for now, not per-tenant.

## Deferred from: code review (2026-07-08)
- [Frontend] SlaConfigSection fails to implement AbortController — deferred, pre-existing pattern
- [Frontend] Frontend duplicates business defaults for SLA minutes — deferred, minor
- [Backend] Test suite neglects testing Prisma errors — deferred, pre-existing pattern
- [Backend] Global router-level authorization limits scope of metrics routes — deferred, current scope is SLA only
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

## Deferred from: code review of 3-7-client-reassignment-and-history-preservation.md (2026-07-06)
- Concurrent reassignments race condition [backend/src/routes/chat.routes.js] — deferred, pre-existing edge case

## Deferred from: code review of 3-8-malicious-user-blocking.md (2026-07-06)
- Missing audit trail for blocking/unblocking actions
- Webhook spam from blocked numbers causing DB load without Redis cache
- Race condition with media downloads during block


## Deferred from: code review of 4-1-ai-provider-configuration-adapter-pattern.md (2026-07-06)
- Shortsighted AI Configuration Schema: The AiConfig model assumes every AI provider requires a single apiKey string.
- Missing Decryption Error Handling: The decrypt function lacks a try-catch block for malformed ciphertext.
- Naive Chat History Mapping: GeminiProvider.generateResponse assumes strictly alternating user/model history.
- Dead Code in Provider Check: The _getTenantApiKey method contains an empty block for provider mismatch.
- Ignored Database State for Provider Selection: ai.service.js hardcodes the provider to environment variable default rather than DB state.


## Deferred from: code review v2 of 4-1-ai-provider-configuration-adapter-pattern.md (2026-07-06)
- Encryption Key Format Rigidity: The system expects exactly 32 raw string characters for the key.
- Missing Config Deletion Endpoint: There is no way to wipe an AI configuration.
- Forced API Key Re-entry on Update: updateAiConfig strictly requires the apiKey, disallowing partial updates.
- Assumed Last Message Role: generateResponse assumes the last message is always from the user.
- Redundant Primary Key in AiConfig: The id column is unnecessary since tenantId is @unique and effectively a 1-to-1 PK.
- Synchronous Validation Blocks Request: Validating the API key against Google blocks the HTTP response synchronously.
- Interface Method Signature Discrepancies: Method signatures differ slightly from strict spec phrasing due to adapter implementation necessities.

## Deferred from: code review of 4-2-rag-knowledge-base-management.md (2026-07-06)
- Placebo AI Configuration (hardcoded Gemini) [backend/src/services/ai.service.js:12]
- UI Stuck in "Procesando" (No polling) [frontend/src/features/settings/KnowledgeBaseSection.jsx]
- Copy-Paste Error Handling Spaghetti [frontend/src/services/api.js]
- Squashed Database Migration Deviation [backend/prisma/migrations/20260706181027_enable_pgvector/migration.sql]
## Deferred from: code review of 4-3-ai-auto-response-to-new-clients.md (2026-07-06)
- Integration test heavily relies on hardcoded setTimeout [webhook.ai.test.js:10] — deferred, pre-existing
- Global fetch mutated in test without restoration [webhook.ai.test.js:20] — deferred, pre-existing
- Cowboy Circular Dependency Workaround [knowledgeBase.service.js] — deferred, requires architectural refactor

## Deferred from: code review of 4-5-vendor-inline-ai-assistance.md (2026-07-06)
- Prompt Injection Vulnerability — deferred, pre-existing limitation
- Code Duplication — deferred, low priority
- Prompt Length Exceeds Limits — deferred, pre-existing limitation
- UX Edge Case Violation (Blocks Normal Typing for slash commands) — deferred, works as specified

## Deferred from: re-review of 4-5-vendor-inline-ai-assistance.md (2026-07-07)
- UX-Breaking Slash Interception - deferred, works as specified
- Unbounded History Size Risk - deferred, pre-existing issue
- Unprotected Endpoint (Denial of Wallet) - deferred, pre-existing issue
- Hardcoded Strings and Inaccessibility - deferred, low priority
- Unchecked Prompt Size - deferred, pre-existing issue

## Deferred from: code review of 4-5-vendor-inline-ai-assistance.md (2026-07-07)
- Swallowed RAG errors [`backend/src/services/ai.service.js`] — deferred, pre-existing / degraded state intended
- Conversation history limit ignores token limits [`backend/src/services/ai.service.js`] — deferred, pre-existing
- generateInlineSuggestion blindly concatenates userPrompt [`backend/src/services/ai.service.js`] — deferred, out of scope for MVP
- Hardcoded UI Spanish Labels [`frontend/src/features/chat/components/MessageList.jsx`] — deferred, i18n out of scope

## Deferred from: code review pass 2 of 4-5-vendor-inline-ai-assistance.md (2026-07-07)
- Clicking "Usar Borrador" forcefully overwrites entire text state [`frontend/src/features/chat/components/MessageList.jsx`] — deferred, standard behavior
- Coordinator role authorization doesn't verify branch permissions [`backend/src/routes/conversation.routes.js`] — deferred, pre-existing limitation
- Mapping both IA and VENDOR to the model role [`backend/src/services/ai.service.js`] — deferred, pre-existing in adapter

## Deferred from: code review pass 3 of 4-5-vendor-inline-ai-assistance.md (2026-07-07)
- Missing Swagger Response Schemas (`backend/src/routes/conversation.routes.js`) - deferred, out of scope for MVP
- Options argument contains method or body keys (`frontend/src/services/api.js`) - deferred, out of scope

## Deferred from: code review of 4-7-ai-off-hours-mode.md (2026-07-07)
- Unnecessary tenant query `prisma.tenant.findUnique` inside message handling logic [backend/src/services/whatsapp.service.js]
- Empty catch blocks in `afterEach` hook for database cleanup [backend/tests/integration/chat.test.js]
- Race condition relying on `setTimeout(r, 100)` delays before making assertions [backend/tests/integration/chat.test.js]

## Deferred from: code review pass 3 of 4-7-ai-off-hours-mode.md (2026-07-07)
- `options` parameter explicitly passed as null causes `TypeError` during object destructuring (default params only protect against undefined) [backend/src/services/ai.service.js]
- Strict regex validation for hours accepts impossible times like 25:99 [backend/src/utils/date.js]

## Deferred from: code review (5-1-client-assignment-rules-configuration)
- Hardcoded Pagination Truncation limit=100 (Frontend)
- Unexplained Disabled UI State
- Brittle Integration Test Setup
- Redundant Database Indexing @@index([ruleId])
- Success/Error feedback implemented as inline alerts instead of toasts
- Useless Swagger Documentation
- Missing Frontend Component Unit Tests

## Deferred from: code review of 5-2-automatic-client-assignment-engine.md (2026-07-08)
- Test suite coverage ignores unhappy paths and transaction isolation [backend/tests/unit/assignment.service.test.js:147]

## Deferred from: code review of 5-4-real-time-sla-alerts (2026-07-12)
- Horizontal Scaling Issues (In-memory cache and monitor interval are incompatible with clustered deployments) [backend/src/services/sla.service.js]
- Unscalable Full-Table Retrieval in Backend Monitor [backend/src/services/sla.service.js]
- Inefficient FIFO Config Cache [backend/src/services/sla.service.js]
- Fragile Event Listener Wiring [backend/src/socket/alerts.handler.js]
- Missing Explicit Dashboard Modification [frontend/src/features/chat/components/CoordinatorDashboard.jsx]

## Deferred from: code review of 5-5-vendor-productivity-metrics.md (2026-07-12)
- Browser-Crashing UI Rendering: No pagination in frontend/src/pages/Metrics.jsx

## Deferred from: code review of 5-6-usage-and-activity-reports.md (2026-07-12)
- "Sesiones Activas" Logic: Only counts sessions created on that day, ignoring ongoing multi-day sessions. [backend/src/services/metrics.service.js]
- Unindexed DATE() Joins: `FULL OUTER JOIN` on unindexed DATE derivations isn't scalable. [backend/src/services/metrics.service.js]
- Hardcoded 5-year Lookback: UI year dropdown locked to 5 years. [frontend/src/features/metrics/components/UsageReport.jsx]
- Brittle CSV Concatenation: Manual string concatenation breaks if text columns are added. [backend/src/services/metrics.service.js]
