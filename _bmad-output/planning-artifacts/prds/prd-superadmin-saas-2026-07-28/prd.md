---
title: Superadmin SaaS Management
status: final
created: 2026-07-28
updated: 2026-07-28
---

# Superadmin SaaS Management

## 1. Vision & Strategy
### What are we building?
A dedicated SaaS management layer to govern the multi-tenant system. It provides the platform owner with a separate web portal to onboard, suspend, and monitor Tenants (clients) while enforcing business quotas to protect infrastructure and API costs.

### Why does it matter?
Without this layer, new tenants must be provisioned manually in the database, and there is no way to enforce billing limits (like AI token usage). This unlocks the ability to scale the software as a commercial SaaS.

### Success Signal
The platform owner can successfully create a new Tenant, assign an admin, and suspend a non-paying Tenant entirely from a web dashboard without database intervention.

## 2. Product Requirements

### 2.1 SaaS Dashboard (Frontend)
- **FR-S1.1 Separate Application:** The Superadmin dashboard must be deployed as a standalone React Single Page Application (SPA) to ensure maximum security and isolation from the main tenant-facing app.
- **FR-S1.2 Global Metrics View:** The dashboard must display total active tenants, total AI tokens/messages consumed in the current billing cycle, and total connected users.

### 2.2 Tenant Lifecycle Management
- **FR-S2.1 Tenant Provisioning:** The Superadmin can create a new Tenant via the UI by providing a Company Name, Domain, and the credentials for the initial `ADMIN` user.
- **FR-S2.2 Tenant Suspension:** The Superadmin can toggle a Tenant's status (Active/Suspended). When suspended, all users of that tenant are blocked from logging in, and incoming WhatsApp webhooks for that tenant are rejected.
- **FR-S2.3 Tenant List:** The Superadmin can view a paginated list of all tenants, sortable by status and creation date.

### 2.3 Business Quotas & Governance
- **FR-S3.1 User Seat Quotas:** The system must restrict the number of active users (vendors/coordinators) a Tenant can create, based on a configurable limit defined by the Superadmin.
- **FR-S3.2 AI Usage Quotas:** The system must restrict the number of monthly AI messages/tokens a Tenant can consume. [ASSUMPTION] If the limit is reached, the AI service falls back to a generic offline response or routes directly to human assignment.
- **FR-S3.3 Single Channel Constraint:** Each Tenant is strictly limited to 1 connected WhatsApp number. If a client needs multiple numbers, they must be provisioned as separate Tenants.

## 3. Non-Functional Requirements (NFRs)
- **Security:** The API routes for the Superadmin (`/api/superadmin/*`) must be strictly protected by a new `isSuperadmin` middleware. Regular tenant `ADMIN` users must categorically fail this check.
- **Data Isolation:** Queries executed by the Superadmin role must bypass the standard tenant-scoping middleware to fetch aggregate data across the entire database.
