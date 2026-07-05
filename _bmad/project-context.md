---
project_name: 'multi-chat-ia'
user_name: 'Oscar Rodríguez'
date: '2026-03-27'
status: 'production-live'
rule_count: 42
sections_completed: ['technology_stack', 'story_delivery_requirements', 'language_rules', 'framework_rules', 'code_quality', 'dev_workflow', 'critical_rules', 'deployment']
optimized_for_llm: true
deployment_url: 'https://chat.sealmarket.net'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Frontend (JavaScript)
- **Language**: JavaScript (JSX) - NO TypeScript
- **Runtime**: React 19.2.4
- **Bundler**: Vite 8.0.0
- **Styling**: Tailwind CSS 4.2.1 (usa `@tailwindcss/postcss`, NO configuración v3)
- **Routing**: React Router 7.13.1
- **Animations**: Framer Motion 12.36.0
- **Icons**: Lucide React 0.577.0
- **Module System**: ES Modules (`import`/`export`)
- **Documentation**: JSDoc 3

### Backend (JavaScript)
- **Runtime**: Node.js
- **Framework**: Express 5.2.1
- **ORM**: Prisma 6.x (PostgreSQL)
- **Database**: PostgreSQL 16
- **AI Provider**: Gemini (preferido, via Adapter Pattern en services/ai.service.js)
- **Real-time**: Socket.IO
- **Auth**: JWT 9.0.3 + bcryptjs 3.0.3
- **PDF**: PDFKit 0.18.0
- **Module System**: CommonJS (`require`/`module.exports`)
- **Docker Base Image**: node:20-alpine con libssl1.1
- **Documentation**:  Swagger UI Express 5.x

### Linting & Formatting
- **Frontend ESLint**: 9.39.4 (flat config)
- **Backend ESLint**: 10.0.3
- **Prettier**: 3.8.1

### Testing (PENDIENTE - No configurado)
- Backend: Sin test framework (requiere agregar jest o mocha)
- Frontend: Sin test framework (recomendado: Vitest + React Testing Library)
- IndexedDB: Requiere `fake-indexeddb` para tests unitarios

---

## Definition of Done (DoD) - MVP Pragmático

_Standard de completitud para historias de usuario. Enfocado en entregar valor rápido, no en paperwork._

### Código
- Feature implementada según AC
- Convenciones de nomenclatura seguidas
- Sin código commented-out o debug leftover

### Testing (Enfoque MVP)
| Tipo de Cambio | Tests Requeridos |
|----------------|------------------|
| Nueva API/endpoint | Unit + Integration |
| Nuevo componente UI | Unit (component) |
| Cambio en lógica negocio | Unit (lógica crítica) |
| Cambio en BD | Integration |
| Fix de bug | Regression test + bug-specific |

**Cobertura pragmática (no restrictiva):**
- Lógica de negocio: 70%+ coverage
- Routes/Services: 80%+ coverage
- Components UI: Focus en E2E, no coverage mínimo obligatorio

**Regla CRÍTICA:**
- ✅ Todos los tests pasando antes de PR
- ❌ NUNCA merge con tests skipped o commented

### Calidad
- `npm run lint` passing
- `npm run format` applied
- Sin `console.log` / `console.error` leftover

### Documentación
- Comments en código no obvio
- README updates solo si hay setup changes
- Generar con JSDoc y Swagger

---

## Story Delivery Checklist

```
ENTREGA DE HISTORIA - CHECKLIST:

[ ] Feature implementada según AC
[ ] AC 100% cumplidos
[ ] Tests pasando (todos, sin skip)
[ ] Linting passing
[ ] Formatting applied
[ ] Sin console.log/debug code leftover
[ ] README actualizado (solo si necesario)
[ ] Variables .env documentadas (si aplica)
```

**Principio: Ship it and iterate.** Reglas pragmáticas sobre ceremony excesiva.

---

## Language-Specific Rules

### JavaScript Module Systems - CRÍTICO

**Frontend = ES Modules:**
```javascript
// CORRECTO
import React from 'react';
import { apiFetch } from './services/api';

// INCORRECTO - No usar CommonJS en frontend
const api = require('./api');
```

**Backend = CommonJS:**
```javascript
// CORRECTO
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// INCORRECTO - Sin configuración ESM especial
import express from 'express';
```

### ESLint Rule - Variables No Usadas
```javascript
// ESLint ignora variables que empiezan con MAYÚSCULA
const { data, STATUS, CONFIG } = response;
// 'data' genera error si no se usa, 'STATUS' y 'CONFIG' OK
```

### Async/Await Error Handling
```javascript
// SIEMPRE usar try/catch en operaciones async
async function createClient(data) {
  try {
    return await prisma.client.create({ data });
  } catch (error) {
    console.error('Create client error:', error);
    throw error;
  }
}
```

---

## Framework-Specific Rules

### React (Frontend)

**Hooks Order:**
```jsx
const Component = ({ prop1 }) => {
  // 1. Hooks primero
  const [state, setState] = useState();
  useEffect(() => {}, []);
  
  // 2. Handlers
  const handleClick = () => {};
  
  // 3. Render
  return <div>...</div>;
};
```

**API Calls:**
```javascript
// Usar apiFetch centralizado - maneja 401 automáticamente
const clients = await apiFetch('/clients');
```

### Express (Backend)

**Route Pattern:**
```javascript
// TODAS las rutas con authMiddleware
router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await prisma.entity.findMany({
      where: { companyId: req.user.companyId }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

---

## Code Quality & Style Rules

### File Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.jsx | `ClientCard.jsx` |
| Pages | PascalCase.jsx | `Dashboard.jsx` |
| Services/Utils | camelCase.js | `api.js`, `sync.js` |
| Hooks | camelCase.js | `useAuth.js` |

### Code Organization
```
frontend/src/
├── components/      # Reusable components
│   ├── ui/          # UI primitives
│   ├── layout/      # Layout components
│   └── [feature]/   # Feature-specific
├── features/        # Feature modules
├── hooks/           # Custom hooks
├── pages/           # Page components
└── services/        # API, DB, Sync

backend/src/
├── routes/          # Express routes
├── middleware/      # Auth, RBAC
└── services/        # Business logic
```

### Tailwind Classes Order
```jsx
// Layout → Sizing → Colors → Effects → Typography
<div className="flex items-center justify-center w-full h-12 bg-blue-600 text-white rounded-lg shadow-md font-bold">
```

---

## Development Workflow Rules

### Git Conventions

**Branch Naming:**
```
feature/TICKET-description    # Nuevas features
bugfix/TICKET-description     # Bug fixes
hotfix/TICKET-description     # Fixes urgentes
release/v1.0.0                # Releases
```

**Commit Message Format:**
```
type(scope): description

Types:
- feat: nueva funcionalidad
- fix: corrección de bug
- docs: cambios en documentación
- style: formateo, lint (sin cambio de código)
- refactor: refactorización de código
- test: agregar tests
- chore: tareas de mantenimiento

Ejemplos:
feat(clients): add client search functionality
fix(visits): resolve status update bug
docs(api): update endpoint documentation
```

**File Naming (commits):**
- Mantener commits atómicos (un cambio = un commit)
- Max 72 caracteres en mensaje
- Usar imperativo: "add" no "added"

### Deployment

**Estado:** ✅ PRODUCCIÓN ACTIVA

**Infraestructura:**
- VPS Server (77.237.244.27)
- Dominio: sealmarket.net
- Subdominio: chat.sealmarket.net
- PostgreSQL 16 en puerto 5432

**Docker Stack:**
```
app/          → node:20-alpine (Contenedor único: Express sirve el build de React)
postgres:16   → PostgreSQL (puerto 5432)
```

**URLs de Producción:**
| Servicio | URL |
|----------|-----|
| Frontend | https://chat.sealmarket.net |
| Backend API | https://chat.sealmarket.net/api |
| Health Check | https://chat.sealmarket.net/health |

**Archivos de Deployment:**

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Orquestación de servicios |
| `backend/Dockerfile` | Imagen producción backend |
| `frontend/Dockerfile` | Imagen producción frontend |
| `frontend/nginx.conf` | Configuración nginx (desarrollo) |
| `frontend/nginx.production.conf` | Configuración nginx (producción con SSL) |
| `.env.production.example` | Template variables de producción |
| `.gitignore` | Ignora Dockerfiles (usar `!backend/Dockerfile`) |

---

## Documentation Standards

### Backend: Swagger/OpenAPI

**Stack:**
- `swagger-jsdoc` - Definir specs en comentarios JSDoc
- `swagger-ui-express` - Servir documentación en `/api-docs`

**Setup:**
```javascript
// backend/src/index.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat Seal Market API',
      version: '1.0.0',
    },
    servers: [{ url: '/api' }],
  },
  apis: ['./src/routes/*.js'],
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(options)));
```

**Route Documentation Pattern:**
```javascript
/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Obtiene lista de clientes
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client'
 */
router.get('/', authMiddleware, async (req, res) => {
  // ...
});
```

**Schema Documentation:**
```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         rfc:
 *           type: string
 *         type:
 *           type: string
 *           enum: [fabricante, distribuidor, usuario_final]
 */
```

### Frontend: JSDoc

**Configuration (.jsdoc.json):**
```json
{
  "plugins": ["jsdoc-plugin-mentions"],
  "source": { "includePattern": "\\.jsx?$" },
  "templates": { "cleverLinks": true }
}
```

**Component Documentation:**
```jsx
/**
 * ClientCard - Componente para mostrar información resumida de cliente
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.client - Datos del cliente
 * @param {Function} props.onClick - Callback al hacer click
 * @param {string} props.className - Clases CSS adicionales
 * @returns {JSX.Element}
 * 
 * @example
 * <ClientCard 
 *   client={{ name: 'Acme SA', rfc: 'ACM001' }}
 *   onClick={() => handleSelect(client)}
 * />
 */
const ClientCard = ({ client, onClick, className = '' }) => {
  // ...
};
```

**Function Documentation:**
```javascript
/**
 * Guarda cliente en IndexedDB y queuea operación de sync
 * 
 * @async
 * @param {Object} clientData - Datos del cliente a guardar
 * @param {string} clientData.name - Nombre del cliente
 * @param {string} clientData.rfc - RFC del cliente
 * @returns {Promise<number>} ID del cliente guardado
 * @throws {Error} Si falla la validación de datos
 * 
 * @example
 * const id = await syncDB.saveClient({ name: 'Acme', rfc: 'ACM001' });
 */
async saveClient(clientData) {
  // ...
}
```

**Hook Documentation:**
```javascript
/**
 * Hook personalizado para sincronización offline
 * 
 * @hook
 * @returns {Object} Estado y métodos de sincronización
 * @returns {boolean} returns.isOnline - Si hay conexión
 * @returns {boolean} returns.isSyncing - Si está sincronizando
 * @returns {Function} returns.sync - Función para forzar sync
 * 
 * @example
 * const { isOnline, sync } = useSync();
 */
const useSync = () => {
  // ...
};
```

### DoD: Documentation Requirements

| Tipo de Cambio | Documentación Requerida |
|----------------|------------------------|
| Nuevo endpoint API | Swagger JSDoc comments |
| Nuevo componente | JSDoc comments |
| Nueva función util | JSDoc comments |
| Cambio en API | Actualizar Swagger schema |
| Nuevo feature module | README en folder |

---

## Critical Don't-Miss Rules

### Anti-Patterns to AVOID

```javascript
// ❌ NO: Mezclar CommonJS y ESM
// Backend usa require(), frontend usa import

// ❌ NO: Hardcodear URLs de API
fetch('http://localhost:4000/api/clients'); // ❌
// USAR:
fetch(`${API_URL}/clients`); // ✅ O usar apiFetch()

// ❌ NO: Dejar console.log en producción
console.log('debug:', data); // ❌ Eliminar antes de PR
```

### Security Rules - CRÍTICAS

```javascript
// ✅ No exponer IDs internos en errores
res.status(500).json({ error: 'Internal server error' }); // ✅
res.status(500).json({ error: error.message }); // ❌ Expone detalles
```

### PostgreSQL Credentials

```yaml
# docker-compose.yml
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

### Logging for Debugging

```javascript
// En backend, usar logs descriptivos para debugging
console.log(`[AUTH] Login attempt for: ${email}`);
console.log(`[AUTH] User not found: ${email}`);
console.log(`[AUTH] Login error:`, error.message);
```

### Performance Gotchas

```javascript
// ❌ NO: Queries N+1
for (const client of clients) {
  client.contacts = await prisma.contact.findMany({ where: { clientId: client.id } });
}

// ❌ NO: Renderizar arrays sin keys
clients.map(c => <ClientCard {...c} />); // ❌
// ✅ USAR: keys únicas
clients.map(c => <ClientCard key={c.id} {...c} />);
```

### Offline-First Gotchas (Dexie)

```javascript
// ❌ NO: Olvidar marcar como synced después de sync
await syncDB.saveClient(client);
await syncService.sync();

// ✅ USAR: pendingOperations para cola de sync
await syncDB.queueOperation('create', 'client', client);

// ❌ NO: Olvidar cleanup en useEffect
useEffect(() => {
  const sub = subscribe(handler);
  return () => sub.unsubscribe(); // ← Cleanup CRÍTICO
}, []);
```

### Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Token expirado (401) | `apiFetch` maneja automáticamente, redirige a login |
| Conflictos de sync | Last-write-wins con notificación |
| Campos undefined | Prisma ignora undefined, verificar en create |
| JWT malformado | Middleware auth retorna 401 |

---

## Scrum & Process Lifecycle

### Product Vision
**Multichannel Sales IA SaaS** es una plataforma multi-tenant diseñada para equipos de ventas industriales en línea en México. Su objetivo es gestionar procesos de venta técnica a través de un chat de WhatsApp alternando entre un agente IA especializado RAG y varios vendedores, con un administrador que gestiona el modo de atención y asigna clientes a un determinado vendedor.

### Scrum Roles
- **Product Owner (PO):** Oscar Rodríguez- Responsable de priorizar el backlog y clarificar requerimientos de negocio.
- **Scrum Master:** Responsable de facilitar ceremonias y eliminar impedimentos.
- **Development Team:** Integrado por desarrolladores y agentes de IA encargados de implementar historias según los Criterios de Aceptación (AC).
- **Stakeholders:** Vendedores (campo), Coordinadores (supervisión) y Gerentes de Ventas.

### Story Format & Acceptance Criteria (AC)
Todas las historias deben seguir el formato:
- **Como** [rol], **quiero** [acción], **para** [beneficio].
- **Criterios de Aceptación (AC):** Lista clara de condiciones que deben cumplirse para dar por terminada la historia. Deben ser atómicos y testeables.

### Definition of Ready (DoR)
Una historia está "Lista" para entrar al Sprint si cumple:
- **AC definidos:** Los criterios de aceptación son claros y sin ambigüedades.
- **Diseño Revisado:** Las interfaces o flujos necesarios están definidos.
- **Dependencias resueltas:** No hay bloqueos técnicos o de negocio externos.
- **Estimada:** El equipo comprende el alcance y esfuerzo necesario.

### Sprint Cadence
- **Duración:** 2 semanas (recomendado).
- **Ceremonias:** Daily Standup, Planning, Review y Retrospective.

### Management Tools
- **Backlog & Board:** [Definir herramienta de gestión de tareas].
- **Comunicación:** [Definir canales de comunicación del equipo].

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time
