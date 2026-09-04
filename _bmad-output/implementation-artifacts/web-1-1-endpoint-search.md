# Story US-1.1: Endpoint Backend de Búsqueda Facetada

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a aplicación web (frontend),
I want un endpoint de búsqueda global facetada en el backend,
so that los usuarios puedan buscar un término en múltiples entidades (Chats, Clientes, Pedidos) simultáneamente y filtrar por facetas (fecha, estado, vendedor).

## Acceptance Criteria

1. **Given** que el cliente realiza una petición a `/api/v1/search` con un parámetro `q` (query)
   **When** el servidor procesa la petición
   **Then** debe buscar coincidencias en las entidades de Chats (mensajes), Clientes (nombre, teléfono) y Pedidos (ID, estado).
2. **Given** una petición de búsqueda
   **When** el cliente envía parámetros de facetas (ej. `type=chat`, `dateFrom=2026-01-01`)
   **Then** el backend debe aplicar estos filtros a la consulta de la base de datos o motor de búsqueda.
3. **Given** que la búsqueda retorna múltiples resultados
   **Then** el endpoint debe devolver una respuesta paginada estandarizada, incluyendo un objeto `facets` con el conteo total por cada tipo de entidad para poblar la UI.
4. **Given** una petición con un término de búsqueda vacío o compuesto solo por espacios
   **Then** el endpoint debe retornar un error 400 Bad Request indicando que el término es requerido.
5. **Given** una petición con un término de búsqueda excesivamente largo (ej. > 100 caracteres)
   **Then** el endpoint debe retornar un error 400 Bad Request para prevenir ataques de denegación de servicio (DoS) en la base de datos.

## Tasks / Subtasks

- [ ] Task 1: Configurar Rutas, Controlador y Validación (AC: 4, 5)
  - [ ] Definir la ruta GET (o POST) `/api/v1/search` en el backend.
  - [ ] **Auth y Rate Limiting:** Aplicar middleware de Autenticación (401) y Autorización (403). Adjuntar middleware estricto de Rate Limiting (ej. max 10-20 peticiones por minuto por usuario) para evitar DoS por CPU en BD.
  - [ ] Implementar middleware de validación (ej. Joi/Zod) asegurando que `q` se aplique `.trim()`, no esté vacío, y tenga un límite máximo de longitud (ej. 100 caracteres).
  - [ ] Validar y sanitizar caracteres especiales que puedan romper la sintaxis del motor de búsqueda (escapar caracteres como `|`, `&`, `!`, `*`, `()`).
  - [ ] Validar `limit` y `offset`. **Guardrail de Paginación:** Imponer un límite duro superior para `limit` (ej. máximo 50) para prevenir extracción masiva.
- [ ] Task 2: Implementar Servicio de Búsqueda Segura y Eficiente (SearchService)
  - [ ] Desarrollar consultas para buscar en Clientes, Mensajes/Chats y Pedidos.
  - [ ] **Aislamiento de Datos (Multi-tenant):** Asegurar que TODAS las consultas restrinjan los resultados exclusivamente a los datos que el usuario autenticado tiene permiso de ver (ej. filtrando por `vendedorId` o `tenantId`).
  - [ ] **Crítico de Seguridad:** Implementar consultas parametrizadas obligatorias. Si se usa PostgreSQL FTS, utilizar funciones seguras como `plainto_tsquery` o `websearch_to_tsquery` para evitar inyecciones SQL y crashes de base de datos.
  - [ ] **Conservación de Pool:** Si el cliente provee el filtro `type` (ej. `type=chat`), saltar agresivamente la ejecución de las consultas de las otras entidades para no agotar el pool de conexiones con `Promise.all()`.
- [ ] Task 3: Agregación de Resultados, Snippets y Respuesta (Facets)
  - [ ] Consolidar los resultados de las diferentes consultas ordenándolos por relevancia o fecha.
  - [ ] Generar el objeto de facetas (`counts`: `{ chats: X, clients: Y, orders: Z }`).
  - [ ] **Optimización de Conteos:** Evitar `COUNT(*)` exactos sobre grandes volúmenes. Limitar el conteo máximo (ej. usando un subquery con `LIMIT 100` para devolver "99+") o usar estimaciones aproximadas, para no bloquear la BD.
  - [ ] **Generación de Snippets:** Para los resultados de chats, utilizar la función `ts_headline` de PostgreSQL (o equivalente) para retornar un `snippet` con el texto resaltado, en lugar del texto completo del mensaje.
  - [ ] **Contexto Conversacional:** Para cada mensaje coincidente en la página final, obtener el mensaje inmediatamente anterior (usando funciones de ventana como `LAG` o una consulta posterior rápida) e incluirlo en la respuesta bajo el campo `previousMessageContext`.
  - [ ] **Contrato API (JSON):** Devolver la respuesta utilizando una estructura estricta: `{ data: [...results], meta: { pagination: { offset, limit, hasMore }, facets: { chats: X, clients: Y, orders: Z } } }`.

## Dev Notes

- **Architecture Constraints:** 
  - Las consultas de texto completo (Full Text Search) pueden ser pesadas. **Obligatorio:** Crear índices **GIN (Generalized Inverted Index)** sobre las columnas `tsvector`. Sin GIN, las consultas harán table scans secuenciales catastróficos.
  - **Trampa de Rendimiento de Snippets:** La función `ts_headline` es altamente demandante de CPU. **Debe ejecutarse única y exclusivamente sobre el subconjunto final de datos paginados** (después de aplicar `LIMIT` y `OFFSET`), *nunca* sobre el conjunto de resultados intermedio completo.
  - **Prohibido:** Concatenar cadenas directamente en las consultas SQL. Es obligatorio usar ORM de forma segura o bindings SQL puros.
- **Source tree components to touch:**
  - `backend/src/routes/search.routes.js`
  - `backend/src/controllers/search.controller.js`
  - `backend/src/services/search.service.js`

### Project Structure Notes

- **Alignment:** Seguir el estándar de paginación del proyecto (`limit`, `offset`/`page`, `totalCount`).

### References

- Épica Web Global: `epic-busqueda-global.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
