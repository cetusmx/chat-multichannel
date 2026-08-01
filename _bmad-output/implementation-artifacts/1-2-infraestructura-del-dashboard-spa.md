---
baseline_commit: 4fadef758ed47194d6a4578c52478c1429563295
---

# Story 1.2: Infraestructura del Dashboard SPA

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Superadmin,
I want acceder a un portal web independiente,
so that pueda gestionar la plataforma sin usar la interfaz de los vendedores.

## Acceptance Criteria

1. **Given** que el sistema está desplegado, **When** navego a `admin.salesflow.app`, **Then** veo una pantalla de inicio de sesión exclusiva para Superadmins.
2. **Given** un inicio de sesión exitoso, **When** ingreso credenciales válidas, **Then** soy redirigido al Dashboard.

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) Crear infraestructura SPA y UI Base
  - [x] Subtask 1.1: Inicializar el proyecto con Vite 8 y React 19 en el directorio `superadmin-frontend/`. Copiar configuraciones base (vite, eslint, package.json dependencies) desde `frontend/` para mantener consistencia.
  - [x] Subtask 1.2: Configurar el puerto explícito del dev server a `5174` en `vite.config.js` para asegurar consistencia de CORS.
  - [x] Subtask 1.3: Configurar las variables de entorno (`.env` local) con `VITE_API_URL` apuntando al backend.
  - [x] Subtask 1.4: Configurar `react-router-dom` (v7) para las rutas `/login` y `/`.
  - [x] Subtask 1.5: Implementar un componente `ProtectedRoute` que intercepte usuarios no autenticados y redirija a `/login`.
  - [x] Subtask 1.6: Implementar la vista de `/login` y su formulario utilizando TailwindCSS v4.
  - [x] Subtask 1.7: Implementar un Dashboard `/` vacío protegido para probar la redirección, que incluya un botón de Logout básico para limpiar el token.

- [x] Task 2 (AC: 2) Conectar la Autenticación con Backend
  - [x] Subtask 2.1: Crear un cliente API basado en `fetch` nativo (sin Axios) que inyecte automáticamente el header `Authorization: Bearer <token>`, usando un patrón idéntico a `frontend/src/services/api.js`.
  - [x] Subtask 2.2: Implementar la lógica de autenticación usando Zustand v5 para el manejo global del estado de sesión, consistente con el frontend principal.
  - [x] Subtask 2.3: Enviar las credenciales del formulario al endpoint `/api/superadmin/auth/login`.
  - [x] Subtask 2.4: Manejar estados de error de red y códigos de estado `429`, `401`, y `403`.
  - [x] Subtask 2.5: Guardar el token de autenticación devuelto explícitamente en `localStorage` (gestionado a través de Zustand persist).
  - [x] Subtask 2.6: Redirigir al Dashboard principal (`/`) al obtener un estado 200 OK.
  - [x] Subtask 2.7: Actualizar la configuración CORS del backend para permitir solicitudes desde el nuevo SPA (`http://localhost:5174` y `admin.salesflow.app`).

- [x] Task 3 (AC: 1) Containerización e Integración de la SPA (AD-3)
  - [x] Subtask 3.1: Crear un `Dockerfile` en `superadmin-frontend/` que utilice una imagen base de Nginx para servir el build estático.
  - [x] Subtask 3.2: Incluir un `nginx.conf` configurado para manejar el fallback de React Router (`try_files $uri $uri/ /index.html;`).
  - [x] Subtask 3.3: Actualizar `docker-compose.yml` en la raíz para incluir el nuevo servicio `superadmin-frontend`, mapeando el puerto al host como `4006:80`, y orquestándolo junto al backend.

## Dev Notes

- **Relevant architecture patterns and constraints:**
  - This is a standalone React SPA, completely isolated from the vendor frontend for security (FR-S1.1).
  - Use TailwindCSS v4 to maintain styling ecosystem consistency with the main frontend, while keeping the UI visually distinct for the Superadmin persona.
  - Maintain stack consistency with `frontend/`: React 19, Vite 8, Zustand 5, and native `fetch`. Do NOT introduce Axios or other redundant libraries.
  - **AD-3 Compliance:** The SPA MUST be containerized using Docker and Nginx. This is mandatory, not optional.
- **Source tree components to touch:**
  - `superadmin-frontend/*` (Entirely new directory at root).
  - `backend/` (Only to update CORS configuration).
  - `docker-compose.yml` (To add the new service).
- **Testing standards summary:**
  - Ensure the local dev server can reach the API without CORS issues and that the `ProtectedRoute` correctly enforces authentication.

### Project Structure Notes

- **Alignment with unified project structure (paths, modules, naming):** `superadmin-frontend/` should be placed alongside `backend/` and any other frontends.
- **Detected conflicts or variances (with rationale):** The Docker container for the SPA must include Nginx configuration for client-side routing, conforming to AD-3.

### References

- [Source: `_bmad-output/planning-artifacts/epics-superadmin-saas.md#Epic 1`] Epic 1 - Story 1.2.
- Backend Endpoint created in Story 1.1: `POST /api/superadmin/auth/login`.

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro

### Debug Log References
- `e34477b6-e4b4-48ba-9b1a-9f6d90502b60`

### Completion Notes List
- Scaffolded Vite React SPA targeting port 5174.
- Implemented Zustand auth store with localStorage persistence.
- Built a native fetch wrapper for token injection matching main app patterns.
- Created premium UI for Login and Dashboard using TailwindCSS v4.
- Configured React Router v7 with ProtectedRoutes.
- Backend CORS updated dynamically to allow the new domains.
- Created Nginx docker configurations (Dockerfile & nginx.conf).
- Added superadmin-frontend to `docker-compose.yml` with port 4006.

### File List
- `superadmin-frontend/package.json`
- `superadmin-frontend/vite.config.js`
- `superadmin-frontend/src/index.css`
- `superadmin-frontend/src/App.jsx`
- `superadmin-frontend/src/components/ProtectedRoute.jsx`
- `superadmin-frontend/src/store/authStore.js`
- `superadmin-frontend/src/services/api.js`
- `superadmin-frontend/src/pages/Login.jsx`
- `superadmin-frontend/src/pages/Dashboard.jsx`
- `superadmin-frontend/nginx.conf`
- `superadmin-frontend/Dockerfile`
- `backend/src/app.js`
- `docker-compose.yml`

### Senior Developer Review (AI)
#### Action Items
- [x] [Review][Decision] Seguridad del Token en LocalStorage — Los tokens se guardan en texto plano en Zustand. ¿Deseas ofuscar/encriptar el storage o lo dejamos estándar por ahora?
- [x] [Review][Patch] CORS vulnerable — El bloque else permite todos los orígenes [backend/src/app.js:46]
- [x] [Review][Patch] Falta interceptor 401/403 global — Redirigir al login al expirar el token [superadmin-frontend/src/services/api.js:33]
- [x] [Review][Patch] Fallos de red no manejados en fetch — Evitar crash si no hay respuesta de red [superadmin-frontend/src/services/api.js:20]
- [x] [Review][Patch] Dockerfile omite ARG VITE_API_URL — Evitar fallback a localhost en prod [superadmin-frontend/Dockerfile:12]
- [x] [Review][Patch] Parseo de JSON inseguro — Crash si la API devuelve 200 con cuerpo vacío [superadmin-frontend/src/services/api.js:43]
- [x] [Review][Patch] Timeout de peticiones — Falta AbortController para peticiones colgadas [superadmin-frontend/src/services/api.js:18]
- [x] [Review][Patch] Crash en Login por respuesta nula — Validar response antes de acceder a success [superadmin-frontend/src/pages/Login.jsx:23]
- [x] [Review][Patch] Espacios en blanco en Email — Aplicar trim() al correo antes de enviar [superadmin-frontend/src/pages/Login.jsx:21]
- [x] [Review][Patch] Dashboard usa <a> en lugar de <Link> — Rompe navegación de SPA [superadmin-frontend/src/pages/Dashboard.jsx:20]
- [x] [Review][Patch] Headers de seguridad NGINX — Faltan CSP y HSTS [superadmin-frontend/nginx.conf]
- [x] [Review][Patch] NGINX try_files omite query strings — Usar ?$args [superadmin-frontend/nginx.conf:10]
- [x] [Review][Patch] docker-compose expone 4006 globalmente — Restringir a 127.0.0.1:4006 [docker-compose.yml:45]
- [x] [Review][Patch] vite.config.js sin host:true — Dificulta ejecución futura en Docker [superadmin-frontend/vite.config.js:8]
- [x] [Review][Defer] Dashboard usa dummy data — deferred, placeholder explícito para historias futuras

### Senior Developer Review (Pass 2)
#### Action Items
- [x] [Review][Patch] Login.jsx llama ruta sin /api — Agregar prefijo /api/superadmin/auth/login [superadmin-frontend/src/pages/Login.jsx:21]
- [x] [Review][Patch] Falta pasar ARG VITE_API_URL en docker-compose — Pasar args en el build block [docker-compose.yml]
- [x] [Review][Patch] authStore guarda nulls encriptados en logout — Usar removeItem en vez de encriptar el null [superadmin-frontend/src/store/authStore.js]
- [x] [Review][Patch] FRONTEND_URL con trailing slash rompe CORS — Limpiar trailing slash en app.js [backend/src/app.js]
- [x] [Review][Defer] Vulnerabilidades menores (CORS !origin, root en Nginx, variables de entorno compiladas, UI no responsiva en Dashboard) — deferred, aceptable para MVP.

### Senior Developer Review (Pass 3)
#### Action Items
- [x] [Review][Patch] Enlace erróneo en Dashboard — to="/dashboard" debe ser to="/" [superadmin-frontend/src/pages/Dashboard.jsx:18]
- [x] [Review][Patch] Reload al fallar login — el interceptor 401 recarga la página al ingresar mal la contraseña [superadmin-frontend/src/services/api.js:40]
- [x] [Review][Patch] CSP connect-src hardcodeado — rompe despliegues en otros dominios [superadmin-frontend/nginx.conf]
- [x] [Review][Defer] oxlint en vez de eslint, crypto-js no solicitado — deferred, fue autorizado previamente.

### Senior Developer Review (Pass 4)
#### Action Items
- [x] [Review][Patch] Dockerignore faltante — Creado .dockerignore para no enviar node_modules al daemon [superadmin-frontend/.dockerignore]
- [x] [Review][Patch] Inputs de login no se deshabilitan — Se agregó disabled={loading} [superadmin-frontend/src/pages/Login.jsx]
- [x] [Review][Patch] Check de pathname incorrecto — Se cambió a exact match !== '/login' [superadmin-frontend/src/services/api.js]
- [x] [Review][Defer] Enlaces a rutas futuras redirigen a / — deferred, comportamiento esperado de catch-all.
