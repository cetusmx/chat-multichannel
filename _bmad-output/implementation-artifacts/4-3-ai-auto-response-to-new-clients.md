---
baseline_commit: NO_VCS
---

# Story 4.3: AI Auto-Response to New Clients

Status: done
Assignee: Amelia

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Client,
I want to get immediate answers when I send my first message,
So that I don't have to wait for a human.

## Acceptance Criteria

1. **Given** an unassigned conversation,
2. **When** a message arrives,
3. **Then** the AI queries the RAG database and replies in < 5 seconds.

## Tasks / Subtasks

- [x] Task 1: RAG Query Implementation (AC: 3)
  - [x] Add `searchSimilarChunks(tenantId, query, limit = 3)` in `backend/src/services/knowledgeBase.service.js` using `pgvector` cosine similarity (`<=>`).
- [x] Task 2: AI Auto-Response Orchestration (AC: 3)
  - [x] Add `generateAutoResponse(tenantId, conversationId, incomingText)` in `backend/src/services/ai.service.js`.
  - [x] Within this method, fetch the last N messages of the conversation for chat history.
  - [x] Within this method, embed the incoming message and query the RAG database via `knowledgeBase.service.js`.
  - [x] Generate the final response using `generateResponse`, passing the history and the retrieved RAG chunks in the system instruction, and return the generated text.
- [x] Task 3: Webhook Integration & Message Sending (AC: 1, 2)
  - [x] Update `backend/src/services/whatsapp.service.js`'s `sendMessage` method to properly respect the `senderType` parameter even when `senderId` is null (e.g., `senderType: senderId ? senderType : (senderType || 'SYSTEM')`).
  - [x] Update `backend/src/services/whatsapp.service.js` to detect when a conversation is `PENDING_ASSIGNMENT`.
  - [x] Implement a basic concurrent message lock or check (e.g., verify the last message in DB is still `CLIENT` or use a memory lock) to prevent duplicate AI responses on rapid multiple messages.
  - [x] Asynchronously call `ai.service.generateAutoResponse()`.
  - [x] Send the returned response back to the client using `this.sendMessage(conversation.id, responseText, null, 'IA')`. Note: `sendMessage` already handles DB persistence and Socket.IO emission. Do not duplicate these actions.
- [x] Task 4: Automated Testing (DoD Compliance)
  - [x] Write unit tests for `searchSimilarChunks`.
  - [x] Write integration test mocking the AI response and verifying the message is correctly formed and sent.

## Dev Notes

**1. Architectural Separation (SRP) [CRITICAL]**
- Do NOT clutter `whatsapp.service.js` with RAG or history-fetching logic. `whatsapp.service.js` must simply import `ai.service.js`, call `generateAutoResponse(...)`, and handle the sending of the result. `ai.service.js` is responsible for fetching history, querying chunks, and talking to Gemini.

**2. RAG Vector Search [CRITICAL]**
- You must use `prisma.$queryRaw` to perform the vector similarity search in `knowledgeBase.service.js`.
- Example SQL: 
  ```sql
  SELECT text, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
  FROM document_chunks
  WHERE tenant_id = ${tenantId}
  ORDER BY embedding <=> ${embeddingStr}::vector
  LIMIT ${limit};
  ```
- Format the query embedding as a string representation of an array before passing it to `$queryRaw`.

**3. System Instruction & History Context**
- The AI needs conversation history to provide coherent answers. Fetch the last N messages from `prisma.message` for `conversation.id` and map them into the format expected by the AI provider (`role: 'user' | 'model'`).
- The `aiService.generateResponse` passes the `context` argument as the `systemInstruction` to Gemini. Formulate a robust persona instruction, e.g.:
  ```javascript
  const systemInstruction = `You are a helpful sales assistant for this company. Use ONLY the following context to answer the user's questions. If the context doesn't have the answer, say you don't know.\n\nContext:\n${contextString}`;
  ```

**4. Database Schema Enum [CRITICAL]**
- The `SenderType` enum in `schema.prisma` is `IA`. You must use `senderType: 'IA'` when calling `sendMessage`. Ensure you modify `sendMessage`'s hardcoded `SYSTEM` fallback as instructed in Task 3 so it actually saves as `IA`.

**5. Avoid Duplicate DB & Socket Operations [CRITICAL]**
- Do NOT manually use `prisma.message.create` or `getIo().emit` for the AI response in the webhook handler. Calling `this.sendMessage(...)` handles the Meta API call, saves the record to the DB, AND emits the socket event. Manual insertions will result in duplicated messages in the chat history.

**6. Error Handling & Silent Fallback**
- Execute the AI response logic asynchronously. Do not `await` the entire AI process in the main webhook flow. Instead, run it as an unawaited Promise or using `setImmediate`, so the webhook returns `200 OK` to Meta immediately.
- Attach a `.catch(err => ...)` to handle API errors. If Gemini goes down, log the error but **do nothing else**. The conversation must remain in `PENDING_ASSIGNMENT` so a human can manually claim it. Do NOT crash the Node process.

### Project Structure Notes
- Node backend (CJS modules).
- Validation must occur using established patterns (`ApiError(status, message)`).

### References
- [Prisma pgvector Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#postgresql-pgvector)
- Database schema: `backend/prisma/schema.prisma`
- Existing message sending behavior: `backend/src/services/whatsapp.service.js`

## Dev Agent Record

### Agent Model Used
MODEL_PLACEHOLDER_M16

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings

- [x] [Review][Patch] Misplaced Embedding Logic & Circular Dependency [ai.service.js:37 / knowledgeBase.service.js:47]
- [x] [Review][Patch] Incorrect senderType Fallback Logic [whatsapp.service.js:362]
- [x] [Review][Patch] Missing try/catch in searchSimilarChunks [knowledgeBase.service.js:86]
- [x] [Review][Patch] Deviation in pgvector Cast Syntax [knowledgeBase.service.js:95]
- [x] [Review][Patch] Parameterized LIMIT in Prisma query [knowledgeBase.service.js:99]
- [x] [Review][Patch] Chat history mapping treats SYSTEM as model [ai.service.js:49]
- [x] [Review][Patch] Race conditions in Auto-Response concurrency check [whatsapp.service.js:261]
- [x] [Review][Patch] Failed RAG fallback invokes LLM anyway [ai.service.js:64]
- [x] [Review][Defer] Integration test heavily relies on hardcoded setTimeout [webhook.ai.test.js:10] — deferred, pre-existing
- [x] [Review][Defer] Global fetch mutated in test without restoration [webhook.ai.test.js:20] — deferred, pre-existing

### Review Findings (v2)

- [x] [Review][Patch] RAG Fallback Exposes System Prompt to User [ai.service.js:64]
- [x] [Review][Patch] Ineffective Concurrency Lock / Log Pollution [whatsapp.service.js:276]
- [x] [Review][Patch] Memory-Level History Filtering Truncates Context [ai.service.js:42]
- [x] [Review][Patch] Inadequate Embedding Vector Validation [knowledgeBase.service.js:85]
- [x] [Review][Patch] Toxic Global State Mutation in Tests / Hardcoded setTimeout [webhook.ai.test.js]
- [x] [Review][Patch] Signature Mismatch for searchSimilarChunks [knowledgeBase.service.js:84]
- [x] [Review][Defer] Cowboy Circular Dependency Workaround [knowledgeBase.service.js] — deferred, requires architectural refactor
