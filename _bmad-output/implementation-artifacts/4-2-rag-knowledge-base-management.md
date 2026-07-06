---
baseline_commit: NO_VCS
---

# Story 4.2: RAG Knowledge Base Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to upload documents (PDF, CSV) to the Knowledge Base,
So that the AI can answer using my company's actual data.

## Acceptance Criteria

1. **Given** the Knowledge Base UI,
2. **When** I upload a file (PDF or CSV),
3. **Then** the system extracts text from the document,
4. **And** generates embeddings for text chunks using the AI provider,
5. **And** saves the chunks with vector embeddings (pgvector) linked to the tenant.

## Tasks / Subtasks

- [x] Task 1: Update Database Schema & Extensions (AC: 5)
  - [x] Create manual Prisma migration script to inject `CREATE EXTENSION IF NOT EXISTS vector;`
  - [x] Add `Document` and `DocumentChunk` models to `backend/prisma/schema.prisma`
  - [x] Apply changes with `npx prisma db push`
- [x] Task 2: File Upload & Text Extraction (AC: 2, 3)
  - [x] Install dependencies (`multer`, `pdf-parse`, `csv-parser`)
  - [x] Configure `multer` with `memoryStorage()`, 5MB limit, and strict PDF/CSV filter
  - [x] Implement text extraction utilities for PDF and CSV
- [x] Task 3: Chunking & AI Adapter Integration (AC: 4)
  - [x] Implement specific chunking algorithms for text and mapped CSV streams
  - [x] Implement `embed` method in `backend/src/providers/gemini.provider.js`
  - [x] Update `backend/src/services/ai.service.js` to expose embedding capability
- [x] Task 4: API Endpoints & Transactional Operations (AC: 5)
  - [x] Create `POST /tenant/knowledge-base/upload` and `GET /tenant/knowledge-base` endpoints
  - [x] Wrap document chunk saving within `prisma.$transaction` and handle errors appropriately
  - [x] Add Swagger JSDoc for endpoints
- [x] Task 5: Frontend Integration (AC: 1, 2)
  - [x] Create API utilities in `frontend/src/services/api.js`
  - [x] Create `KnowledgeBaseSection.jsx` using `FormData` upload
  - [x] Integrate the new section into the main Settings page so it is accessible.
- [x] Task 6: Automated Testing (DoD Compliance)
  - [x] Write unit and integration tests for document extraction, chunking, and endpoints.
  - [x] Ensure 80%+ coverage on new backend routes and services.

## Dev Notes

**1. Database & ORM (Prisma + pgvector) [CRITICAL]**
- **Database Extension:** You MUST create a manual Prisma migration script (`npx prisma migrate dev --create-only --name enable_pgvector`) to inject `CREATE EXTENSION IF NOT EXISTS vector;` **BEFORE** adding the model to the schema. Ensure this migration file is committed to Git so CI/CD and other environments do not crash on fresh setups.
- **Prisma Schema:** Update `backend/prisma/schema.prisma` with exact schemas:
  - `Document`: `id` (String), `filename` (String), `size` (Int), `status` (String - PROCESSING, READY, ERROR), `tenantId` (String), `createdAt` (DateTime), `updatedAt` (DateTime).
  - `DocumentChunk`: `id` (String), `text` (String), `embedding` (Unsupported("vector(768)")), `documentId` (String), `tenantId` (String), `createdAt` (DateTime), `updatedAt` (DateTime).
  - Both models MUST cascade delete when the `Tenant` is deleted.

**2. File Upload & Text Extraction [CRITICAL]**
- **Upload Middleware:**
  - You MUST configure `multer` to use `multer.memoryStorage()`. Storing files on disk will cause disk exhaustion and memory leaks on the VPS.
  - You MUST configure `multer` with `limits: { fileSize: 5 * 1024 * 1024 }` (5MB limit) to prevent Out of Memory (OOM) crashes.
  - You MUST configure `multer` with a `fileFilter` that strictly rejects any file that is not a PDF or CSV mimetype.
- **Dependencies:** You must run `npm install multer pdf-parse csv-parser` in the backend.

**3. Chunking Strategy & AI Provider Adapter**
- **Chunking Algorithm:** Do NOT invent an arbitrary strategy. Use this exact algorithm:
  - For CSVs: Map each row object into a text block (e.g., `Header1: Value1. Header2: Value2`) BEFORE chunking. Do not attempt to string split the raw CSV stream.
  - For PDFs and text: Split text by double newline (`\n\n`) to separate paragraphs.
  - Limit chunks to approximately 1000 characters (if a paragraph is longer, split by sentences).
  - Filter out any empty chunks or chunks with less than 10 characters.
- **Implementation:** In `backend/src/providers/gemini.provider.js`, implement the `embed({ text, tenantId })` method using Google's `text-embedding-004` model.
- **Learnings from 4.1:** Remember that `embed` receives `tenantId`. You MUST fetch the decrypted API key internally using `_getApiKey(tenantId)` just like `generateResponse` does.

**4. API Endpoints & Transactional Integrity**
- **Transactional Integrity (CRITICAL):** The RAG ingestion process must be safe. You MUST save the `DocumentChunk`s using `prisma.$transaction`. If the embedding process fails at any point, you MUST catch the error and update the `Document` status to `ERROR` so it's not left in a corrupted state.
- **Timeout Risk (Asynchronous processing):** Extracting text and embedding a large PDF could trigger an HTTP timeout. Process the embeddings efficiently. Consider returning a `202 Accepted` and processing asynchronously, updating the document `status` to `READY` when complete.
- **Error Handling:** ALL async service methods and routes MUST be wrapped in `try/catch` blocks. Do not allow raw errors to crash the Node process. Use `ApiError` for domain errors.

**5. Frontend FormData Upload & Navigation**
- When implementing the upload in React, you MUST append the file object correctly: `const formData = new FormData(); formData.append('file', fileObject); await postFormData('/tenant/knowledge-base/upload', formData);`.
- Ensure the `KnowledgeBaseSection` is correctly imported and rendered within the main `Settings.jsx` page (or its equivalent container) so the Admin can actually navigate to it.

**6. Testing Requirements (DoD)**
- The `project-context.md` explicitly requires tests for new API endpoints.
- Write unit tests for the chunking logic to ensure edge cases (empty text, large blocks) are handled.
- Write integration tests for the file upload route using a mocked file buffer.

### Project Structure Notes

- Node backend (CJS modules), React Vite frontend (ESM modules).
- Validation must occur using established patterns (`ApiError(status, message)`).
- `tenant.routes.js` endpoints must use `authenticate` and `authorize('ADMIN')` middlewares.

### References

- Code changes from Story 4.1 (`backend/src/services/tenant.service.js`, `backend/src/providers/gemini.provider.js`).
- [Prisma pgvector Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#postgresql-pgvector)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings

- [x] [Review][Patch] CUID vs UUID Mismatch [backend/src/services/knowledgeBase.service.js:59]
- [x] [Review][Patch] Incorrect chunking strategy for long paragraphs & word slicing [backend/src/utils/chunking.js:33]
- [x] [Review][Patch] Missing minimum character filter for chunks [backend/src/utils/chunking.js:19]
- [x] [Review][Patch] Missing unit tests for PDF chunking [backend/tests/unit/chunking.test.js]
- [x] [Review][Patch] Suspicious Migration File with pre-existing tables [backend/prisma/migrations/20260706181027_enable_pgvector/migration.sql:20]
- [x] [Review][Patch] CSV uploaded with alt OS mime type [backend/src/middleware/upload.middleware.js:8]
- [x] [Review][Patch] Flaky Sleep in Tests [backend/tests/integration/knowledgeBase.test.js:66]
- [x] [Review][Defer] Placebo AI Configuration (hardcoded Gemini) [backend/src/services/ai.service.js:12] — deferred, pre-existing
- [x] [Review][Defer] UI Stuck in "Procesando" (No polling) [frontend/src/features/settings/KnowledgeBaseSection.jsx] — deferred, pre-existing
- [x] [Review][Defer] Copy-Paste Error Handling Spaghetti [frontend/src/services/api.js] — deferred, pre-existing
- [x] [Review][Patch] PDF has no text layer returning falsy text [backend/src/utils/chunking.js:10]
- [x] [Review][Patch] User cancels file selection dialog returning empty files array [frontend/src/features/settings/KnowledgeBaseSection.jsx:200]
- [x] [Review][Patch] CSV Mimetype Handling Contradiction (missing application/vnd.ms-excel) [backend/src/utils/chunking.js:88]
- [x] [Review][Defer] Squashed Database Migration Deviation [backend/prisma/migrations/20260706181027_enable_pgvector/migration.sql] — deferred, pre-existing
