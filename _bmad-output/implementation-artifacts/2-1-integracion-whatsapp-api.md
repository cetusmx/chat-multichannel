# Story 2.1: Integración WhatsApp API

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want configurar las credenciales de la API de WhatsApp Business y habilitar la recepción de webhooks,
so that el sistema pueda vincular la cuenta comercial del tenant y recibir eventos entrantes de Meta de forma segura.

## Acceptance Criteria

1. **Given** un usuario Admin en la vista de configuración,
   **When** ingresa sus credenciales de WhatsApp Business (Phone Number ID, Business Account ID, Access Token, Verify Token) y guarda,
   **Then** las credenciales se almacenan en la base de datos vinculadas a su tenant.

2. **Given** Meta realiza una solicitud GET para validar el webhook,
   **When** el endpoint `/api/whatsapp/webhook` recibe el `hub.challenge` y `hub.verify_token`,
   **Then** el sistema valida el token contra la configuración del tenant y responde con el challenge si es correcto, devolviendo HTTP 200.

3. **Given** que el webhook está configurado,
   **When** Meta envía un evento POST con un mensaje entrante (ej. de un nuevo lead),
   **Then** el sistema extrae el número de teléfono, crea/actualiza el registro del `Client` y la `Conversation` (en estado PENDING_ASSIGNMENT si es nueva) vinculados al tenant correspondiente, guardando el `Message` inicial.

## Tasks / Subtasks

- [ ] Task 1: Modelos de Base de Datos y Migraciones (AC: 1, 2, 3)
  - [ ] Actualizar `schema.prisma` para agregar `WhatsAppConfig`, `Client`, `Conversation`, `Message`, y `Attachment`.
  - [ ] Ejecutar migraciones de Prisma.
- [ ] Task 2: Configuración de Integración (Backend) (AC: 1)
  - [ ] Crear `whatsapp.routes.js` con endpoints GET y PUT para `/api/whatsapp/settings`.
  - [ ] Implementar la lógica en `services/whatsapp.service.js` para persistir configuración.
- [ ] Task 3: Verificación y Manejo de Webhooks (Backend) (AC: 2, 3)
  - [ ] Implementar validación GET en `/api/whatsapp/webhook`.
  - [ ] Implementar webhook POST en `/api/whatsapp/webhook` para parsear eventos de Meta y registrar datos en DB.
- [ ] Task 4: UI de Configuración (Frontend) (AC: 1)
  - [ ] Crear vista/componente en `features/settings/` para gestionar la integración.
  - [ ] Conectar formulario con `apiFetch` (store si es necesario, o llamada directa).

## Dev Notes

- **Archivos Modificados:**
  - `backend/prisma/schema.prisma` (NUEVO: Modelos necesarios).
  - `backend/src/routes/whatsapp.routes.js` (NUEVO).
  - `backend/src/services/whatsapp.service.js` (NUEVO).
  - `frontend/src/features/settings/WhatsAppConfig.jsx` (o similar, NUEVO).
  - Actualización de `backend/src/app.js` o rutas principales para incluir las nuevas rutas.

- **Architecture Rules:**
  - **Prisma & DB:** Usar PostgreSQL 16. `WhatsAppConfig` debe relacionarse 1:1 con el Tenant.
  - **Backend (CommonJS):** Usa `require()` y `module.exports`. NO uses ESM `import/export`.
  - **Frontend (ESM):** React 19, JavaScript (no TS). Usa Tailwind CSS 4, React Router 7.
  - **Security:** NUNCA retornes errores detallados al cliente en el backend. Aislar por tenant (verifica siempre que la data consultada pertenece al `req.user.tenantId`).
  - **Error Handling:** SIEMPRE usar `try/catch` en endpoints async, retornar códigos de error estándar (ej. `res.status(500).json({ error: { message: err.message, code: 'INTERNAL_ERROR' } })`).

### Project Structure Notes

- **Backend:** 
  - Las lógicas de negocio pesadas deben ir en `services/whatsapp.service.js`.
  - Las rutas en `routes/whatsapp.routes.js`.
- **Frontend:**
  - Agrupar la UI dentro de `features/settings/`. Seguir convención de nombre PascalCase para componentes.

### References

- **PRD:** [Source: _bmad-output/planning-artifacts/prd.md#Epic 2] (FR33, FR36).
- **Architecture:** [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points].
- **Project Context:** [Source: _bmad/project-context.md#Language-Specific Rules].

## Dev Agent Record

### Agent Model Used

Gemini 3.1 Pro (High)

### Debug Log References

### Completion Notes List

### File List
