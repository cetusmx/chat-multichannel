---
baseline_commit: f5251fef61949ec6c693f220234f0dc0c1e4b9bb
---
# Story 4.4: AI Escalation & Human Handoff

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Client,
I want to be routed to a human when the AI cannot resolve my issue,
so that my problem gets solved.

## Acceptance Criteria

1. **Given** a conversation managed by AI,
2. **When** the AI detects a complex request (or the user asks for a human),
3. **Then** the system triggers a handoff (< 1s),
4. **And** updates the UI with a subtle transition indicator (UX-DR4).

## Tasks / Subtasks

- [x] Task 1: Update Database Schema (AC: 3)
  - [x] Subtask 1.1: Add `aiPendingEscalation Boolean @default(false) @map("ai_pending_escalation")` to the `Conversation` model in `schema.prisma`.
  - [x] Subtask 1.2: Generate and apply the Prisma migration (`add_ai_escalation_flag`).
- [x] Task 2: Implement AI Detection Logic (AC: 2)
  - [x] Subtask 2.1: Update `systemInstruction` in `ai.service.js` to instruct the LLM to output `[[ESCALATE]]` if it cannot answer or the user asks for a human.
  - [x] Subtask 2.2: Ensure the `fallbackSystem` (when RAG is unavailable) also securely returns `[[ESCALATE]]`.
- [x] Task 3: Handle Escalation in Webhook (AC: 3, 4)
  - [x] Subtask 3.1: In `whatsapp.service.js`, intercept the AI response. If it contains `[[ESCALATE]]`, strip the token.
  - [x] Subtask 3.2: If the stripped response is empty, use a polite default message (e.g., "Un representante se pondrá en contacto contigo en breve.").
  - [x] Subtask 3.3: Update the database to set `aiPendingEscalation: true` for the conversation safely within the `activeAiGenerations` lock.
  - [x] Subtask 3.4: Emit the `conversation_escalated` event via Socket.io to `tenant_${tenantId}_coordinators` and `conversation:${conversationId}` with the conversation payload for UI transitions.
- [x] Task 4: Update Tests
  - [x] Subtask 4.1: Add an integration test in `webhook.ai.test.js` to verify the `[[ESCALATE]]` token interception, DB update, and message sanitization.

## Dev Notes

- **Architecture Constraints:** All database modifications must use Prisma. Do not revert to `$transaction` for AI generation locks; strictly use the `activeAiGenerations` Set in `whatsapp.service.js` to avoid concurrency race conditions.
- **Source Tree Components:** `backend/prisma/schema.prisma`, `backend/src/services/ai.service.js`, `backend/src/services/whatsapp.service.js`, `backend/tests/integration/webhook.ai.test.js`.
- **Testing Standards:** Preserve `global.fetch` in integration tests and use polling loops rather than hardcoded timeouts due to async webhook processing.

### Project Structure Notes

- **Alignment:** Schema updates adhere to snake_case mapping (`@map("ai_pending_escalation")`).
- **Events:** Re-use `getIo()` from `src/socket.js`. Do not instantiate a new Socket.io emitter. The payload for `conversation_escalated` should exactly match the updated Conversation object.

### References

- [Source: backend/prisma/schema.prisma] - `Conversation` model to add `aiPendingEscalation`.
- [Source: backend/src/services/ai.service.js] - Modify `systemInstruction` and `fallbackSystem`.
- [Source: backend/src/services/whatsapp.service.js] - Handle token parsing and DB updates within `setImmediate` orchestration.

## Dev Agent Record

### Agent Model Used

Gemini-2.5-Pro

### Debug Log References

N/A

### Completion Notes List

- Implemented `aiPendingEscalation` in Prisma Schema.
- Added prompt logic to inject `[[ESCALATE]]` if RAG cannot answer or user requests human.
- Intercepted token in `whatsapp.service.js` to trigger database updates and Socket.io events.
- Validated via `webhook.ai.test.js` where all tests passed (85/85).

### File List

- `backend/prisma/schema.prisma`
- `backend/src/services/ai.service.js`
- `backend/src/services/whatsapp.service.js`
- `backend/tests/integration/webhook.ai.test.js`

### Review Findings

- [x] [Review][Patch] Case-sensitive check and regex for `[[ESCALATE]]` token [backend/src/services/whatsapp.service.js:283]
- [x] [Review][Patch] Stale `updatedAt` timestamp in Socket.io payload [backend/src/services/whatsapp.service.js:301]
- [x] [Review][Patch] Global state leak in integration test [backend/tests/integration/webhook.ai.test.js:163]

### Segunda Revisión

- [x] [Review][Patch] Redundant String Parsing Overhead / Regex flag usage [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Stale timestamps and Race Condition / Move escalation after sendMessage [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Fragile Polling Implementation in Tests / Add expects before access [backend/tests/integration/webhook.ai.test.js]
- [x] [Review][Patch] Global state leak in integration test for aiService mock [backend/tests/integration/webhook.ai.test.js]
