# Story 2.4: Enforcement de Consumo de IA

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dueño del SaaS,
I want que la IA deje de procesar mensajes si el cliente superó su cuota mensual (y no es LIFETIME),
so that no gaste de más en la API de Google/OpenAI.

## Acceptance Criteria

1. **Given** un cliente en modelo SUBSCRIPTION que superó su límite de tokens,
   **When** un mensaje entrante de WhatsApp intenta ser procesado por la IA,
   **Then** el servicio lo rechaza y lo asigna directamente a un humano (o envía un mensaje de fuera de servicio).

## Tasks / Subtasks

- [ ] Task 1: Tracking de Consumo de Tokens (AC: 1)
  - [ ] Añadir `currentMonthAiTokens Int @default(0)` y `lastTokenResetDate DateTime @default(now())` al esquema `Tenant` para manejar ciclos de facturación mensuales y prevenir crashes de migración en datos de producción existentes.
  - [ ] Ejecutar `npx prisma migrate dev` (o `format`/`generate`) para aplicar los cambios del esquema.
  - [ ] Crear el servicio centralizado `quota.service.js` para manejar cuotas de seats y de IA de forma limpia.
  - [ ] Si `licenseType === 'LIFETIME'`, omitir verificación y permitir procesamiento.
- [ ] Task 2: Modificar el flujo de recepción de WhatsApp en `whatsapp.service.js` (AC: 1)
  - [ ] Realizar "Pre-flight check": antes de enviar el mensaje a `ai.service.js`, validar rápidamente si el Tenant tiene el límite excedido a través de `quota.service.js`. Asegurar de incluir `licenseType` en la cláusula `select` de Prisma durante este check para que el override de `LIFETIME` funcione correctamente.
  - [ ] Implementar evaluación lazy (lazy evaluation) de `lastTokenResetDate` en el pre-flight check: si la fecha actual > `lastTokenResetDate` + 1 mes, reiniciar `currentMonthAiTokens` a 0 y actualizar la fecha antes de verificar el límite. Explicitly use the `date-fns` library (e.g., `addMonths`, `startOfMonth`) for all calendar math to avoid hardcoded days and leap year bugs (Month Calculation Ambiguity). Clarify the date-fns logic to preserve the original anchor day-of-month by calculating the elapsed months and adding that exact amount to `lastTokenResetDate`, rather than blindly overwriting it with `now()`, to correctly handle multi-month inactivity. Para evitar una Race Condition on Lazy Token Reset, use a conditional atomic update (e.g., `prisma.tenant.updateMany` with `where: { id: tenantId, lastTokenResetDate: { lt: newCycleDate } }`) to ensure only the very first request performs the token reset. If `updateMany` returns `count: 0` (meaning another request already reset it), the current request must update its local `tenant.currentMonthAiTokens` state to `0` to prevent false blocks.
  - [ ] Utilizar una caché en memoria con TTL corto (5 min) para el estado "quota exceeded" en el pre-flight check para proteger la base de datos de spam. Esta caché DEBE almacenar SOLO el estado `exceeded=true` y DEBE usar un namespace explícito (ej. `ai_quota_exceeded_${tenantId}`) para evitar colisiones. Si es false, siempre debe consultar la DB/contador en tiempo real. Note that a 5-minute cache delay on quota upgrades is an acceptable trade-off for protecting the DB.
  - [ ] Implementar un Map de deduplicación de Promises `pendingFetches` en el check de cuota para prevenir lecturas concurrentes a la DB (thundering herd) en un cache miss (referenciar `backend/src/utils/tenant-cache.util.js` para el patrón). CRITICAL: The promise MUST be deleted from the pendingFetches Map inside a .finally() block to prevent cache deadlocks.
  - [ ] Si está excedido, omitir el procesamiento de IA, registrar `QUOTA_EXCEEDED` para observabilidad, y usar `assignment.service.js` explícitamente para la lógica de human handoff (no hardcodearlo).
  - [ ] Definir e implementar el comportamiento de "Graceful Fallback": si `autoAssign` en `assignment.service.js` devuelve null (no hay humanos online o enrutamiento manual), encapsulate the fallback `PENDING_ASSIGNMENT` state change cleanly within `assignment.service.js` rather than polluting `whatsapp.service.js` with raw Prisma queries, antes de enviar el mensaje de fallback predeterminado.
- [ ] Task 3: Contabilización de consumo en `ai.service.js`
  - [ ] Actualizar `ai.provider.interface.js` y las implementaciones de proveedores (ej. `gemini`) para devolver el consumo exacto de tokens junto a la respuesta de IA ("AI Adapter Violation").
  - [ ] Realizar "Post-flight check": luego de la respuesta, registrar el incremento preciso de tokens. Si `licenseType === 'LIFETIME'`, OMITIR completamente este incremento para evitar memory leaks y desgaste de DB. El incremento solo debe ocurrir en respuestas de IA exitosas. AI Adapter Violation Safety Net: If exact token data is missing, the fallback MUST use a defensive heuristic: `Math.ceil(((prompt?.length || 0) + (response?.length || 0)) / 4)` rather than 0, protecting from unmetered usage without crashing with TypeErrors.
  - [ ] Mandatorio (Concurrency): Usar la operación atómica `increment` de Prisma al actualizar `currentMonthAiTokens` para prevenir condiciones de carrera.
- [ ] Task 4: Pruebas y validación (AC: 1)
  - [ ] Test unitario/integración para validar bloqueo cuando se supera la cuota.
  - [ ] Test unitario/integración para flujo LIFETIME.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - *Data Model*: El campo `maxAiTokens` y `licenseType` existen en `Tenant`. Añadir `currentMonthAiTokens` (Int) y `lastTokenResetDate` (DateTime) para manejar resets.
  - *Separation of concerns*: La lógica de cuotas (tanto seats como AI) debe centralizarse en `quota.service.js`. Pre-flight y post-flight checks en torno al llamado a la IA.
  - *Concurrency Layers*: Es crucial usar `increment` atómico en Prisma para `currentMonthAiTokens`. Make a clear distinction that `pendingFetches` is exclusively for read-concurrency (Thundering Herd) while the conditional `updateMany` handles write-concurrency (Race Condition on Reset). Note that quota overshooting is expected and acceptable due to async AI calls to prevent wasting time on complex distributed locks.
  - *AI Adapter*: Las interfaces de AI y sus implementaciones (ej. gemini) deben modificarse para devolver siempre los tokens consumidos junto a la respuesta (evitando Adapter Violations).
  - *Service Integration*: Las transferencias humanas deben ser delegadas a `assignment.service.js` sin hardcodear lógica de fallback manual. Incorporar graceful fallbacks para falta de agentes online.
- **Source tree components to touch**:
  - `backend/prisma/schema.prisma` (para `currentMonthAiTokens` y `lastTokenResetDate`).
  - `backend/src/services/whatsapp.service.js`
  - `backend/src/services/ai.service.js`
  - `backend/src/services/quota.service.js` (nuevo, mandatorio).
  - `backend/src/services/assignment.service.js`
  - `backend/src/services/ai.provider.interface.js` (y las implementaciones).
- **Testing standards summary**:
  - Validar edge cases: consumo exactamente igual al límite, `maxAiTokens` = -1 (unlimited) o 0 (disabled), y manejo correcto cuando `licenseType` es `LIFETIME`.

### Project Structure Notes

- **Alignment with unified project structure**: Modifications must remain inside the existing backend services without breaking the standard webhook flow. Do NOT create parallel services for core message routing; enhance the existing ones carefully.
- **Detected conflicts or variances**: None currently. The schema has the limits configured, but tracking mechanism for *consumed* tokens needs to be explicitly handled if missing.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Epic-2-Story-4]

## Dev Agent Record

### Agent Model Used

gemini-exp-1206

### Debug Log References
- Extracted requirements from Epic 2, Story 4.
- Validated existing schema elements (`maxAiTokens`).

### Completion Notes List
- Comprehensive developer guide created. Includes edge cases and disaster prevention on token consumption tracking.

### File List
- _bmad-output/implementation-artifacts/2-4-enforcement-de-consumo-de-ia.md
