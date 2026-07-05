# Story 1.3: Registro de usuarios

Status: done ✅

## Story

As an Admin,
I want create users with phone, role, and group assignments within my tenant,
So that my team can access the platform with their contact info and organizational context.

## Acceptance Criteria

1. **List users with pagination**
   Given I am authenticated as an Admin or Coordinator
   When I GET `/api/users`
   Then I receive a paginated list of users within my tenant with total count

2. **Create user with all fields**
   Given I submit POST `/api/users` with valid data (name, email, phone, password, role, groupIds)
   When the system processes the request
   Then the user is created with bcrypt-hashed password, linked to my tenant, and assigned to the specified groups

3. **Coordinator restricted creation**
   Given I am a Coordinator
   When I create a user
   Then I can only create users with role VENDOR within my tenant's branches and groups

4. **Duplicate email validation**
   Given I submit the form with an existing email
   When the system processes the request
   Then it returns 409 CONFLICT with code `CONFLICT` and message "Email already in use"

5. **Role-based field requirements**
   Given I select "Vendor" as the role
   When the user is created
   Then at least one group must be assigned via `groupIds`

6. **Response format**
   Given a user is created successfully
   When the API responds
   Then it returns 201 with `{ data: { id, name, email, phone, role, groups, tenantId, createdAt } }`

7. **Frontend create user flow**
   Given I navigate to the users section as Admin
   When I fill the Create User form and submit
   Then I see a success toast and the user appears in the list

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

- [x] Backend: Create `users.routes.js` with POST and GET endpoints (AC: 1, 2, 3, 4, 5, 6)
  - [x] POST `/api/users` — create user with validation
  - [x] GET `/api/users` — paginated list (query params: page, limit, role, search)
  - [x] GET `/api/users/:id` — single user detail with groups
- [x] Backend: Create `users.service.js` with business logic (AC: 2, 3, 5)
  - [x] `createUser(data, tenantId)` — hash password, create user, assign groups
  - [x] `listUsers(tenantId, filters)` — paginated query with role filter
  - [x] `getUserById(id, tenantId)` — single user with groups
- [x] Backend: Validate email uniqueness and role permissions (AC: 3, 4)
  - [x] Check existing email before create
  - [x] Coordinator can only create VENDOR role
- [x] Backend: JSDoc/Swagger annotations for user and group endpoints
- [x] Frontend: Create `features/users/` directory structure (AC: 7)
  - [x] `UserListPage.jsx` — table with pagination, search, role filter
  - [x] `CreateUserForm.jsx` — form with dynamic group selection based on role
  - [ ] `UserDetailPage.jsx` — view/edit user with groups (post-MVP)
- [x] Frontend: Register routes in App.jsx (AC: 7)
- [x] Frontend: Add link in Sidebar navigation if missing
- [x] Tests: Backend integration tests for user CRUD (AC: 2, 3, 4, 5)

## Dev Notes

### Architecture Patterns

- **Backend**: CommonJS, route → service pattern
- **Password hashing**: bcryptjs with salt rounds 10
- **Group assignment**: Use Prisma's nested connect via `group_vendors` table
- **Pagination**: Query params `page` (default 1) and `limit` (default 20)
- **Response format**: Per architecture: success `{ data }`, list `{ data, meta }`, error `{ error }`
- **Tenant isolation**: All queries filter by `tenantId` from JWT token (available in `req.user`)
- **Validation**: Manual at service layer (no Joi/Zod for MVP — evaluated post-MVP)

### API Contract

**POST /api/users**
```
Headers: Authorization: Bearer <token>
Body: {
  name: string (required),
  email: string (required, unique),
  phone: string (optional),
  password: string (required, min 6 chars),
  role: "ADMIN" | "COORDINATOR" | "VENDOR" (required),
  groupIds: string[] (required if role=VENDOR)
}
Response 201: { data: { id, name, email, phone, role, groups: [{id, name}], tenantId, createdAt } }
Response 409: { error: { message: "Email already in use", code: "CONFLICT" } }
Response 403: { error: { message: "Insufficient permissions", code: "FORBIDDEN" } }
```

**GET /api/users**
```
Headers: Authorization: Bearer <token>
Query: ?page=1&limit=20&role=VENDOR&search=john
Response 200: {
  data: [{ id, name, email, phone, role, isActive, createdAt }],
  meta: { total: 50, page: 1, limit: 20 }
}
```

### Required Group Endpoint

Create `GET /api/groups` so the frontend can populate the group selector:
```
Headers: Authorization: Bearer <token>
Response 200: { data: [{ id, name, branch: { id, name } }] }
```

### File Changes

**New files:**
- `backend/src/routes/users.routes.js`
- `backend/src/routes/groups.routes.js` (basic list, needed by frontend)
- `backend/src/services/users.service.js`
- `frontend/src/features/users/UserListPage.jsx`
- `frontend/src/features/users/CreateUserForm.jsx`
- `frontend/src/features/users/UserDetailPage.jsx`

**Modified files:**
- `backend/src/app.js` (mount `/api/users` and `/api/groups` routes)
- `frontend/src/App.jsx` (add /users route)
- `frontend/src/components/layout/Sidebar.jsx` (add Users link)

### RBAC Rules for User Creation

| Creator Role | Can Create |
|-------------|-----------|
| ADMIN | ADMIN, COORDINATOR, VENDOR (any) |
| COORDINATOR | VENDOR only |
| VENDOR | None |

### Testing Standards

- Backend: Jest with supertest
- Test user creation, validation errors, duplicate email, role restrictions
- Use the running PostgreSQL (DATABASE_URL env) — no mocking for MVP
- Tests co-located: `backend/tests/integration/users.test.js`

### Previous Story Intelligence

From Story 1.1:
- Express app uses CommonJS (`require`/`module.exports`)
- Auth middleware in `backend/src/middleware/auth.js` — `req.user` has `{ id, tenantId, role }`
- RBAC middleware in `backend/src/middleware/rbac.js` — `authorize('ADMIN', 'COORDINATOR')`
- Response helpers in `backend/src/utils/response.js` — `success()`, `created()`, `list()`, `error()`
- Custom error class `ApiError` with static factories

From Story 1.2:
- Schema has `User`, `Group`, `GroupVendor` models with indexes
- RoleType enum: ADMIN, COORDINATOR, VENDOR
- GroupVendor join table with composite PK `(groupId, userId)`

## References

- Architecture patterns: `_bmad-output/planning-artifacts/architecture.md` → sec. Implementation Patterns (naming, API format, error handling, date/time)
- API response format: `_bmad-output/planning-artifacts/architecture.md` → sec. API Response Format
- RBAC middleware: `backend/src/middleware/rbac.js`, `backend/src/middleware/auth.js`
- Schema: `backend/prisma/schema.prisma`
- Response helpers: `backend/src/utils/response.js`
- Error classes: `backend/src/utils/ApiError.js`
- Previous story: `_bmad-output/implementation-artifacts/1-1-scaffold-del-proyecto.md`
- Previous story: `_bmad-output/implementation-artifacts/1-2-modelo-de-datos-base.md`

## Dev Agent Record

### Completion Notes

- Implemented users.service.js with createUser, listUsers, getUserById
- All validations: duplicate email, coordinator role restriction, vendor requires groups
- Created users.routes.js (POST, GET, GET/:id) and groups.routes.js (GET list)
- Mounted routes in app.js at /api/users and /api/groups
- 15 integration tests passing (create, duplicate, permissions, pagination, groups)
- Frontend: UserListPage (table, search, filter, pagination) + CreateUserForm (dynamic groups)
- Routes /users and /users/new registered in App.jsx
- Sidebar updated with UserCog icon for Users nav

### File List

**New files:**
- backend/src/services/users.service.js
- backend/src/routes/users.routes.js
- backend/src/routes/groups.routes.js
- backend/tests/integration/users.test.js
- frontend/src/features/users/UserListPage.jsx
- frontend/src/features/users/CreateUserForm.jsx

**Modified files:**
- backend/src/app.js
- frontend/src/App.jsx
- frontend/src/components/layout/Sidebar.jsx
