---
title: Superadmin SaaS Architecture Spine
status: draft
created: 2026-07-28
updated: 2026-07-28
---

# Architecture Spine: Superadmin SaaS Module

## Paradigm
**Isolated Control Plane:** The Superadmin (SaaS Management) layer is treated as an entirely isolated control plane that wraps the existing multi-tenant system. It maintains its own identity store, its own backend routing tree, and its own frontend deployment. It observes and mutates the global state without interfering with the tenant-scoped operation layer.

## Invariants (Architecture Decisions)

### AD-1: Total Identity Isolation
* **Binds:** Authentication and Database Schema.
* **Prevents:** Privilege escalation (a tenant user gaining system access) or accidental global queries by regular users.
* **Rule:** Superadmins MUST NOT be stored in the existing `User` table. A new, independent `Superadmin` table must be created in Prisma. All authentication for this role must occur through a strictly separated routing namespace (`/api/superadmin/auth/login`), issuing a JWT with a unique issuer or audience claim.

### AD-2: Parallel Service Ecosystem
* **Binds:** Backend Services and Controllers.
* **Prevents:** Breaking existing tenant-scoped production logic by injecting `if(role === 'SUPERADMIN')` branches throughout the codebase.
* **Rule:** Existing services (e.g., `tenant.service.js`, `metrics.service.js`) MUST remain completely blind to the Superadmin role and continue enforcing `tenantId` strict isolation. Global queries required by the Superadmin MUST be implemented in a parallel ecosystem of dedicated services (e.g., `superadmin.tenant.service.js`).

### AD-3: Independent Subdomain Containerization
* **Binds:** Frontend Hosting and Deployment.
* **Prevents:** Exposing the administrative bundle to standard users; complex routing logic in a single SPA.
* **Rule:** The Superadmin Dashboard MUST be built as a separate Single Page Application (SPA) and deployed in its own Docker container on the same VPS, pointing to a dedicated subdomain (e.g., `admin.salesflow.app`).

### AD-4: Quota Enforcement Layer
* **Binds:** API Middleware / Services.
* **Prevents:** Unbounded resource usage by tenants.
* **Rule:** Quotas (User seats, AI Tokens) MUST be checked at the service mutation boundaries. 

## Deferred
- Specific metrics charting library for the Superadmin Dashboard.
- Exact CI/CD pipeline steps for deploying the second Docker container (assumed standard `docker-compose` update).

## Open Questions
- None. All major architectural boundaries are closed.
