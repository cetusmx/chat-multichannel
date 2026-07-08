---
baseline_commit: current
---
# Story 5.2: Automatic Client Assignment Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Vendor,
I want new clients to be assigned to me automatically,
So that I don't have to claim them manually.

## Acceptance Criteria

1. **Given** round-robin routing is active, **When** a new chat escalates from AI or arrives, **Then** it is assigned to the vendor with the least active load.

## Tasks / Subtasks

- [x] Task 1: Implement Auto-Assign Logic (AC: 1)
  - [x] Subtask 1.1: Add `autoAssign(tenantId, conversationId)` in `assignment.service.js`. It MUST return the assigned `vendor` object on success, or `null` if no assignment happened.
  - [x] Subtask 1.2: Check if tenant strategy is `ROUND_ROBIN`. If not, or if 0 eligible vendors exist, return early (leave status as `PENDING_ASSIGNMENT`).
  - [x] Subtask 1.3: Use Prisma `_count` aggregation to query the eligible vendor with the lowest number of `ACTIVE` conversations.
  - [x] Subtask 1.4: Update conversation: `vendorId = selectedVendor.id`, `status = 'ACTIVE'`. Use a Prisma `$transaction` if possible to mitigate race conditions.
- [x] Task 2: Trigger Assignment on Incoming Chat (AC: 1)
  - [x] Subtask 2.1: In `whatsapp.service.js` (~line 156), immediately after creating a `PENDING_ASSIGNMENT` conversation, call `AssignmentService.autoAssign()`.
  - [x] Subtask 2.2: Wrap the call in a safe `try/catch`. DO NOT interrupt the message saving flow or break the existing `incomingLocks` mechanism if assignment fails.
- [x] Task 3: Expose Assignment for AI Escalation (AC: 1)
  - [x] Subtask 3.1: Ensure `autoAssign` is cleanly exported so the future AI module can call it. Do NOT modify `ai.service.js` in this story to avoid scope creep.
- [x] Task 4: Real-time UI Updates (AC: 1)
  - [x] Subtask 4.1: INSIDE `autoAssign` (to keep code DRY), upon successful assignment, emit `chat:assigned` via WebSockets. You MUST target the specific vendor room: `getIo().of('/chat').to('vendor_' + selectedVendor.id).emit(...)`.

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Decision/Patch] Sincronicidad del Webhook — La integración en whatsapp.service.js ejecuta la asignación en la base de datos de manera síncrona. Esto puede causar timeouts de API bajo carga extrema.
- [x] [Review][Patch] Condición de carrera en asignación [backend/src/services/assignment.service.js:50]
- [x] [Review][Patch] Ordenamiento en memoria en lugar de BD [backend/src/services/assignment.service.js:46]
- [x] [Review][Patch] Guardia faltante para vendor.user nulo [backend/src/services/assignment.service.js:46]
- [x] [Review][Patch] Búsqueda de conversación sin tenantId [backend/src/services/assignment.service.js:14]
- [x] [Review][Patch] Mensajes subsecuentes en conversaciones PENDING no disparan asignación [backend/src/services/whatsapp.service.js:154]
- [x] [Review][Defer] Ignora caminos tristes y aislamiento transaccional en tests [backend/tests/unit/assignment.service.test.js:147] — deferred, pre-existing

#### Action Items (Pass 2)
- [x] [Review][Patch] Instanciación de nuevo PrismaClient agota pool de conexiones [backend/src/services/assignment.service.js:1]
- [x] [Review][Patch] Mocks de tests rotos por cambio a query `user.findMany` [backend/tests/unit/assignment.service.test.js]
- [x] [Review][Patch] Emisión de WebSockets dentro de transacción DB prolonga locks [backend/src/services/assignment.service.js:73]
- [x] [Review][Patch] Falta validación inicial de undefined params [backend/src/services/assignment.service.js:18]

#### Action Items (Pass 3)
- [x] [Review][Decision] Quitar el `await` provocó un choque (race condition) entre `autoAssign` y el `update(lastMessageAt)`. [backend/src/services/whatsapp.service.js:116]
- [x] [Review][Patch] El `orderBy: { conversations: { _count: 'asc' } }` evalúa el histórico total, no las conversaciones activas. [backend/src/services/assignment.service.js:49]
- [x] [Review][Patch] `updateMany` en `autoAssign` le falta checar el `tenantId` para evitar colisiones [backend/src/services/assignment.service.js:160]

## Dev Notes

- **Concurrency & Locks (CRITICAL):** `whatsapp.service.js` uses an in-memory `incomingLocks` map. Your `autoAssign` call must be fail-safe (`try/catch`). If it throws, log the error and allow the message to be saved as `PENDING_ASSIGNMENT`. Never crash the lock release.
- **Prisma Query Efficiency:** Do not fetch all conversations into memory to count them. Use Prisma's `include: { _count: { select: { conversations: { where: { status: 'ACTIVE' } } } } }` on the `User` or `EligibleVendor` model, ordered ascending.
- **Race Conditions:** For this MVP, if multiple chats arrive precisely at the same millisecond, it's acceptable if the load balancing isn't mathematically perfect, but prefer using `$transaction` to atomicize the assignment step if straightforward.
- **Socket Emission:** Do not instantiate a new socket server. Require `getIo` from `src/socket.js`. **CRITICAL:** You must follow the exact Architecture payload convention: `{ type: 'chat:assigned', payload: { conversationId: ... }, timestamp: new Date().toISOString(), correlationId: ... }`.
- **Null Safety:** Ensure safe fallbacks if the tenant hasn't configured `AssignmentRule` yet.

### Project Structure Notes

- Logic remains in `backend/src/services/assignment.service.js`.
- No new models or fields in Prisma schema are required. 

### Previous Story Intelligence

- **From Story 5.1:** 
  - Ensure strict null-checks (destructuring guard).
  - `AssignmentRule` is fetched by `tenantId`.

### Architecture Compliance
- Use CommonJS in backend (`require`).
- Follow REST API patterns and Socket.IO naming `chat:assigned`.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: backend/src/services/assignment.service.js]
- [Source: backend/src/services/whatsapp.service.js]

## Dev Agent Record

### Agent Model Used

Gemini 3.1 Pro (High)

### Debug Log References

### Completion Notes List

- Implemented `autoAssign` in `assignment.service.js` utilizing Prisma's `$transaction` and `_count` aggregations to distribute loads based on ROUND_ROBIN.
- Integrated WebSocket emission inside `autoAssign` targeting `vendor_${vendorId}` with strict `{ type, payload, timestamp, correlationId }` signature.
- Wired `autoAssign` into `whatsapp.service.js` inside a fail-safe `try/catch` block that does not block message processing.
- Authored passing unit tests under `tests/unit/assignment.service.test.js`.

### File List

- `backend/src/services/assignment.service.js`
- `backend/src/services/whatsapp.service.js`
- `backend/tests/unit/assignment.service.test.js`
