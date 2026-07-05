# Story 1.1: Scaffold del proyecto

Status: done ✅

## Story

As a developer,
I want scaffold the complete project structure with Docker, Prisma, and CI/CD,
So that the team can start developing features on a consistent foundation.

## Acceptance Criteria

1. **Docker Compose starts successfully**
   Given the project repository is initialized
   When I run `docker compose up`
   Then the following services start: nginx (port 80), Express API (port 4000), PostgreSQL (port 5432)

2. **Prisma creates initial schema**
   Given the PostgreSQL container is running
   When Prisma runs `npx prisma migrate dev`
   Then the initial schema (User, Tenant, Role tables) is created

3. **CI/CD deploys on push**
   Given the project scaffold is complete
   When I push to the main branch
   Then GitHub Actions runs lint, test, and deploys to the VPS

4. **Dev server works with HMR**
   Given a developer runs the frontend project
   When they execute `npm run dev`
   Then Vite dev server starts with HMR and proxies API calls to the backend

## Tasks / Subtasks

- [x] Create root project structure (docker-compose.yml, .env.example, .gitignore)
  - [x] docker-compose.yml with nginx + node:20-alpine + postgres:16
  - [x] .env.example with DATABASE_URL, JWT_SECRET, AI_PROVIDER vars
- [x] Initialize backend project (Express 5 + Prisma 6)
  - [x] backend/package.json with all dependencies
  - [x] Express 5 app skeleton (health endpoint)
  - [x] Prisma 6 init with PostgreSQL provider
  - [x] Prisma schema: Tenant, User, Role models
  - [x] Dockerfile for node:20-alpine
  - [x] ESLint + Prettier config
  - [x] Swagger/OpenAPI setup
- [x] Initialize frontend project (Vite 8 + React 19)
  - [x] frontend/package.json with dependencies
  - [x] Vite config with API proxy
  - [x] Tailwind CSS 4 setup
  - [x] React Router 7 with basic routes
  - [x] Dockerfile for nginx:alpine
  - [x] ESLint + Prettier config
- [x] Setup CI/CD pipeline
  - [x] .github/workflows/deploy.yml
  - [x] Build + test + deploy stages
- [x] Verify full stack works end-to-end

## Dev Notes

### Architecture Patterns

- **Docker Compose** for local dev and production (single VPS)
- **nginx** serves static frontend and proxies /api/* to Express
- **Express 5** on port 4000, serves API + Swagger docs at /api-docs
- **Prisma 6** with PostgreSQL 16, connection pool: `?connection_limit=5`
- **Vite 8** dev server proxies /api -> localhost:4000
- **Auth**: JWT 1h + Refresh Token 7d (stateless, no session store)

### Backend Structure (src/)

```
backend/src/
├── index.js          # Entry: Express + Socket.IO
├── app.js            # Express app (routes, middleware, error handler)
├── socket.js         # Socket.IO server (namespaces: /chat, /alerts, /notifications)
├── config/
│   └── database.js   # Prisma client singleton
├── routes/           # REST route files
├── middleware/       # auth.js, rbac.js, errorHandler.js
└── utils/           # ApiError.js, response.js, logger.js
```

### Backend Dependencies

```json
{
  "express": "^5.2.1",
  "@prisma/client": "^6.x",
  "prisma": "^6.x",
  "jsonwebtoken": "^9.0.3",
  "bcryptjs": "^3.0.3",
  "socket.io": "^4.x",
  "swagger-jsdoc": "^6.x",
  "swagger-ui-express": "^5.x",
  "cors": "^2.x",
  "helmet": "^8.x",
  "morgan": "^1.x"
}
```

### Frontend Structure (src/)

```
frontend/src/
├── main.jsx          # ReactDOM.createRoot
├── App.jsx           # Router setup + layout
├── pages/            # Login, Dashboard, ChatView, Clients, Metrics, Settings
├── features/         # chat/, clients/, metrics/, settings/, auth/
├── components/       # ui/ (Button, Input, Modal), layout/ (Sidebar, Header)
├── hooks/            # useAuth, useChat, useSocket, useNotifications
├── stores/           # useAuthStore (Context), useChatStore (Zustand), useUIStore (Zustand)
├── services/         # api.js (fetch wrapper), socket.js (Socket.IO client)
└── utils/            # formatDate, constants
```

### Frontend Dependencies

```json
{
  "react": "^19.2.4",
  "react-dom": "^19.2.4",
  "react-router-dom": "^7.13.1",
  "zustand": "^5.x",
  "socket.io-client": "^4.x",
  "tailwindcss": "^4.2.1",
  "@tailwindcss/postcss": "^4.x",
  "framer-motion": "^12.36.0",
  "lucide-react": "^0.577.0"
}
```

### Testing Standards

- **Backend**: Jest (config in backend/package.json)
- **Frontend**: Vitest + React Testing Library (config in vite.config.js)
- Tests co-located: `*.test.js` next to source files
- First stories: smoke tests only (health endpoint, app renders)

## Project Structure Notes

Follow the exact structure from `architecture.md`:
```
chat-multichannel-sales-ia/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/ (as detailed above)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── nginx.production.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── public/assets/
│   └── src/ (as detailed above)
├── mobile/ (scaffold only - empty for now)
└── .github/
    └── workflows/
        └── deploy.yml
```

### Code Conventions

- **Backend**: CommonJS (`require`/`module.exports`)
- **Frontend**: ES Modules (`import`/`export`)
- **Components**: PascalCase.jsx
- **Services/Utils**: camelCase.js
- **Hooks**: useXxx.js

### Nginx Config

- Dev: `nginx.conf` (no SSL, proxy to node)
- Prod: `nginx.production.conf` (SSL, gzip, cache headers)
- Proxies /api/* -> backend:4000
- Serves / -> frontend build

### Docker Compose Service Layout

```yaml
services:
  nginx: image nginx:alpine, ports [80:80], depends_on [backend]
  backend: build backend/, ports [4000:4000], env, depends_on [postgres]
  postgres: image postgres:16, volumes db_data, ports [5432]
```

## References

- Architecture decisions: `_bmad-output/planning-artifacts/architecture.md`
  - Project Structure section (complete directory tree)
  - Naming Patterns table (DB, API, components, hooks, stores)
  - API Response Format (success, error, list)
  - Error handling patterns (Error middleware, error codes)
  - Date/Time formats (ISO 8601 API, es-MX UI)
  - Stack decisions (PostgreSQL 16, Prisma 6, Express 5, React 19, Vite 8)
- Project context & rules: `_bmad/project-context.md`
  - Technology stack with exact versions
  - Frontend: React 19.2.4, Vite 8.0.0, Tailwind 4.2.1
  - Backend: Express 5.2.1, Prisma 6.x, JWT 9.0.3
  - Docker: node:20-alpine, nginx:alpine, postgres:16
  - ESLint frontend 9.39.4 (flat config), backend 10.0.3
  - Prettier 3.8.1
  - Deployment: VPS 77.237.244.27, chat.sealmarket.net
- Epics: `_bmad-output/planning-artifacts/epics.md` (Story 1.1 section)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- docker-compose.yml
- .env.example
- .gitignore
- backend/Dockerfile
- backend/package.json
- backend/prisma/schema.prisma
- backend/src/index.js
- backend/src/app.js
- backend/src/config/database.js
- backend/src/middleware/errorHandler.js
- backend/src/utils/ApiError.js
- backend/src/utils/response.js
- backend/src/utils/logger.js
- frontend/Dockerfile
- frontend/nginx.conf
- frontend/nginx.production.conf
- frontend/package.json
- frontend/vite.config.js
- frontend/src/main.jsx
- frontend/src/App.jsx
- .github/workflows/deploy.yml
