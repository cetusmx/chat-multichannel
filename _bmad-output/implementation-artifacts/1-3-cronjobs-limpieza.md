# Story 1.3: Cronjobs de Limpieza y Caducidad (Backend Worker)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Administrador,
I want que el sistema audite automáticamente los estados pausados,
so that cerrar prospectos abandonados y reanudar tickets de asesores olvidadizos.

## Acceptance Criteria

1. [ ] Crear un proceso Cron (ej. con `node-cron` o similar) que se ejecute cada hora (con la expresión `"0 * * * *"`), manejando su *graceful shutdown* (SIGTERM/SIGINT) usando un flag `isShuttingDown` para evitar iniciar nuevos loops durante el apagado. Inicializar en `src/index.js`.
2. [ ] Utilizar un flag simple en memoria (`let isRunning = false`) a nivel global en el archivo del cron para prevenir la superposición concurrente (overlap), lo cual es completamente seguro en la arquitectura de "Single Portable Container" y previene el envenenamiento del connection pool. Evitar usar `pg_advisory_lock` o tablas de base de datos como `CronLock`. Envolver la ejecución completa del cron en un bloque `try...finally` y establecer `isRunning = false` dentro de `finally` para asegurar que el memory lock siempre sea liberado. Evitar envolver el ciclo principal en un `$transaction` masivo. NO envolver el lote de `Promise.allSettled` en una transacción compartida (`$transaction`), ya que un fallo envenenará y hará rollback a todo el lote. Las operaciones de base de datos dentro del bucle de Node.js deben ser llamadas individuales de Prisma no transaccionales. Implementar un log idempotente que registre inicio, fin y cantidad de filas procesadas.
3. [ ] Para buscar y actualizar conversaciones en `WAITING_CUSTOMER` que superen el `tenant.autoCloseInactiveHours`, **está prohibido** iterar sobre tenants en Node.js. Usar un CTE SQL para evitar un Massive Table Lock (`LIMIT 100`) dentro de un `while (true)` que rompe en 0. **Crash Database**: El desarrollador DEBE verificar `schema.prisma` y ajustar los nombres de tabla (ej. `"conversations"` vs `"Conversation"`) en el SQL para que coincidan con la BD. El query base (referenciado como `CLOSE_INACTIVE_CTE_QUERY`) debe usar null safety (ej. `COALESCE("tenants"."auto_close_inactive_hours", 48)`) y control de concurrencia:
   `WITH cte AS (SELECT "conversations"."id" FROM "conversations" JOIN "tenants" ON "conversations"."tenant_id" = "tenants"."id" WHERE "conversations"."status" = 'WAITING_CUSTOMER' AND COALESCE("tenants"."is_sla_enabled", true) = true AND "conversations"."status_updated_at" + (COALESCE("tenants"."auto_close_inactive_hours", 48) * INTERVAL '1 hour') < NOW() LIMIT 100 FOR UPDATE SKIP LOCKED) UPDATE "conversations" SET "status" = 'CLOSED_INACTIVE', "status_updated_at" = NOW(), "updated_at" = NOW() FROM cte WHERE "conversations"."id" = cte."id" RETURNING "conversations"."id";`. **Silent Auto-Close Ghosting**: Tras el retorno de IDs `CLOSED_INACTIVE` del CTE, el desarrollador MUST ejecutar un `createMany` de Prisma para insertar un mensaje interno (ej. "Sistema: Conversación cerrada automáticamente por inactividad") por cada ticket cerrado ANTES de emitir los eventos de WebSocket.
4. [ ] Para `ON_HOLD` y `SCHEDULED` que expiren, forzar transición a `ACTIVE`. **UX & SLA Disaster**: Mandatar la inyección de un mensaje interno de sistema (ej. "Sistema: Auto-reanudado por timeout") en la conversación para que los agentes tengan contexto. **Obligatorio**: Invocar la lógica dedicada de recalibración de SLAs (ej. `sla.service.js`) al reanudar los chats. No usar una transacción compartida para todo el lote.
5. [ ] Emitir eventos usando un servicio centralizado de WebSockets (`conversation_updated`). **Massive Data Leak**: Asegurar estrictamente que la emisión del WebSocket se envíe *exclusivamente* a la sala del `tenant_id` específico (y/o sala privada del agente) para prevenir cualquier filtración de datos multitenant. Tras usar `$queryRaw RETURNING id`, mapear el resultado (`ids.map(row => row.id)`) y recuperar objetos completos (ej. `prisma.conversation.findMany`) para evitar UI crashes. **WebSocket UI Crash**: Mandatar que el desarrollador debe recuperar los objetos de conversación para WebSockets usando el EXACTO payload de relación de `include: { ... }` utilizado en el controlador estándar `GET /api/conversations` (o `chat.routes.js`), asegurando que coincida con las expectativas de la UI del frontend. Emitir para TODAS las transiciones, incluyendo `CLOSED_INACTIVE`.
6. [ ] **Regla universal SLA consolidada**: Las conversaciones pausadas donde el tenant tenga `isSlaEnabled: false` siempre regresan a `ACTIVE`. Solo aquellas con `isSlaEnabled: true` pueden moverse a estados como `CLOSED_INACTIVE`. No repetir esta lógica.

## Tasks / Subtasks

- [ ] Task 1: Setup Worker/Cronjob Architecture
  - [ ] Configurar scheduler de cron y escuchar eventos `SIGTERM/SIGINT` implementando un flag `isShuttingDown` para un *graceful shutdown*. Initialize at startup.
  - [ ] Implementar log idempotente de ejecuciones (inicio/fin/afectados).
  - [ ] Ejecutar el proceso utilizando un flag en memoria (`let isRunning = false`) para prevenir ejecuciones superpuestas, asegurando envolver la ejecución completa en un bloque `try...finally` que establezca `isRunning = false` en el bloque `finally`. Dividir el trabajo posterior en lotes de 100 ejecutados como llamadas individuales a Prisma, sin envolver el lote en un `$transaction`.
- [ ] Task 2: Implement Bulk Processing & Recalibration
  - [ ] Para `WAITING_CUSTOMER` (isSlaEnabled=true): Usar el query SQL `CLOSE_INACTIVE_CTE_QUERY` (definido en Acceptance Criteria). Ejecutar dentro de un bucle `while (true)` que haga `break` cuando se actualicen 0 filas. Después de obtener los IDs, mapearlos y recuperar los objetos completos (ej. `prisma.conversation.findMany` con su include exacto) antes de emitir a la UI.
  - [ ] Para estados pausados huérfanos (isSlaEnabled=false): En el bucle `while` de Node.js, consultar explícitamente `WAITING_CUSTOMER`, `ON_HOLD` y `SCHEDULED` donde `tenant: { isSlaEnabled: false }` para rescatar a TODOS y pasarlos a `ACTIVE`.
  - [ ] Para `ON_HOLD` / `SCHEDULED` que expiran (UTC timestamps): Ejecutar queries de Prisma especificando explícitamente en las cláusulas `where` el objeto `{ not: null, lt: new Date() }` aplicando estrictamente a los campos del esquema `onHoldExpiration` y `scheduledAt` para evitar problemas de null safety. Usar un bucle `while` con `take: 100` hasta agotar.
  - [ ] **Zombie Paused Tickets (Null Rescue)**: Añadir una instrucción explícita de rescate de edge-cases para buscar tickets en `ON_HOLD` o `SCHEDULED` donde su respectivo timestamp de expiración (`onHoldExpiration` o `scheduledAt`) SEA NULL, y forzar su transición a `ACTIVE`.
  - [ ] **Inconsistent State Machine Updates**: Para TODAS las transiciones a `ACTIVE` (expirados, huérfanos o rescates nulos), el desarrollador MUST NOT usar actualizaciones a BD con Prisma directamente. Deben iterar de forma explícita y pasar cada ID al método de transición en `sla.service.js` (delegando en servicios de dominio SLA). Además, **inyectar mensaje de sistema interno** ("Sistema: Auto-reanudado por timeout") para contexto del agente. Las llamadas deben ser individuales y NO usar un `$transaction` compartido.
- [ ] Task 3: Centralized WebSockets & Consolidated SLA rule
  - [ ] Utilizar un servicio centralizado de WebSockets para notificar transiciones exitosas. **Obligatorio (Prevención Data Leak)**: Hacer scoping de las emisiones EXCLUSIVAMENTE a la sala del `tenant_id` y/o sala del agente. Emitir eventos `conversation_updated` de forma explícita para TODAS las transiciones.
  - [ ] Centralizar la comprobación de `isSlaEnabled`. Si es `false`, reanudar la conversación incondicionalmente a `ACTIVE`.
- [ ] Task 4: Error Handling and Resiliency
  - [ ] Procesar batches con `Promise.allSettled()` o catch blocks (10-20 concurrentes), SIN envolverlos en un `$transaction` compartido para evitar envenenar el lote entero.
  - [ ] Un fallo individual no debe crashear la ejecución general. Log de fallos.

## Dev Notes

- **Pre-requisites**: El dev agent DEBE inspeccionar `schema.prisma` y `sla.service.js` antes de iniciar la implementación del código.
- **Locking & Transactions**: Use a simple in-memory flag (`let isRunning = false`) with a `try...finally` block that sets `isRunning = false` in `finally` to prevent concurrent overlap. DO NOT wrap the `Promise.allSettled` batch in a shared `$transaction`, as one failure will poison and roll back the whole batch. Database operations inside the Node.js loop should just be individual non-transactional Prisma calls.
- **Inconsistent State Machine Updates**: For ALL transitions to `ACTIVE` (expired, orphans, or null-rescues), the developer MUST NOT use Prisma DB updates directly. They MUST iterate and pass each ID to the `sla.service.js` transition method. Direct DB updates for SLAs inside the cronjob are forbidden.
- **Bulk Date Math & Timestamps**: Use `CLOSE_INACTIVE_CTE_QUERY` provided in the Acceptance Criteria to avoid massive table locks, running inside a `while(true)` loop that breaks on 0 updated rows. Verify table names match `schema.prisma`.
- **WebSockets & Data Leaks**: Map raw IDs, then retrieve the full conversation objects (e.g., via `prisma.conversation.findMany`). Strictly scope WebSocket emissions to the specific `tenant_id` room to avoid multitenant data leaks.
- **Token Optimization (Safe Batching Loop Pattern)**: Consolidate `failedIds` tracking, `isShuttingDown` breaks, and `Promise.allSettled` logic into a single structural pattern for batched while-loops:
  ```javascript
  // Safe Batching Loop Pattern
  let hasMore = true;
  let failedIds = []; // Scoped LOCALLY to the loop iteration block, NOT globally
  while (hasMore) {
    if (isShuttingDown) break; // Graceful shutdown break
    const batch = await prisma.conversation.findMany({
      where: { /* conditions */, id: { notIn: failedIds } },
      take: 100
    });
    if (batch.length === 0) break;
    const results = await Promise.allSettled(batch.map(async (conv) => {
       // ... process individual transition via sla.service.js ...
    }));
    results.forEach((res, i) => { if (res.status === 'rejected') failedIds.push(batch[i].id); });
  }
  ```
- **Auto-resume Context**: Inject an internal system message when auto-resuming paused chats so agents have context on why it became active.
- **Timezones**: Always compare dates in UTC.
- **Batched Processing**: For mutated datasets, use a `while` loop with `take: 100` without cursors.
- **SLA Consolidation**: Handle the `isSlaEnabled` tenant logic in a single authoritative block.

### Project Structure Notes

- Create a `cron` or `workers` folder in the backend architecture if it doesn't exist, to keep this logic isolated from API controllers.

### References

- Epic Reference: [epic-advanced-lifecycle.md](file:///C:/Users/rodro/Documents/workspace/Proyectos-Spec-Driven/BMAD/chat-multichannel-sales-ia/_bmad-output/implementation-artifacts/epic-advanced-lifecycle.md)
- Architecture Details: [chat_lifecycle_and_sla.md](file:///C:/Users/rodro/Documents/workspace/Proyectos-Spec-Driven/BMAD/chat-multichannel-sales-ia/_bmad-output/implementation-artifacts/chat_lifecycle_and_sla.md)

## Dev Agent Record

### Agent Model Used

Antigravity (gemini-2.5-pro)

### Debug Log References

- Searched context for `chat_lifecycle_and_sla.md` and `epic-advanced-lifecycle.md`

### Completion Notes List

- Addressed Extreme Edge cases: Timezones (UTC), memory crashes (Pagination/Batching), and Error handling (individual try-catch / Promise.allSettled).

### File List

- `backend/src/workers/sla-cron.js` (Or equivalent paths depending on framework).
