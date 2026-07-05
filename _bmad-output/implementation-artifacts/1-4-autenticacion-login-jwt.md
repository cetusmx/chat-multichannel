# Story 1.4: Autenticación (Login + JWT)

Status: done ✅

## Story

As a user (Admin, Coordinator, or Vendor),
I want log in with my email and password and receive a secure session,
So that I can access the platform according to my role.

## Acceptance Criteria

1. **Given** I have a registered account
   **When** I submit my email and password on the login page
   **Then** I receive a JWT access token (1h expiration) and a refresh token (7d expiration)

2. **Given** my credentials are invalid
   **When** I submit the login form
   **Then** I receive a 401 error with message "Invalid email or password"

3. **Given** my access token has expired
   **When** I make an API request
   **Then** the system returns 401, and the frontend automatically uses the refresh token to obtain a new access token

4. **Given** my refresh token has also expired
   **When** the frontend tries to refresh
   **Then** I am redirected to the login page

5. **Given** I am logged in
   **When** I access any API endpoint
   **Then** the JWT token must be sent in the Authorization header and validated server-side

## Definition of Done

### Documentation
- [x] Each new REST endpoint has JSDoc `@openapi` annotation in its route file
- [x] Annotations are visible in Swagger UI at `/api-docs`
- [x] Request/response schemas are documented (parameters, body, status codes)

### Tests
- [x] Unit tests for business logic and core functionality
- [x] Integration tests for API endpoints (success + error cases)
- [x] All tests pass (`npx jest --forceExit`)
- [x] No regressions introduced (existing tests still pass)

### Quality
- [x] Lint passes (`npm run lint`)
- [x] No secrets or credentials committed
- [x] File List includes every new/modified/deleted file

## Tasks / Subtasks

- [x] Backend: `services/auth.service.js` — login, refresh, logout
- [x] Backend: `routes/auth.routes.js` — POST /api/auth/login, POST /api/auth/refresh
- [x] Backend: Register auth routes in `app.js`
- [x] Backend: JSDoc/Swagger annotations for auth endpoints
- [x] Frontend: `features/auth/LoginPage.jsx` — Login form with email/password, loading, error, redirect
- [x] Frontend: Update `App.jsx` — route guard (redirect to /login if no token), redirect to / after login
- [x] Tests: `tests/integration/auth.test.js` — login success, invalid creds, refresh flow

## Dev Notes

### Architecture Patterns
- JWT 1h access + Refresh Token 7d (stateless auth) [Source: architecture.md#Authentication--Security]
- bcryptjs for password comparison [Source: architecture.md#Stack Tecnológico]
- JWT payload must include: `id`, `tenantId`, `role` (matches existing `auth.js` middleware expectations)
- API response format: `{ data: { user, token, refreshToken } }` on success [Source: architecture.md#API-Response-Format]

### Existing Infrastructure
- `middleware/auth.js` already verifies JWT and sets `req.user = decoded`
- `middleware/rbac.js` already checks roles via `req.user.role`
- `utils/ApiError.js` has `unauthorized()` factory
- `config/env.js` has JWT config (`jwtSecret`, `jwtRefreshSecret`, `jwtExpiresIn`, `jwtRefreshExpiresIn`)
- Frontend `services/api.js` already has auto-refresh on 401 (calls `/api/auth/refresh` with refreshToken)
- Frontend `stores/useAuthStore.js` already has `setAuth`, `clearAuth`, `setToken` with zustand persist
- Frontend `services/socket.js` already has `connectSockets(token)` function

### Implementation Details

**Auth Service (`auth.service.js`):**
- `login(email, password)`:
  1. Find user by email with tenantId (where isActive = true)
  2. Compare password with bcrypt
  3. Generate accessToken (jwt.sign with { id, tenantId, role }, expiresIn: '1h')
  4. Generate refreshToken (jwt.sign with { id, tenantId, role }, expiresIn: '7d')
  5. Return { user, token, refreshToken }
- `refreshToken(token)`:
  1. Verify with jwtRefreshSecret
  2. Generate new accessToken with same payload
  3. Return { token }
- For MVP, store refresh tokens in memory (no blacklist needed). Post-MVP: add token version to user table or Redis.

**Login Page (`LoginPage.jsx`):**
- Glassmorphism card centered on slate background
- Email + password inputs with validation
- Loading state on submit button
- Error message display
- On success: store auth in zustand (persist), redirect to /
- Uses `services/api.js` `post()` function (no auth needed for login)
- Route: `/login`

**Route Guard (`App.jsx`):**
- If no token in useAuthStore → redirect to /login
- If token exists and on /login → redirect to /
- Use react-router `Navigate` component

### File Changes

| Action | File |
|--------|------|
| CREATE | `backend/src/services/auth.service.js` |
| CREATE | `backend/src/routes/auth.routes.js` |
| MODIFY | `backend/src/app.js` — add authRoutes |
| CREATE | `frontend/src/features/auth/LoginPage.jsx` |
| MODIFY | `frontend/src/App.jsx` — route guard + login route |
| CREATE | `backend/tests/integration/auth.test.js` |

### Testing Notes
- Use bcryptjs to hash the seed password
- Use jwt from jsonwebtoken to sign test tokens
- Test cases:
  - Login with valid admin credentials → 200 + token + user
  - Login with wrong password → 401
  - Login with inactive user → 401
  - Refresh with valid token → 200 + new accessToken
  - Refresh with expired/invalid token → 401
  - Access protected route without token → 401
- Run with: `npx jest tests/integration/auth.test.js --forceExit`

## Dev Agent Record

### Agent Model Used
opencode/big-pickle

### Completion Notes List
Story context created from epics.md (Story 1.4 definition), architecture.md (auth patterns), and existing source code analysis.

### File List
- `_bmad-output/implementation-artifacts/1-4-autenticacion-login-jwt.md`
