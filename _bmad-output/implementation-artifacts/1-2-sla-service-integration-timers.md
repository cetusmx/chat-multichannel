# Story 1.2: SLA Service Integration & Timers

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Vendedor,
I want cambiar el estado de mis conversaciones bajo reglas estrictas,
so that pausar mi SLA cuando dependa del cliente o de un proveedor, sin hacer trampas.

## Acceptance Criteria

1. Modificar el endpoint `PATCH /api/chat/:id/status`. El endpoint debe verificar que el usuario solicitante es el proveedor asignado (o tiene privilegios de coordinador).
2. **Regla WAITING_CUSTOMER / SCHEDULED:** El backend debe lanzar un error `400 Bad Request` si se intenta pasar a estos estados y el último mensaje de la conversación no pertenece a un VENDOR. Para `SCHEDULED` se debe requerir el campo `scheduledAt` (ISO date/time) en el payload y verificar que sea una fecha futura (`> now()`).
3. **Regla ON_HOLD:** El endpoint debe requerir obligatoriamente un campo `reason` (string) y `timebombHours` (int) en el body. `timebombHours` debe ser mayor a 0 y tener un límite máximo (ej. 168 horas / 7 días) para evitar abusos. Estos datos deben registrarse.
4. **Auto-Reanudación:** El webhook receptor de WhatsApp/Web debe verificar si un chat está en `WAITING_CUSTOMER`, `SCHEDULED` o `ON_HOLD`. Si entra un mensaje del cliente, debe forzar el estado de vuelta a `ACTIVE` y actualizar `statusUpdatedAt` a `now()`.
5. **Lógica SLA:** Actualizar `sla.service.js` para respetar el flag `isSlaEnabled` del Tenant.

## Tasks / Subtasks

- [x] Task 1: Update API endpoint for status transition (AC: 1, 2, 3)
  - [x] Subtask 1.1: Modify `PATCH /api/chat/:id/status` controller and route. Verify the requesting user is the assigned vendor (explicitly enforce `conversation.vendorId === req.user.id` or equivalent ownership field so vendors cannot hijack or pause other vendors' conversations) or has coordinator privileges via exact role check (e.g., `user.role === 'COORDINATOR'`). Explicitly query the database for the conversation's tenant configuration (e.g., `prisma.conversation.findUnique({ include: { tenant: true } })`) rather than assuming it's injected on the request. Check `tenant.isSlaEnabled` at the start: if false, block transitions *INTO* advanced states (`WAITING_CUSTOMER`, `SCHEDULED`, `ON_HOLD`, and `DISCARDED`) (return `400 Bad Request`), but explicitly allow transitions *OUT* of advanced states (e.g., back to `ACTIVE` or `CLOSED`). The API must also block users from manually transitioning to `CLOSED_INACTIVE` (reserved for internal Cronjob).
  - [x] Subtask 1.2: Implement validation for `WAITING_CUSTOMER` and `SCHEDULED` (check last message sender). Check the Prisma schema and allow all internal agent sender types (e.g., `VENDOR`, `BOT`, `AI` depending on schema definitions) to satisfy the last-message rule, not just `VENDOR`. Require `scheduledAt` (ISO date/time) in the payload when transitioning to `SCHEDULED`, ensure it is in the future (`> now()`) and capped at a maximum of 30 days from now, and save it to the DB. Use strict UTC operations (e.g., `dayjs.utc()`) for calculating `scheduledAt` math to prevent SLA drift.
  - [x] Subtask 1.3: Implement validation for `ON_HOLD` (require `reason` and `timebombHours`). The `reason` must be trimmed, enforced to a maximum length of 255 characters, and return `400 Bad Request` if empty or whitespace. Validate `timebombHours` is > 0 and <= 168 (7 days). Calculate absolute date for `onHoldExpiration` using strict UTC enforcement (e.g., `dayjs.utc().add(timebombHours, 'hour')`) to prevent SLA drift across server regions.
  - [x] Subtask 1.4: **Transaction Guardrails:** Use a Prisma `$transaction` when verifying the last message and updating the status, to prevent an inbound customer message from being overwritten during the state transition. Ensure all queries inside the `$transaction` block (fetching last message, checking SLA flag, updating status) MUST use the interactive transaction client (e.g., `tx`), not the global `prisma` client.
  - [x] Subtask 1.5: Update database fields (`statusUpdatedAt`, `onHoldReason`, `onHoldExpiration`, `scheduledAt`) based on the transition. Do not manually nullify paused metadata on transition to `ACTIVE` in Prisma, as DB triggers already handle this. However, you MUST write tests to assert this trigger behavior.
- [x] Task 2: Implement Auto-Resume logic in Webhook (AC: 4)
  - [x] Subtask 2.1: Locate the WhatsApp/Web incoming message webhook. Ensure the webhook filters out read/delivery receipts (`statuses`), only processes actual incoming `messages`, and explicitly verifies the inbound message is actually from the customer (not a BSP echo).
  - [x] Subtask 2.2: **Webhook Auto-Resume IOPS & Race Condition:** Mandate a single atomic update query (e.g., `prisma.conversation.updateMany({ where: { id, status: { in: ['WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD'] } }, data: { status: 'ACTIVE', statusUpdatedAt: new Date(), onHoldReason: null, onHoldExpiration: null, scheduledAt: null } })`) that completely skips the read phase, preventing race conditions and zeroing overhead for already-active chats. Clarify that the webhook is fully idempotent and should gracefully exit early if the atomic update returns 0 affected rows.
  - [x] Subtask 2.3: **Webhook WebSocket Ordering:** Explicitly mandate that the conversation status update must be `await`ed and completed *before* the system fetches the conversation state to broadcast the `new_message` event, preventing UI state races. Inspect existing socket emission patterns in `whatsapp.webhook.js` to ensure the correct tenant/conversation room is used when explicitly emitting a WebSocket event (`conversation_updated`) so the Vendor's UI syncs.
- [x] Task 3: Implement SLA logic feature flag (AC: 5)
  - [x] Subtask 3.1: Update `sla.service.js` to check the `isSlaEnabled` flag on the Tenant.
  - [x] Subtask 3.2: Bypass SLA calculations and timers if `isSlaEnabled` is false. The bypass must return a graceful null-object or matching empty schema so that consumers don't crash from `undefined`.
- [ ] Task 4: Testing & Validation
  - [ ] Subtask 4.1: Write unit/integration tests for the updated status endpoint.
  - [ ] Subtask 4.2: Write tests for the auto-resume webhook logic.

## Dev Notes

- Relevant architecture patterns and constraints
  - The SLA engine relies on `statusUpdatedAt` to decouple state change tracking from generic `updatedAt`. Ensure it is correctly set on state transitions.
  - Ensure validations for state transitions do not break existing clients; return structured `400 Bad Request` with meaningful error messages.
  - Auto-reanudación MUST update `statusUpdatedAt` to `now()` when forcing state to `ACTIVE` to prevent the SLA engine from falsely triggering breaches. Metadata nullification is handled by DB triggers, so do not do it manually in Prisma.
  - **Webhook Auto-Resume:** MUST filter out WhatsApp read/delivery receipts (`statuses`); auto-resume only triggers on actual incoming `messages` from the customer. Use a single atomic update query (`updateMany`) that skips the read phase, gracefully exiting if 0 rows are affected (meaning the chat is already active).
  - **Strict UTC Enforcement:** For `ON_HOLD` and `SCHEDULED`, `timebombHours` and dates must be converted to absolute dates by using strict UTC math (e.g., `dayjs.utc()`) to prevent SLA drift across server regions.
  - **"Last Message Sender" Query Edge Case:** When checking the last message to validate `WAITING_CUSTOMER` or `SCHEDULED`, use this exact query inside the interactive transaction client (e.g., `tx.message.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' } })`), not the global `prisma` client. Note the use of `conversationId` instead of `chatId`. If the result is `null` (no messages exist), safely reject the pause attempt. First read `backend/prisma/schema.prisma` to verify the exact spelling and casing of the message sender enum. Check the Prisma schema and allow all internal agent sender types (e.g., `VENDOR`, `BOT`, `AI` depending on schema definitions) to satisfy the last-message rule, rather than a fragile `userId` match.
- Source tree components to touch
  - `backend/src/controllers/chat.controller.js` (or equivalent status endpoint route)
  - `backend/src/services/chat.service.js` (or equivalent service handling transitions)
  - `backend/src/webhooks/whatsapp.webhook.js` (or equivalent incoming message handler)
  - `backend/src/services/sla.service.js`
- Testing standards summary
  - Implement comprehensive testing for API endpoints covering valid and invalid state transitions.
  - Verify webhook triggers properly reset conversation status.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - Ensure backend controller and service naming conventions align with the current architecture (e.g., separating business logic into services).
- Detected conflicts or variances (with rationale)
  - None detected; building upon schema changes made in Story 1.1.

### References

- [Source: _bmad-output/implementation-artifacts/epic-advanced-lifecycle.md#Story 2]
- [Source: _bmad-output/implementation-artifacts/chat_lifecycle_and_sla.md#2. El Universo del Ticket: Estados y Reglas de Negocio]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List
