# Story saas-3.1: Telemetría Global SaaS (Agregación de Métricas Globales)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Desarrollador Backend,
I want un endpoint que sume las métricas globales,
so that el frontend pueda pintarlas rápido.

## Acceptance Criteria

1. **Given** múltiples inquilinos operando,
   **When** el Superadmin consulta `/api/superadmin/metrics`,
   **Then** el endpoint retorna el conteo de Tenants activos (`status: 'active'`), total de usuarios activos (`isActive: true`) y total de tokens IA consumidos este mes (`_sum: currentMonthAiTokens`).

## Tasks / Subtasks

- [x] Task 1: Crear servicio de métricas para Superadmin (AC: 1)
  - [x] Subtask 1.1: Crear archivo `backend/src/services/superadmin.metrics.service.js` con el método `getGlobalMetrics()`. El servicio DEBE importar el singleton de Prisma existente requiriendo explícitamente `const prisma = require('../config/database');` y tiene estrictamente prohibido instanciar un nuevo `PrismaClient`. El servicio DEBE exportar un método `clearCache()` (ej., `module.exports = { getGlobalMetrics, clearCache }`) que debe simplemente ejecutar `cache.clear()` para que los tests puedan resetear el estado compartido entre ejecuciones.
  - [x] Subtask 1.2: Implementar consulta de Tenants (`prisma.tenant.count({ where: { status: 'active' } })`), Users (`prisma.user.count({ where: { isActive: true } })`), y Tokens (`prisma.tenant.aggregate({ _sum: { currentMonthAiTokens: true } })`), envolviendo las tres consultas estrictamente en `Promise.all()` para rendimiento por ejecución concurrente. La desestructuración DEBE ser explícita: `const [tenants, users, tokensResult] = await Promise.all(...)`.
  - [x] Subtask 1.3: Implementar un caché en memoria usando una instancia de `Map` con TTL corto para optimizar recargas del dashboard. Declarar `const cache = new Map();` para los datos y una variable separada `let ongoingPromise = null;` en el nivel superior del servicio. El caché DEBE usar la clave exacta `'global_metrics'` y almacenar objetos con la estructura `{ data, expiresAt: Date.now() + 60000 }` dentro del `Map`, requiriendo validación manual de expiración al leer. Además, implementar de-duplicación de promesas usando `ongoingPromise` para evitar el problema Thundering Herd si múltiples peticiones llegan simultáneamente. Específicamente, el flujo de lógica de caché debe ser: if `expiresAt < Date.now()`, if there is an ongoing promise, return it. Else, fetch fresh data from DB as a promise, store it, update the cache with new data and new TTL when resolved, and return. El `ongoingPromise` debe ser reseteado a `null` dentro de un bloque `.finally()` al resolver. En caso de fallo o rechazo de las consultas a base de datos, el caché NO DEBE actualizarse ni corromperse.
- [x] Task 2: Crear controlador para exponer métricas (AC: 1)
  - [x] Subtask 2.1: Crear archivo `backend/src/controllers/superadmin.metrics.controller.js` con el método `getMetrics(req, res, next)` que devuelva `{ tenants: <num>, users: <num>, aiTokens: <num> }`. El controlador DEBE envolver su lógica en un bloque `try/catch`, pasando cualquier error a `next(err)`. La firma de retorno DEBE ser explícitamente: `return success(res, { tenants, users, aiTokens });`. Utilizar la utilidad estándar `const { success } = require('../utils/response')` para éxito y manejo de errores estándar con `next(err)`. Exportar explícitamente con `module.exports = { getMetrics }`.
- [x] Task 3: Configurar rutas de Superadmin para métricas globales (AC: 1)
  - [x] Subtask 3.1: Crear archivo `backend/src/routes/superadmin.metrics.routes.js` e importar `getMetrics` desde el controlador y `isSuperadmin` desde el middleware, requiriendo explícitamente la ruta exacta de importación: `const isSuperadmin = require('../middleware/superadmin.auth.middleware');`. Se requiere explícitamente `router.get('/', isSuperadmin, getMetrics);`.
  - [x] Subtask 3.2: Actualizar `backend/src/app.js` para montar la nueva ruta vía `app.use('/api/superadmin/metrics', require('./routes/superadmin.metrics.routes'));`. Se debe montar la nueva ruta cerca de las otras rutas de superadmin (por ejemplo, justo debajo de `app.use('/api/superadmin/tenants', superadminTenantRoutes);`).

## Dev Notes

### Architecture Compliance
- **Parallel Service Ecosystem (AD-2)**: Las consultas globales del Superadmin DEBEN implementarse en una capa de servicios paralelos dedicada (ej. `superadmin.metrics.service.js`). No modificar `metrics.service.js`.
- **Data Isolation (NFR2)**: Las consultas deben ejecutarse globalmente, ignorando el middleware de inquilinos.
- **Security Guardrail (NFR1)**: La ruta debe estar protegida obligatoriamente por el middleware `isSuperadmin` y devolver `403 Forbidden` a roles inferiores.

### Technical Requirements
- Usa exclusivamente `prisma.tenant.count` y `prisma.tenant.aggregate` dictados en las tareas para evitar saturar la memoria RAM. Si `_sum` devuelve null, mapearlo a 0 usando la lógica de fallback explícita: `const aiTokens = tokensResult?._sum?.currentMonthAiTokens || 0`.

### Source Tree Components to Touch
- **NEW**: `backend/src/services/superadmin.metrics.service.js`
- **NEW**: `backend/src/controllers/superadmin.metrics.controller.js`
- **NEW**: `backend/src/routes/superadmin.metrics.routes.js`
- **UPDATE**: `backend/src/app.js`

### Testing Standards Summary
- Implementar validación funcional de la ruta asegurando que usuarios sin `isSuperadmin` reciban HTTP 403.
- Verificar con datos simulados que las agregaciones ignoran los boundaries de los inquilinos.
- Los tests funcionales DEBEN sembrar la base de datos con al menos un Tenant inactivo (`status: 'suspended'`) y un User inactivo (`isActive: false`) para probar matemáticamente que los filtros `.count()` funcionan correctamente. Además, se requiere que los tests siembren recuentos de tokens específicos en múltiples inquilinos y afirmen que la suma devuelta es matemáticamente correcta.
- Invocar `clearCache()` y limpieza de base de datos obligatoriamente en `beforeEach` o `afterEach` de cada test case.
- Colocar los tests funcionales de esta historia exactamente en `backend/tests/integration/superadmin.metrics.test.js`.

### Project Structure Notes

- Alignment with unified project structure: Sigue el modelo de archivos paralelos (e.g., prefijo `superadmin.*`) para evitar intrusiones en el codebase multi-tenant.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Epic 3: Telemetría Global SaaS]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-2: Parallel Service Ecosystem]

## Dev Agent Record

### Agent Model Used

Gemini-Pro-Antigravity

### Debug Log References

### Completion Notes List
- Implementado el servicio `superadmin.metrics.service.js` con cache de promesas.
- Implementado controlador y ruta de metricas para superadmin, montado en `app.js`.
- Creado test de integración `superadmin.metrics.test.js`.

### File List
- `backend/src/services/superadmin.metrics.service.js` (NEW)
- `backend/src/controllers/superadmin.metrics.controller.js` (NEW)
- `backend/src/routes/superadmin.metrics.routes.js` (NEW)
- `backend/src/app.js` (MODIFIED)
- `backend/tests/integration/superadmin.metrics.test.js` (NEW)
