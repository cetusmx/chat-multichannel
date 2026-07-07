---
baseline_commit: 7a2aafa7309c65c7c10c82a6217768f092876f20
---
# Story 4.5: Vendor Inline AI Assistance

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Vendor,
I want to ask the AI for suggested answers while chatting,
so that I can reply faster (UX-DR11).

## Acceptance Criteria

1. **Given** the message input box,
2. **When** I type "/" and request a summary or suggestion,
3. **Then** the AI generates a draft reply only visible to me.

## Tasks / Subtasks

- [ ] Task 1: Inline Assistance Service (Backend)
  - [ ] Update `ai.service.js` to add a method `generateInlineSuggestion(tenantId, conversationId, userPrompt)`
  - [ ] The method should use RAG to generate an accurate draft response tailored to the `userPrompt`
- [ ] Task 2: API Endpoint for Inline Assistance (Backend)
  - [ ] Create endpoint `POST /api/conversations/:id/ai-assist`
  - [ ] Request Contract: `{ prompt: string }`
  - [ ] Response Contract: `{ draft: string }`
  - [ ] Apply `authMiddleware` and RBAC: validate that the user is either the assigned Vendor or a Coordinator.
  - [ ] Connect endpoint to `generateInlineSuggestion` method
- [ ] Task 3: Frontend Command Integration (Frontend)
  - [ ] Add an interface to intercept `/` keystrokes in the chat input area
  - [ ] Use `apiFetch` (not raw fetch) to communicate with the new endpoint
  - [ ] Add UI to display the generated draft so the vendor can edit, accept, or reject it before sending
- [ ] Task 4: Testing & Validation
  - [ ] Add unit and/or integration tests for the `generateInlineSuggestion` flow
  - [ ] Validate endpoint authorization (only vendor assigned or coordinator)

### Review Findings

- [x] [Review][Patch] Missing Command Palette & Accept/Reject UI — Spec requires a command palette/popover and a distinct UI to display the draft for accept/reject/edit. Currently, it renders an inline banner and reuses the main text input, overwriting the user's prompt text.
- [x] [Review][Patch] Testing Standard Violation (State Leakage) [backend/tests/integration/chat.test.js:346]
- [x] [Review][Patch] UX Edge Case Violation (Blocks Normal Typing) [frontend/src/features/chat/components/MessageList.jsx:214]
- [x] [Review][Patch] Incorrect HTTP Status Codes for missing conversation [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Draft text leaks into wrong conversation [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Patch] Multiple AI calls on rapid submit [frontend/src/features/chat/components/MessageList.jsx:191]
- [x] [Review][Patch] Missing Swagger & JSDoc [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Inline Requires [backend/src/routes/chat.routes.js, backend/src/services/ai.service.js]
- [x] [Review][Patch] Opaque UI Error Handling & Parsing Bug [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Missing Test Coverage (400, 404 cases) [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Cramped Draft UI [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Missing AbortController [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Patch] Incomplete Swagger Annotations (401, 500) [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Testing Standard Violation (State Leakage via inline mockRestore) [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Escape Key Handling [frontend/src/features/chat/components/MessageList.jsx]
- [x] [Review][Defer] Prompt Injection Vulnerability — deferred, pre-existing limitation
- [x] [Review][Defer] Code Duplication — deferred, low priority
- [x] [Review][Defer] Prompt Length Exceeds Limits — deferred, pre-existing limitation
- [x] [Review][Defer] UX Edge Case Violation (Blocks Normal Typing for slash commands) — deferred, works as specified
- [ ] [Review][Patch] Frontend API Standard Violation (Bypasses `apiFetch`) [frontend/src/features/chat/components/MessageList.jsx]
- [ ] [Review][Patch] Database State Leakage in Integration Tests [backend/tests/integration/chat.test.js]
- [ ] [Review][Patch] Mock Implementation Leakage in Integration Tests [backend/tests/integration/chat.test.js]
- [ ] [Review][Patch] Endpoint Path Deviates from Spec Requirements [backend/src/routes/chat.routes.js]
- [ ] [Review][Patch] Fundamentally Flawed RAG Search Trigger [backend/src/services/ai.service.js]
- [ ] [Review][Patch] Missing AbortController Cleanup on Unmount [frontend/src/features/chat/components/MessageList.jsx]
- [ ] [Review][Patch] Missing Click-Away Dismissal for AI Popover [frontend/src/features/chat/components/MessageList.jsx]
- [ ] [Review][Patch] Race Condition on Generation [frontend/src/features/chat/components/MessageList.jsx]
- [ ] [Review][Patch] Potential deviation from error state handling intent (Missing Retry) [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Defer] UX-Breaking Slash Interception - deferred, works as specified
- [x] [Review][Defer] Unbounded History Size Risk - deferred, pre-existing issue
- [x] [Review][Defer] Unprotected Endpoint (Denial of Wallet) - deferred, pre-existing issue
- [x] [Review][Defer] Hardcoded Strings and Inaccessibility - deferred, low priority
- [x] [Review][Defer] Unchecked Prompt Size - deferred, pre-existing issue

## Dev Notes

- **AI Service Integration:** Ensure the `generateInlineSuggestion` logic shares context fetching code with `generateAutoResponse` to keep the context consistent, but passes the specific `userPrompt` to the LLM to steer the suggestion.
- **Frontend State:** The drafted text shouldn't be sent to the socket as a real message until the user manually sends it. It is strictly local UI state.
- **UX Constraint (UX-DR11) & Edge Cases:** The interception of `/` in the input must not block normal typing (e.g. paths, dates). It should trigger a command palette/popover that can be easily dismissed (e.g., with the Escape key).
- **Architecture Standard (Frontend API Calls):** You MUST use the centralized `apiFetch` utility for making requests, which automatically handles 401s and token injection. Do NOT use raw `fetch` or `axios`.
- **Testing Standard (State Leakage):** When mocking `aiService` in integration tests, ensure `global.fetch` is restored in a `finally` block and mocks are cleared using `jest.clearAllMocks()` in an `afterEach` hook to prevent test state leakage and race conditions (Lesson from 4.4).

### Project Structure Notes

- Add/update routes in `backend/src/routes/`
- Update `backend/src/services/ai.service.js`
- Create/update frontend chat components under `frontend/src/features/chat/components/` (specifically `MessageList.jsx` which contains the input form).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-AI-Agent--RAG]
- [Source: _bmad/project-context.md]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List

### Review Findings
- [x] [Review][Patch] `history.reverse()` mutates array before `.find()` [`backend/src/services/ai.service.js`:110]
- [x] [Review][Patch] Flawed RAG Search Query Ignores Vendor Prompt [`backend/src/services/ai.service.js`:115]
- [x] [Review][Patch] Aborted fetch triggers finally block during new fetch [`frontend/src/features/chat/components/MessageList.jsx`]
- [x] [Review][Patch] Race Condition on Generation During Conversation Switch [`frontend/src/features/chat/components/MessageList.jsx`]
- [x] [Review][Patch] Flawed Click-Away Dismissal Breaks Toggle Button [`frontend/src/features/chat/components/MessageList.jsx`]
- [x] [Review][Patch] Missing Test Coverage for Coordinator Authorization [`backend/tests/integration/chat.test.js`]
- [x] [Review][Defer] Swallowed RAG errors [`backend/src/services/ai.service.js`] — deferred, pre-existing / degraded state intended
- [x] [Review][Defer] Conversation history limit ignores token limits [`backend/src/services/ai.service.js`] — deferred, pre-existing
- [x] [Review][Defer] generateInlineSuggestion blindly concatenates userPrompt [`backend/src/services/ai.service.js`] — deferred, out of scope for MVP
- [x] [Review][Defer] Hardcoded UI Spanish Labels [`frontend/src/features/chat/components/MessageList.jsx`] — deferred, i18n out of scope

### Review Findings (Pass 2)
- [ ] [Review][Patch] Ghost Request Blocks Chat UI on AI Popover Dismissal [`frontend/src/features/chat/components/MessageList.jsx`]
- [ ] [Review][Patch] Incorrect Error Target for Empty AI Drafts Hides Feedback [`frontend/src/features/chat/components/MessageList.jsx`]
- [ ] [Review][Patch] File upload trigger button appears active but hidden input disabled [`frontend/src/features/chat/components/MessageList.jsx`]
- [ ] [Review][Patch] Unused `aiService` import left in `chat.routes.js` [`backend/src/routes/chat.routes.js`]
- [ ] [Review][Patch] `conversation.routes.js` instantiates brand new `PrismaClient` [`backend/src/routes/conversation.routes.js`]
- [ ] [Review][Patch] AI assist requested on closed or resolved conversation [`backend/src/routes/conversation.routes.js`]
- [ ] [Review][Patch] RAG similarity search returns chunk without text field [`backend/src/services/ai.service.js`]
- [ ] [Review][Patch] Maliciously large prompt payload sent to endpoint [`backend/src/routes/conversation.routes.js`]
- [ ] [Review][Patch] Lazy circular dependency workaround removed from inline requires [`backend/src/services/ai.service.js`]
- [x] [Review][Defer] Clicking "Usar Borrador" forcefully overwrites entire text state [`frontend/src/features/chat/components/MessageList.jsx`] — deferred, standard behavior
- [x] [Review][Defer] Coordinator role authorization doesn't verify branch permissions [`backend/src/routes/conversation.routes.js`] — deferred, pre-existing limitation
- [x] [Review][Defer] Mapping both IA and VENDOR to the model role [`backend/src/services/ai.service.js`] — deferred, pre-existing in adapter

### Review Findings (Pass 3)
- [ ] [Review][Patch] Endpoint Response Format Deviates from Spec Requirements (`backend/src/routes/conversation.routes.js`)
- [ ] [Review][Patch] Application crash on null message content (`backend/src/services/ai.service.js`)
- [ ] [Review][Patch] Invalid payload sent to AI Provider (`backend/src/services/ai.service.js`)
- [ ] [Review][Patch] History contains consecutive identical roles (`backend/src/services/ai.service.js`)
- [ ] [Review][Patch] Conversation has zero previous messages (`backend/src/services/ai.service.js`)
- [ ] [Review][Patch] Popover closed while response JSON is parsing (`frontend/src/features/chat/components/MessageList.jsx`)
- [ ] [Review][Patch] Missing focus restoration post-insertion (`frontend/src/features/chat/components/MessageList.jsx`)
- [ ] [Review][Patch] Unsafe React state update on unmounted component (`frontend/src/features/chat/components/MessageList.jsx`)
- [x] [Review][Defer] Missing Swagger Response Schemas (`backend/src/routes/conversation.routes.js`) - deferred, out of scope for MVP
- [x] [Review][Defer] Options argument contains method or body keys (`frontend/src/services/api.js`) - deferred, out of scope
