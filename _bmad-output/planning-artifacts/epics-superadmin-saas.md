---
stepsCompleted: [1, 2]
inputDocuments: ["_bmad-output/planning-artifacts/prds/prd-superadmin-saas-2026-07-28/prd.md", "_bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md"]
---

# Superadmin SaaS Module - Epic Breakdown

## Overview

This document provides the epic and story breakdown for the Superadmin SaaS Management module, decomposing the requirements from its PRD and Architecture spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-S1.1: Deploy Superadmin dashboard as a standalone React SPA for security and isolation.
FR-S1.2: Display global metrics: total active tenants, total AI tokens/messages consumed, and total connected users.
FR-S2.1: Superadmin can provision a new Tenant with Company Name, Domain, and initial ADMIN credentials.
FR-S2.2: Superadmin can suspend/activate a Tenant. Suspended tenants block logins and webhook processing.
FR-S2.3: Superadmin can view a paginated, sortable list of all tenants.
FR-S3.1: Enforce configurable limits on the number of active users per Tenant.
FR-S3.2: Enforce configurable limits on monthly AI messages/tokens per Tenant.
FR-S3.3: Enforce strict limit of 1 connected WhatsApp number per Tenant.
FR-S3.4: Superadmin can assign permanent "software purchase" licenses to a Tenant, permanently enabling specific user seats without recurring monthly limits.

### NonFunctional Requirements

NFR1: Security - API routes `/api/superadmin/*` strictly protected by `isSuperadmin` middleware, denying regular ADMINs.
NFR2: Data Isolation - Superadmin queries must bypass standard tenant-scoping middleware.

### Additional Requirements

- AD-1: Create `Superadmin` table in Prisma and separate login route `/api/superadmin/auth/login`.
- AD-2: Create parallel service ecosystem (e.g., `superadmin.tenant.service.js`) to leave existing logic untouched.
- AD-3: Deploy the Superadmin SPA in a separate Docker container mapped to a subdomain.
- AD-4: Enforce quotas at the service mutation boundaries.

### UX Design Requirements

(No UX design document provided for this module)

### FR Coverage Map

FR-S1.1: Epic 1 - Ciclo de Vida de Inquilinos
FR-S1.2: Epic 3 - Telemetría Global SaaS
FR-S2.1: Epic 1 - Ciclo de Vida de Inquilinos
FR-S2.2: Epic 1 - Ciclo de Vida de Inquilinos
FR-S2.3: Epic 1 - Ciclo de Vida de Inquilinos
FR-S3.1: Epic 2 - Motor de Monetización y Licenciamiento
FR-S3.2: Epic 2 - Motor de Monetización y Licenciamiento
FR-S3.3: Epic 2 - Motor de Monetización y Licenciamiento
FR-S3.4: Epic 2 - Motor de Monetización y Licenciamiento

## Epic List

### Epic 1: Ciclo de Vida de Inquilinos (El Motor de Onboarding)
El Superadmin puede acceder a su portal seguro y gestionar el acceso básico de sus clientes sin tocar la base de datos.
**FRs covered:** FR-S1.1, FR-S2.1, FR-S2.2, FR-S2.3

### Epic 2: Motor de Monetización y Licenciamiento
El Superadmin puede definir los límites de consumo y vender modelos de licenciamiento permanentes, asegurando la rentabilidad del SaaS.
**FRs covered:** FR-S3.1, FR-S3.2, FR-S3.3, FR-S3.4

### Epic 3: Telemetría Global SaaS (El Centro de Observación)
El Superadmin obtiene un panorama general del uso de los recursos de todo el servidor en tiempo real.
**FRs covered:** FR-S1.2

## Epic 1: Ciclo de Vida de Inquilinos

El Superadmin puede acceder a su portal seguro y gestionar el acceso básico de sus clientes sin tocar la base de datos.

### Story 1.1: Autenticación Base del Superadmin
As a Desarrollador Backend,
I want crear la entidad independiente de Superadmin y sus rutas de autenticación,
So that los administradores globales puedan iniciar sesión de forma segura sin mezclarse con la tabla de usuarios regulares.

**Acceptance Criteria:**
**Given** que no existe una tabla de superadministradores,
**When** ejecuto una migración de Prisma,
**Then** se crea la tabla `Superadmin` (independiente de `User`).

**Given** que un Superadmin intenta acceder al sistema,
**When** envía sus credenciales al endpoint `/api/superadmin/auth/login`,
**Then** el sistema valida la contraseña y devuelve un JWT con un claim especial.

**Given** una ruta protegida para el Superadmin,
**When** un usuario regular (`User`) con rol `ADMIN` intenta acceder con su JWT,
**Then** un nuevo middleware `isSuperadmin` rechaza la petición con un `403 Forbidden`.

### Story 1.2: Infraestructura del Dashboard SPA
As a Superadmin,
I want acceder a un portal web independiente,
So that pueda gestionar la plataforma sin usar la interfaz de los vendedores.

**Acceptance Criteria:**
**Given** que el sistema está desplegado,
**When** navego a `admin.salesflow.app`,
**Then** veo una pantalla de inicio de sesión exclusiva para Superadmins.
**And** al iniciar sesión correctamente, soy redirigido al Dashboard.

### Story 1.3: Listado Global de Inquilinos
As a Superadmin,
I want ver una lista de todos los inquilinos,
So that pueda monitorear quiénes están registrados en la plataforma.

**Acceptance Criteria:**
**Given** que estoy logueado en el panel,
**When** navego a la sección "Inquilinos",
**Then** veo una tabla con todos los tenants (Nombre, Dominio, Fecha de Creación, Estado).
**And** los datos provienen de un nuevo servicio backend `superadmin.tenant.service.js`.

### Story 1.4: Alta de Inquilinos (Provisionamiento)
As a Superadmin,
I want crear nuevos inquilinos desde la interfaz,
So that no dependa de operaciones manuales en la base de datos.

**Acceptance Criteria:**
**Given** que estoy en la lista de Inquilinos,
**When** lleno el formulario de "Nuevo Inquilino" (Empresa, Dominio, Email Admin, Contraseña),
**Then** el sistema crea el `Tenant` y su primer `User` (ADMIN) en un solo bloque transaccional.

### Story 1.5: Suspensión de Inquilinos
As a Superadmin,
I want poder suspender o reactivar el acceso de un inquilino,
So that pueda bloquear el servicio a clientes morosos.

**Acceptance Criteria:**
**Given** un inquilino activo,
**When** hago clic en "Suspender",
**Then** el estado del tenant cambia a "Suspended".
**And** ningún usuario de ese tenant puede iniciar sesión ni el webhook de WhatsApp procesa mensajes.

## Epic 2: Motor de Monetización y Licenciamiento

El Superadmin puede definir los límites de consumo y vender modelos de licenciamiento permanentes, asegurando la rentabilidad del SaaS.

### Story 2.1: Esquema de Cuotas y Licencias en BD
As a Desarrollador Backend,
I want agregar los campos de licenciamiento al Tenant,
So that el sistema sepa qué límites aplicar a cada cliente.

**Acceptance Criteria:**
**Given** el esquema de base de datos actual,
**When** ejecuto la migración,
**Then** la tabla `Tenant` incluye campos para `maxUsers`, `maxAiTokens`, y `licenseType` (enum: SUBSCRIPTION, LIFETIME).

### Story 2.2: Interfaz de Gestión de Licencias
As a Superadmin,
I want asignar límites o licencias permanentes a los clientes,
So that pueda configurar lo que compraron.

**Acceptance Criteria:**
**Given** que estoy viendo los detalles de un Inquilino,
**When** modifico su configuración de licencias,
**Then** puedo establecer números enteros para los límites o marcar la cuenta como LIFETIME.

### Story 2.3: Enforcement de Cuotas de Asientos
As a Dueño del SaaS,
I want que el sistema rechace la creación de nuevos usuarios si el cliente llegó a su límite,
So that se respete el modelo de negocio.

**Acceptance Criteria:**
**Given** un inquilino con límite de 5 usuarios,
**When** el Admin del inquilino intenta crear el usuario número 6,
**Then** el API devuelve un error `402 Payment Required` o `403 Forbidden` indicando que excedió la cuota.

### Story 2.4: Enforcement de Consumo de IA
As a Dueño del SaaS,
I want que la IA deje de procesar mensajes si el cliente superó su cuota mensual (y no es LIFETIME),
So that no gaste de más en la API de Google/OpenAI.

**Acceptance Criteria:**
**Given** un cliente en modelo SUBSCRIPTION que superó su límite de tokens,
**When** un mensaje entrante de WhatsApp intenta ser procesado por la IA,
**Then** el servicio lo rechaza y lo asigna directamente a un humano (o envía un mensaje de fuera de servicio).

## Epic 3: Telemetría Global SaaS

El Superadmin obtiene un panorama general del uso de los recursos de todo el servidor en tiempo real.

### Story 3.1: Agregación de Métricas Globales
As a Desarrollador Backend,
I want un endpoint que sume las métricas globales,
So that el frontend pueda pintarlas rápido.

**Acceptance Criteria:**
**Given** múltiples inquilinos operando,
**When** el Superadmin consulta `/api/superadmin/metrics`,
**Then** el endpoint retorna el conteo de Tenants, total de usuarios y estimación de IA consumida.

### Story 3.2: Dashboard Resumen
As a Superadmin,
I want ver las métricas globales apenas inicio sesión,
So that entienda la salud de mi negocio.

**Acceptance Criteria:**
**Given** un inicio de sesión exitoso,
**When** carga el Dashboard,
**Then** veo widgets con los totales globales obtenidos del backend.
