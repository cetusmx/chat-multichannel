---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad/project-context.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-ui-design.md
workflowType: 'architecture'
status: 'complete'
lastStep: 8
completedAt: '2026-05-07'
project_name: 'chat-multichannel-sales-ia'
user_name: 'Jefazo'
date: '2026-05-07'
stack_changes:
  - date: '2026-05-07'
    change: 'Database migration from MySQL to PostgreSQL 16'
    reason: 'Decision del equipo - mejor soporte para features como JSONB, full-text search, y mejor ecosistema para datos no estructurados'
  - date: '2026-05-07'
    change: 'ORM migration from Sequelize 6 to Prisma 6'
    reason: 'Mejor type-safety, DX, migraciones automáticas, y soporte nativo para features de PostgreSQL'
  - date: '2026-05-07'
    change: 'AI Provider Adapter Pattern + Gemini preference'
    reason: 'Desacoplar lógica de negocio del proveedor LLM; Gemini como default por balance costo/velocidad'
  - date: '2026-05-07'
    change: 'Mobile project structure defined'
    reason: 'Mobile app (React Native) para vendedores incluida en MVP fase 2'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (38 FRs):**

| Categoría | FRs | Implicancia Arquitectónica |
|-----------|-----|---------------------------|
| User Management & Auth | FR1-FR5 | RBAC multi-tenant, JWT 24h con refresh |
| Conversation Management | FR6-FR12 | Chat persistente + búsqueda full-text + sistema de tagging |
| AI Agent & RAG | FR13-FR18 | Pipeline RAG por tenant, state machine de escalamiento IA→humano |
| Client Assignment & Routing | FR19-FR23 | Motor de asignación round-robin + reasignación con preservación de contexto |
| Supervision & Control | FR24-FR28 | Monitoreo SLA en tiempo real, alertas proactivas, dashboard de métricas |
| Mobile Experience | FR29-FR31 | Push notifications (FCM + APNs), chat mobile con contexto completo |
| Multi-Tenant Admin | FR32-FR35 | Instance isolation, API keys por tenant, RAG content management |
| Integrations | FR36-FR38 | Webhooks WhatsApp, Send API, media handling pipeline |

**Non-Functional Requirements (23 NFRs):**

| Categoría | Cantidad | Targets Clave |
|-----------|----------|---------------|
| Performance | 5 | Mensajes <3s, IA <5s, búsqueda <2s, handoff <1s |
| Security | 6 | TLS 1.3, AES-256, JWT 24h, auditoría completa, LFPDPPP |
| Scalability | 4 | Instancias dedicadas por tenant, 100 msg concurrentes |
| Integration | 4 | WhatsApp 99.5%, fallback IA, rate limiting con backoff |
| Reliability | 4 | 99.5% uptime, recovery <5min, backup diario |

### Scale & Complexity

- **Complejidad**: Alta (SaaS multi-tenant + IA/LLM + tiempo real + mobile + web)
- **Dominio primario**: Full-stack (Backend API + Web App + Mobile App)
- **Componentes arquitectónicos estimados**: 12-15 (Auth Service, Message Proxy, AI Agent, RAG Engine, Assignment Engine, SLA Monitor, Push Service, Webhook Handler, Media Service, Tenant Manager, API Gateway, Sync Engine)

### Technical Constraints & Dependencies

| Dependencia | Estado | Observaciones |
|-------------|--------|---------------|
| WhatsApp Business API | ✅ Aprobada y verificada | Webhooks + Send API + Media API |
| Proveedor IA | 🔄 Por definir | Anthropic, OpenAI, GoogleAI, DeepSeek |
| Push Notifications | 🔄 Por implementar | FCM (Android) + APNs (iOS) |
| PostgreSQL 16 | 🔄 Migración desde MySQL | Decisión tomada - actualizar stack |

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend Web | React 19 + Vite 8 + Tailwind 4 + Framer Motion 12 |
| Mobile | React Native |
| Backend | Node.js + Express 5 + Prisma 6 |
| Base de Datos | PostgreSQL 16 |
| Auth | JWT + bcryptjs |
| Infraestructura | Docker (nginx + node:20-alpine + postgres:16) |

### Cross-Cutting Concerns Identified

1. **Multi-tenancy (Instance Isolation)** — BD separada por tenant, dominio dedicado, infraestructura aislada
2. **RBAC** — Matriz de 3 roles (Admin, Coordinador, Vendedor) con granularidad fina
3. **Real-time Messaging** — WebSocket o SSE para actualización en vivo de chats
4. **IA Pipeline** — RAG por tenant, escalamiento automático, off-hours mode
5. **WhatsApp Proxy** — Multiplexación de un número a N vendedores con IA como fallback
6. **Offline Resilience** — Cola de sync y backoff exponencial para pérdidas de conexión
7. **Push Notifications** — Delivery garantizado a iOS y Android desde backend

## Starter Template Evaluation

### Primary Technology Domain

Full-stack: Backend API (Express + Prisma + PostgreSQL) + Web App (React + Vite) + Mobile App (React Native)

### Stack Decisions Documented

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **Build Tool** | Vite 8 | Ya en producción, moderno, rápido |
| **Frontend** | React 19 + Tailwind 4 + Framer Motion 12 | Ya en producción, ecosistema maduro |
| **Backend** | Express 5 + Node.js | Ya en producción, simplicidad |
| **Database** | PostgreSQL 16 | Decisión del equipo (JSONB, full-text search, ecosistema) |
| **ORM** | Prisma 6 | Type-safety, mejor DX que Sequelize, migraciones automáticas |
| **Auth** | JWT + bcryptjs | Ya en producción, stateless |
| **Mobile** | React Native | Código compartido con web (React) |
| **Real-time** | Por definir en ADR | Socket.IO vs WebSocket vs SSE |
| **Testing Frontend** | Vitest + React Testing Library | Por implementar |
| **Testing Backend** | Jest | Por implementar |

### Rationale for ORM Change: Sequelize → Prisma

| Aspecto | Sequelize 6 | Prisma 6 |
|---------|-------------|----------|
| **Type Safety** | Limitado (JS puro) | Total (generated types) |
| **Migrations** | Manual, propenso a errores | Automáticas, versionadas |
| **PostgreSQL Features** | Soporte básico | JSONB, arrays, full-text search nativo |
| **DX** | Verboso, config-heavy | Declarativo, auto-completado |
| **Ecosistema** | Mantenimiento comunitario | Activo, respaldado por Vercel |
| **Migración desde Sequelize** | — | Posible mediante dump de datos |

## Core Architectural Decisions

### Data Architecture

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **Database** | PostgreSQL 16 | JSONB para metadata de mensajes, full-text search para búsqueda en historial, ecosistema robusto |
| **ORM** | Prisma 6 | Type-safety, migraciones automáticas, soporte nativo PostgreSQL |
| **Caching** | Ninguno para MVP | Instance isolation permite in-memory cache simple; Redis se evaluará post-MVP si hay cuellos de botella |
| **Message Queue** | In-memory con backoff | Volumen moderado (100 msg concurrentes); cola persistente no justificada para MVP |

### Authentication & Security

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **Auth Method** | JWT + bcryptjs | Ya en producción, stateless, sin necesidad de sesiones |
| **Token Expiration** | JWT 1h + Refresh Token 7 días | Balance seguridad/experiencia; refresh silencioso evita pérdida de contexto en conversaciones |
| **RBAC** | Middleware por ruta (Express) | Ya implementado, 3 roles (Admin, Coordinador, Vendedor) |
| **Encriptación** | TLS 1.3 (tránsito) + AES-256 (reposo) | Cumplimiento LFPDPPP |
| **2FA/MFA** | Post-MVP | No crítico para MVP |

### API & Communication

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **API Pattern** | REST | Ya implementado en Express 5, familiar, predecible |
| **Real-time Protocol** | Socket.IO | Reconexión automática crítica para vendedores en campo con señal variable; fallback a HTTP polling |
| **API Documentation** | Swagger/OpenAPI | Ya integrado con swagger-jsdoc + swagger-ui-express |

### Frontend Architecture

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **State Management (Auth/Tenant)** | Context API | Estado global de pocos cambios (usuario, tenant, rol) |
| **State Management (Chat/Real-time)** | Zustand | Liviano, actualizaciones frecuentes, ideal para estado de mensajes y conexión Socket.IO |
| **Component Organization** | Feature-based | Cada feature encapsulada (chats, clientes, settings), fácil de navegar |
| **Routing** | React Router 7 | Ya en producción, layout anidado, loaders |

### Infrastructure & Deployment

| Decisión | Opción | Rationale |
|----------|--------|-----------|
| **Orquestación** | Docker Compose | Ya en producción, perfecto para single VPS |
| **CI/CD** | GitHub Actions | Build + test + deploy automático al VPS |
| **Error Monitoring** | Sentry | Plan gratuito generoso, captura errores frontend y backend |
| **Health Checks** | Endpoint /health + UptimeRobot | Ya existe el endpoint, monitoreo gratuito |
| **Deploy Target** | VPS (77.237.244.27) | Ya en producción, sin cambios |

## Implementation Patterns & Consistency Rules

### Naming Patterns

| Ámbito | Convención | Ejemplo |
|--------|-----------|---------|
| **Tablas BD (Prisma)** | snake_case plural | `users`, `chat_messages`, `client_tags` |
| **Modelos Prisma** | PascalCase singular | `User`, `ChatMessage`, `ClientTag` |
| **Columnas BD** | snake_case → camelCase en Prisma (automático) | BD: `client_id` → Prisma: `clientId` |
| **Endpoints REST** | plural, kebab-case | `/api/clients`, `/api/chat-messages` |
| **Componentes React** | PascalCase.jsx | `ClientCard.jsx`, `ChatList.jsx` |
| **Servicios/Utils** | camelCase.js | `api.js`, `socket.js`, `formatDate.js` |
| **Hooks** | camelCase.js (prefijo use) | `useAuth.js`, `useChat.js` |
| **Stores Zustand** | camelCase.js (prefijo use) | `useChatStore.js`, `useUIStore.js` |

### API Response Format

**Success:**
```json
{ "data": { ... } }
```

**Success (List):**
```json
{ "data": [...], "meta": { "total": 50, "page": 1, "limit": 20 } }
```

**Error:**
```json
{ "error": { "message": "Client not found", "code": "NOT_FOUND" } }
```

**Error Codes:** `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL_ERROR`

### Socket.IO Patterns

| Aspecto | Convención |
|---------|-----------|
| **Namespaces** | `/chat`, `/alerts`, `/notifications` |
| **Event naming** | `namespace:action` (e.g. `message:new`, `chat:assigned`) |
| **Payload** | `{ type, payload, timestamp, correlationId }` |

### State Management (Zustand)

- Store por feature: `useChatStore`, `useAuthStore`, `useUIStore`
- Acciones como funciones del store: `sendMessage()`, `assignChat()`
- Selectores inline: `useChatStore(s => s.messages)` (evitar destructuring del store completo)

### Date/Time

| Contexto | Formato |
|----------|---------|
| **API (JSON)** | ISO 8601 UTC (`2026-05-07T14:30:00Z`) |
| **UI (México)** | Locale es-MX (`7 may 2026, 14:30`) |
| **Interno** | Timestamps UTC |

### Error Handling

**Backend:**
```javascript
// Global error middleware
app.use((err, req, res, next) => {
  const code = err.code || 'INTERNAL_ERROR';
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message, code } });
});
```

**Frontend:**
- Error boundaries por feature
- `apiFetch` maneja 401 automáticamente (redirige a login)
- Errores de Socket.IO: reconexión automática con backoff

## Project Structure & Boundaries

### Complete Project Directory Structure

```
chat-multichannel-sales-ia/
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── socket.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── messages.routes.js
│   │   │   ├── clients.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── metrics.routes.js
│   │   │   └── whatsapp.routes.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rbac.js
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── chat.service.js
│   │   │   ├── whatsapp.service.js
│   │   │   ├── ai.service.js
│   │   │   ├── rag.service.js
│   │   │   ├── assignment.service.js
│   │   │   ├── sla.service.js
│   │   │   └── push.service.js
│   │   ├── socket/
│   │   │   ├── chat.handler.js
│   │   │   ├── alerts.handler.js
│   │   │   └── notifications.handler.js
│   │   └── utils/
│   │       ├── ApiError.js
│   │       ├── response.js
│   │       └── logger.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── nginx.production.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── public/assets/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── ChatView.jsx
│       │   ├── Clients.jsx
│       │   ├── Metrics.jsx
│       │   └── Settings.jsx
│       ├── features/
│       │   ├── chat/
│       │   │   ├── components/
│       │   │   ├── ChatPage.jsx
│       │   │   └── index.js
│       │   ├── clients/
│       │   ├── metrics/
│       │   ├── settings/
│       │   └── auth/
│       ├── components/
│       │   ├── ui/
│       │   └── layout/
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useChat.js
│       │   ├── useSocket.js
│       │   └── useNotifications.js
│       ├── stores/
│       │   ├── useAuthStore.js
│       │   ├── useChatStore.js
│       │   └── useUIStore.js
│       ├── services/
│       │   ├── api.js
│       │   └── socket.js
│       └── utils/
│           ├── formatDate.js
│           └── constants.js
│
├── mobile/
│
└── .github/
    └── workflows/
        └── deploy.yml
```

### Requirements to Structure Mapping

| FR Category | Backend Location | Frontend Location |
|-------------|-----------------|-------------------|
| Auth & Users (FR1-FR5) | `routes/auth.routes.js`, `services/auth.service.js`, `middleware/auth.js` | `features/auth/`, `stores/useAuthStore.js` |
| Conversations (FR6-FR12) | `routes/messages.routes.js`, `services/chat.service.js`, `socket/chat.handler.js` | `features/chat/`, `stores/useChatStore.js` |
| AI & RAG (FR13-FR18) | `services/ai.service.js`, `services/rag.service.js` | `features/chat/` (IA assistance inline) |
| Assignment (FR19-FR23) | `services/assignment.service.js` | `features/clients/` |
| Supervision (FR24-FR28) | `routes/metrics.routes.js`, `services/sla.service.js`, `socket/alerts.handler.js` | `features/metrics/`, `Dashboard.jsx` |
| Mobile (FR29-FR31) | `services/push.service.js` | `mobile/` (separate project) |
| Multi-tenant (FR32-FR35) | `config/database.js`, `routes/whatsapp.routes.js` | `features/settings/` |
| WhatsApp (FR36-FR38) | `routes/whatsapp.routes.js`, `services/whatsapp.service.js` | `services/socket.js` (eventos) |

### Integration Points

**Internal Communication:**
- REST API para CRUD (Express → Prisma → PostgreSQL)
- Socket.IO para tiempo real (servidor push → cliente)
- Webhooks entrantes de WhatsApp → `services/whatsapp.service.js`

**External Integrations:**
- WhatsApp Business API (webhooks + send API)
- Proveedor LLM (vía `services/ai.service.js` con Adapter Pattern — ver sección abajo)
- Firebase Cloud Messaging + APNs (`services/push.service.js`)
- Sentry (error monitoring)

## AI Provider — Adapter Pattern

### Rationale

El proveedor IA no está decidido definitivamente (Gemini es la opción preferida). Para evitar acoplamiento, se implementa un **Adapter Pattern** que permite cambiar de proveedor sin modificar la lógica de negocio.

### Architecture

```
services/ai.service.js        ← Fachada pública (chat service llama a esto)
providers/
  ├── ai.provider.interface.js  ← Contrato abstracto
  ├── gemini.provider.js        ← Implementación Gemini (default)
  ├── openai.provider.js        ← Implementación OpenAI (futura)
  └── anthropic.provider.js     ← Implementación Anthropic (futura)
```

### Interface Contract

```javascript
// ai.provider.interface.js
export class AIProvider {
  async generateResponse({ messages, context, tenantId }) {}
  async streamResponse({ messages, context, tenantId }) {}
  async embed({ text }) {}
}
```

### Configuration

El proveedor activo se define por variable de entorno:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=xxx
# OPENAI_API_KEY=xxx   # cuando se cambie
# ANTHROPIC_API_KEY=xxx
```

### Gemini (Preferido)

| Aspecto | Detalle |
|---------|---------|
| **Provider** | Google Gemini API |
| **SDK** | `@google/generative-ai` |
| **Modelo sugerido** | `gemini-2.5-flash` (balance velocidad/costo) |
| **RAG** | Embeddings vía `embedding-001` + PostgreSQL pgvector |
| **Streaming** | Soporte nativo para respuestas en tiempo real |

### Provider Resolution

```javascript
// providers/index.js
const providers = { gemini: GeminiProvider, openai: OpenAIProvider };
const Provider = providers[process.env.AI_PROVIDER || 'gemini'];
export const ai = new Provider();
```

## Mobile Project Structure

La app mobile (React Native) para vendedores se desarrolla en Fase 2. En Fase 1 solo se crea el scaffold del proyecto.

### Directory Structure

```
mobile/
├── package.json
├── app.json
├── babel.config.js
├── metro.config.js
├── index.js
├── App.jsx
├── src/
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── ChatListScreen.jsx
│   │   ├── ChatDetailScreen.jsx
│   │   └── ProfileScreen.jsx
│   ├── components/
│   │   ├── ChatBubble.jsx
│   │   ├── MessageInput.jsx
│   │   └── StatusIndicator.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   └── useSocket.js
│   ├── services/
│   │   ├── api.js
│   │   └── socket.js
│   ├── stores/
│   │   ├── useAuthStore.js
│   │   └── useChatStore.js
│   └── utils/
│       └── formatDate.js
├── android/
├── ios/
└── __tests__/
```

### Technology Stack

| Componente | Tecnología |
|------------|-----------|
| **Framework** | React Native (CLI) |
| **Navigation** | React Navigation 7 |
| **State** | Zustand (comparte stores con web) |
| **Real-time** | Socket.IO client |
| **Push** | Firebase Cloud Messaging + APNs |
| **Secure Storage** | react-native-keychain |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** Todas las decisiones son compatibles. PostgreSQL + Prisma + Express + Socket.IO + React + Zustand + React Native funcionan sin conflictos.

**Pattern Consistency:** Los patrones de naming, API response format, y Socket.IO events son consistentes entre backend, frontend web y mobile.

**Structure Alignment:** La estructura de directorios soporta todas las decisiones arquitectónicas y los boundaries están claramente definidos.

### Requirements Coverage Validation ✅

**Functional Requirements (38/38):** Cada FR está mapeado a un componente específico en la tabla Requirements to Structure Mapping.

| Categoría | FRs | Backend | Frontend | Status |
|-----------|-----|---------|----------|--------|
| Auth & Users | FR1-FR5 | auth.routes, auth.service, auth middleware | features/auth, useAuthStore | ✅ |
| Conversations | FR6-FR12 | messages.routes, chat.service, socket/chat | features/chat, useChatStore | ✅ |
| AI & RAG | FR13-FR18 | ai.service, rag.service, AI providers | features/chat (inline IA) | ✅ |
| Assignment | FR19-FR23 | assignment.service | features/clients | ✅ |
| Supervision | FR24-FR28 | metrics.routes, sla.service, socket/alerts | features/metrics, Dashboard | ✅ |
| Mobile | FR29-FR31 | push.service, socket/notifications | mobile/ screens + hooks | ✅ |
| Multi-tenant | FR32-FR35 | config/database, whatsapp.routes | features/settings | ✅ |
| Integrations | FR36-FR38 | whatsapp.service, webhook handler | services/socket (events) | ✅ |

**Non-Functional Requirements (23/23):**

| Categoría | Cantidad | Abordado por |
|-----------|----------|-------------|
| Performance (NFR1-NFR5) | 5 | Socket.IO, in-memory cache, PostgreSQL índices, Prisma queries optimizadas |
| Security (NFR6-NFR11) | 6 | TLS 1.3, JWT 1h+refresh, RBAC middleware, encriptación AES-256, auditoría |
| Scalability (NFR12-NFR15) | 4 | Instance isolation, infraestructura dedicada por tenant |
| Integration (NFR16-NFR19) | 4 | WhatsApp webhooks, AI Provider Adapter con fallback, rate limiting, media pipeline |
| Reliability (NFR20-NFR23) | 4 | Docker health checks, backup diario, recovery plan, persistencia 100% |

### Implementation Readiness ✅

| Aspecto | Status |
|---------|--------|
| Decisiones críticas documentadas con versiones | ✅ |
| Patrones de implementación definidos (naming, API, Socket.IO, Zustand) | ✅ |
| Estructura de proyecto completa con todos los archivos | ✅ |
| Mapeo FR → componentes específicos | ✅ |
| Boundaries e integration points definidos | ✅ |

### Gap Analysis Results

| Gap | Prioridad | Resolución |
|-----|-----------|------------|
| Proveedor IA no decidido | 🔶 Importante | Adapter Pattern implementado; Gemini como default; cambiar provider = cambiar env var |
| Mobile app en MVP | ✅ Resuelto | Mobile SÍ está en MVP (Fase 2). Scaffold en Fase 1, features en Fase 2. Estructura definida. |
| Instance isolation vs RLS | ℹ️ Resuelto | Se mantiene instance isolation según PRD |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (incl. PostgreSQL, Prisma, Gemini)
- [x] Integration patterns defined (Adapter Pattern for AI)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined (backend + frontend + mobile)
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete
