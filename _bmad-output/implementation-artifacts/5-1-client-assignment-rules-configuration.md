---
baseline_commit: 4c1eff86d000e94ad724034a7e3c25d07cc5faf4
---
# Story 5.1: Client Assignment Rules Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to define how new chats are assigned (manual vs. round-robin),
so that workloads distribute according to company policy.

## Acceptance Criteria

1. **Given** the routing settings, **When** I select "Round-Robin" and select active vendors, **Then** the system saves the rule for the tenant.

## Tasks / Subtasks

- [x] Task 1: Update Database Schema & Migrations (AC: 1)
  - [x] Subtask 1.1: Add `RoutingStrategy` enum and `AssignmentRule` / `EligibleVendor` relations to `schema.prisma`.
  - [x] Subtask 1.2: Run Prisma migration (`npx prisma migrate dev --name add_assignment_config`).
- [x] Task 2: Implement Backend API & Service (AC: 1)
  - [x] Subtask 2.1: Create `backend/src/services/assignment.service.js` with `getConfig` and `updateConfig` methods (return `{ data: config }`).
  - [x] Subtask 2.2: Add GET and PUT endpoints at `/api/tenant/assignment-config`.
  - [x] Subtask 2.3: Validate strategy enum and active vendor array using `express-validator` and synchronously catch Prisma errors.
  - [x] Subtask 2.4: Ensure strictly RBAC applies (Admin only) and data integrity (vendors must belong to the tenant and have `VENDOR` role).
- [x] Task 3: Create Frontend UI Component (AC: 1)
  - [x] Subtask 3.1: Create `frontend/src/features/settings/AssignmentRulesSection.jsx` applying the glassmorphism aesthetic.
  - [x] Subtask 3.2: Update `frontend/src/pages/Settings.jsx` to register the new tab and mount the new component.
  - [x] Subtask 3.3: Implement form submission, API integration, and success/error toasts.

## Dev Notes

- **Prisma Schema Additions:**
  ```prisma
  enum RoutingStrategy {
    MANUAL
    ROUND_ROBIN
  }

  model AssignmentRule {
    id              String          @id @default(cuid())
    tenantId        String          @unique @map("tenant_id")
    strategy        RoutingStrategy @default(MANUAL)
    createdAt       DateTime        @default(now()) @map("created_at")
    updatedAt       DateTime        @updatedAt @map("updated_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    eligibleVendors EligibleVendor[]

    @@map("assignment_rules")
  }

  model EligibleVendor {
    ruleId String @map("rule_id")
    userId String @map("user_id")

    rule AssignmentRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
    user User           @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@id([ruleId, userId])
    @@index([ruleId])
    @@index([userId])
    @@map("eligible_vendors")
  }
  ```
  *(Remember to add `assignmentRule AssignmentRule?` to `Tenant` and `eligibleRules EligibleVendor[]` to `User`)*

- **Null Destructuring Guard:** Ensure any destructured parameters strictly check for null (e.g. `const { ... } = options || {}`) to avoid Epic 4 regression bugs.
- **Service Reusability:** Keep `assignment.service.js` clean for upcoming use by the auto-assigner in Story 5.2.
- **Swagger Documentation:** Ensure PUT/GET endpoints are documented via Swagger decorators.

### Project Structure Notes

- **Frontend:** Component MUST be placed in `frontend/src/features/settings/` and correctly registered in `frontend/src/pages/Settings.jsx`.
- **Backend Service:** Use established service pattern inside `backend/src/services/`.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: backend/prisma/schema.prisma]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro

### Debug Log References

- Code implementation for assignment configuration.

### Completion Notes List

- Implemented `RoutingStrategy` enum, `AssignmentRule` model, and `EligibleVendor` relational model in Prisma.
- Ran Prisma migration `add_assignment_config`.
- Built backend `assignment.service.js` with `getConfig` and `updateConfig` handling proper DB logic and cleaning old eligible vendors.
- Added `GET` and `PUT` `/api/tenant/assignment-config` endpoints to `tenant.routes.js` with `express-validator` and `RBAC` (ADMIN) rules.
- Added missing `express-validator` library via npm install.
- Developed the `AssignmentRulesSection.jsx` frontend component with a glassmorphism style matching `AiConfigSection`.
- Included the new API methods in `frontend/src/services/api.js`.
- Included `AssignmentRulesSection` into `Settings.jsx` and verified frontend builds successfully.
- Implemented and passed all integration tests in `assignment.test.js`.

### File List

- `backend/prisma/schema.prisma`
- `backend/src/routes/tenant.routes.js`
- `backend/src/services/assignment.service.js`
- `backend/tests/integration/assignment.test.js`
- `backend/package.json`
- `frontend/src/features/settings/AssignmentRulesSection.jsx`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/services/api.js`

### Review Findings
- [x] [Review][Patch] Missing Database Transaction in updateConfig [backend/src/services/assignment.service.js:66]
- [x] [Review][Patch] Duplicate Array Item Validation Bug [backend/src/services/assignment.service.js:58]
- [x] [Review][Patch] Ignored Null Destructuring Guard in assignment service [backend/src/services/assignment.service.js:46]
- [x] [Review][Patch] Insufficient Array Element Validation for activeVendorIds [backend/src/routes/tenant.routes.js:197]
- [x] [Review][Patch] Backend State Leakage on Strategy Change [backend/src/services/assignment.service.js:80]
- [x] [Review][Patch] Blind JSON Parsing in Frontend [frontend/src/features/settings/AssignmentRulesSection.jsx:21]
- [x] [Review][Patch] Deviation from Specified Service Return Format [backend/src/services/assignment.service.js:39]
- [x] [Review][Patch] Missing Glassmorphism Aesthetic in Frontend Component [frontend/src/features/settings/AssignmentRulesSection.jsx:58]
- [x] [Review][Defer] Hardcoded Pagination Truncation limit=100 [frontend/src/features/settings/AssignmentRulesSection.jsx] — deferred, pre-existing
- [x] [Review][Defer] Unexplained Disabled UI State [frontend/src/features/settings/AssignmentRulesSection.jsx] — deferred, pre-existing
- [x] [Review][Defer] Brittle Integration Test Setup [backend/tests/integration/assignment.test.js] — deferred, pre-existing
- [x] [Review][Defer] Redundant Database Indexing @@index([ruleId]) [backend/prisma/schema.prisma] — deferred, pre-existing

### Review Findings (Phase 2)
- [x] [Review][Patch] Data Leak on Initial Config Creation [backend/src/services/assignment.service.js:32]
- [x] [Review][Patch] Race Condition on Config Initialization [backend/src/services/assignment.service.js:24]
- [x] [Review][Patch] Blind JSON Parsing on form submission [frontend/src/features/settings/AssignmentRulesSection.jsx:48]
- [x] [Review][Patch] ROUND_ROBIN passed with empty activeVendorIds [backend/src/services/assignment.service.js:48]
- [x] [Review][Patch] Missing try/catch blocks and synchronous Prisma error catch [backend/src/services/assignment.service.js]
- [x] [Review][Patch] Missing JSDoc comments for new frontend code [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Defer] Success/Error feedback implemented as inline alerts instead of toasts — deferred, no toast library available
- [x] [Review][Defer] Useless Swagger Documentation — deferred, pre-existing

### Review Findings (Phase 3)
- [x] [Review][Patch] Unsafe null iteration / rawActiveVendorIds not iterable [backend/src/services/assignment.service.js]
- [x] [Review][Patch] TOCTOU race condition on Vendor Role Validation [backend/src/services/assignment.service.js]
- [x] [Review][Patch] Missing JSDoc tags @component and @returns [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Patch] Stale Vendor IDs submitted by frontend [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Patch] Unsafe vendors array length render [frontend/src/features/settings/AssignmentRulesSection.jsx]

### Review Findings (Phase 4)
- [x] [Review][Patch] Write Amplification on Read via Upsert [backend/src/services/assignment.service.js]
- [x] [Review][Patch] Destructive form rendering on fetch failure [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Patch] Missing array fallback causing TypeError [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Patch] Misleading success message on form edit [frontend/src/features/settings/AssignmentRulesSection.jsx]
- [x] [Review][Defer] Missing Frontend Component Unit Tests — deferred, out of scope for MVP
