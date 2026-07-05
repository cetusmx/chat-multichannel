---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# chat-multichannel-sales-ia - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for chat-multichannel-sales-ia, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- **FR1:** Admin can create, edit, and deactivate users within their tenant
- **FR2:** Coordinator can create and deactivate vendor users only
- **FR3:** Users can authenticate with email/password and receive role-based access
- **FR4:** Admin can configure company profile and branding
- **FR5:** System enforces role-based permissions according to RBAC matrix
- **FR6:** Vendor can view all conversations assigned to them
- **FR7:** Vendor can access complete conversation history with any assigned client
- **FR8:** Vendor can search within conversation history by keyword or tag
- **FR9:** Vendor can attach tags to specific points in a conversation
- **FR10:** Coordinator can view all conversations across all vendors
- **FR11:** Coordinator can add comments to any conversation for context
- **FR12:** System preserves complete conversation history regardless of vendor reassignment
- **FR13:** System automatically responds to new client messages via AI agent
- **FR14:** AI agent retrieves product information from RAG knowledge base
- **FR15:** System identifies when AI cannot handle a request and escalates to human
- **FR16:** Vendor can request AI assistance within a conversation to find information
- **FR17:** Coordinator receives alerts when AI escalates or needs human intervention
- **FR18:** AI operates in off-hours mode with self-identification and callback scheduling
- **FR19:** Admin can configure client assignment rules (manual or round-robin)
- **FR20:** Coordinator can manually reassign clients to any vendor
- **FR21:** System preserves context and comments when client is reassigned
- **FR22:** Coordinator can block malicious or unwanted client users
- **FR23:** System automatically assigns new clients based on configured rules
- **FR24:** Coordinator can configure SLA response time thresholds
- **FR25:** Coordinator receives real-time alerts when SLA thresholds are exceeded
- **FR26:** Coordinator can intervene and respond directly to any client conversation
- **FR27:** Coordinator can view productivity metrics by vendor (response time, conversations, conversions)
- **FR28:** Admin can generate usage and activity reports for their tenant
- **FR29:** Vendor can receive push notifications for new messages on mobile devices (iOS and Android)
- **FR30:** Vendor can respond to client messages through mobile app with full conversation history
- **FR31:** Vendor can access AI assistant from mobile app within conversations
- **FR32:** System provisions isolated instance (database, domain, infrastructure) for each new company
- **FR33:** Admin can configure WhatsApp Business API credentials for their tenant
- **FR34:** Admin can configure AI provider API keys for their tenant
- **FR35:** Admin can upload and manage RAG knowledge base content (products, prices, specifications)
- **FR36:** System receives messages from WhatsApp Business API via webhooks
- **FR37:** System sends messages to clients through WhatsApp Business API
- **FR38:** System handles media attachments (images, documents) in conversations

### NonFunctional Requirements

- **NFR1:** Message response time < 3 seconds (normal flow)
- **NFR2:** Push notification latency < 5 seconds (server to device)
- **NFR3:** AI response time < 5 seconds (RAG generation)
- **NFR4:** History search < 2 seconds (1000+ message conversations)
- **NFR5:** AI-to-Human handoff time < 1 second (transparent transition)
- **NFR6:** Encryption in transit (TLS 1.3) for all client-server communications
- **NFR7:** Encryption at rest (AES-256) for database and document files
- **NFR8:** 100% data segregation between tenants
- **NFR9:** JWT authentication with 24h expiration and automatic renewal
- **NFR10:** Complete access audit log (who accessed what data and when)
- **NFR11:** LFPDPPP compliance (Mexico data privacy law)
- **NFR12:** Dedicated instance per tenant
- **NFR13:** Horizontal scalability per instance
- **NFR14:** 100 concurrent messages per instance (initial support)
- **NFR15:** < 10% performance loss when scaling from 10 to 100 users
- **NFR16:** WhatsApp API uptime 99.5% (depends on Meta, active monitoring)
- **NFR17:** AI fallback to human response when AI provider is unavailable
- **NFR18:** WhatsApp rate limiting with exponential backoff
- **NFR19:** Supported media formats: JPG, PNG, PDF, DOCX
- **NFR20:** System uptime 99.5%
- **NFR21:** Failure recovery < 5 minutes
- **NFR22:** Daily data backup
- **NFR23:** 100% conversation history persistence

### Additional Requirements

- **AR-ARCH-01:** Database migration from MySQL to PostgreSQL 16
- **AR-ARCH-02:** ORM migration from Sequelize 6 to Prisma 6
- **AR-ARCH-03:** AI Provider Adapter Pattern (Gemini as default, swappable via env var)
- **AR-ARCH-04:** Socket.IO for real-time communication with auto-reconnection
- **AR-ARCH-05:** JWT 1h access + 7-day refresh token
- **AR-ARCH-06:** Docker Compose orchestration + VPS deployment
- **AR-ARCH-07:** Context API for auth/tenant state; Zustand for chat/real-time state
- **AR-ARCH-08:** Feature-based frontend organization
- **AR-ARCH-09:** Mobile project scaffold (React Native) in Foundation phase, features in Core phase
- **AR-ARCH-10:** WhatsApp Business API integration (webhooks + Send API + Media API)
- **AR-ARCH-11:** Gemini 2.5 Flash as default AI model (balance speed/cost)
- **AR-ARCH-12:** REST API with Swagger/OpenAPI documentation pattern
- **AR-ARCH-13:** Error monitoring with Sentry
- **AR-ARCH-14:** Health check endpoint + UptimeRobot monitoring
- **AR-ARCH-15:** Firebase Cloud Messaging + APNs for push notifications

### UX Design Requirements

- **UX-DR1:** Command Palette (Cmd+K) for universal quick search of clients, documents, tags
- **UX-DR2:** Fixed non-collapsible sidebar with icons + text always visible
- **UX-DR3:** Dual view for Coordinator: Preview mode (2-row chat previews) + Focus mode (1-2 chats detailed)
- **UX-DR4:** Smooth AI-to-Human transition with subtle status indicator (non-intrusive)
- **UX-DR5:** Inline tags in chat timeline for document organization
- **UX-DR6:** Contextual keyboard shortcuts (C compose, N new, / search, Esc close)
- **UX-DR7:** Color-coded badges for SLA alerts and notifications
- **UX-DR8:** Glassmorphism + Gradients aesthetic
- **UX-DR9:** Color palette: Slate (#0F172A → #334155) + Coral UI (#FB7185) + Orange CTAs (#F97316)
- **UX-DR10:** Typing indicator showing "IA is responding..." vs "Vendor is typing..."
- **UX-DR11:** Quick responses via "/" command within chat
- **UX-DR12:** Mobile-first design for vendors (touch gestures, swipe actions)
- **UX-DR13:** Desktop-optimized for coordinators (multi-panel, keyboard-driven)
- **UX-DR14:** Sound push notifications for vendors
- **UX-DR15:** Breadcrumbs contextual navigation
- **UX-DR16:** Threads with inline replies for coordinator comments
- **UX-DR17:** Instant search with filters (pivot by client, cascade by document type)
- **UX-DR18:** Visual presence indicators (IA vs Human vs Assigned)

### Requirements Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1-FR5 | Epic 1 | User management, authentication, RBAC |
| FR32 | Epic 1 | Multi-tenant instance provisioning |
| FR33 | Epic 2 | WhatsApp Business API credential configuration |
| FR36 | Epic 2 | Receive messages via WhatsApp webhooks |
| FR37 | Epic 2 | Send messages through WhatsApp API |
| FR38 | Epic 2 | Handle media attachments in conversations |
| FR6 | Epic 3 | Vendor views assigned conversations |
| FR7 | Epic 3 | Vendor accesses complete conversation history |
| FR8 | Epic 3 | Vendor searches history by keyword or tag |
| FR9 | Epic 3 | Vendor attaches tags to conversation points |
| FR10 | Epic 3 | Coordinator views all conversations |
| FR11 | Epic 3 | Coordinator adds comments to conversations |
| FR12 | Epic 3 | System preserves history on reassignment |
| FR20 | Epic 3 | Coordinator reassigns clients manually |
| FR21 | Epic 3 | System preserves context on reassignment |
| FR22 | Epic 3 | Coordinator blocks malicious users |
| FR26 | Epic 3 | Coordinator intervenes in conversations |
| FR13 | Epic 4 | AI agent auto-responds to new clients |
| FR14 | Epic 4 | AI retrieves product info from RAG |
| FR15 | Epic 4 | AI escalates to human when needed |
| FR16 | Epic 4 | Vendor requests AI assistance in chat |
| FR17 | Epic 4 | Coordinator alerted on AI escalation |
| FR18 | Epic 4 | AI off-hours mode with self-identification |
| FR34 | Epic 4 | Admin configures AI provider API keys |
| FR35 | Epic 4 | Admin manages RAG knowledge base |
| FR19 | Epic 5 | Admin configures assignment rules |
| FR23 | Epic 5 | Auto-assignment of new clients |
| FR24 | Epic 5 | Coordinator configures SLA thresholds |
| FR25 | Epic 5 | Real-time SLA alerts |
| FR27 | Epic 5 | Productivity metrics by vendor |
| FR28 | Epic 5 | Usage and activity reports |
| FR29 | Epic 6 | Push notifications for vendors |
| FR30 | Epic 6 | Mobile chat with full history |
| FR31 | Epic 6 | Mobile AI assistance in chat |

## Epic List

### Epic 1: Platform Foundation ✅ (Completed)
Users can authenticate, manage users by role, and configure company profile, branches and groups.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR32

### Epic 2: WhatsApp Communication
Admin configures WhatsApp Business API integration; system receives and sends messages via WhatsApp and handles media attachments.
**FRs covered:** FR33, FR36, FR37, FR38

### Epic 3: Conversation Management
Vendors manage conversations with full history, tags and search. Coordinators supervise, comment, reassign and intervene in all conversations.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR20, FR21, FR22, FR26

### Epic 4: AI Agent & RAG
AI agent handles first-line client responses with RAG knowledge, escalates to humans, and assists vendors within conversations.
**FRs covered:** FR13, FR14, FR15, FR16, FR17, FR18, FR34, FR35

### Epic 5: Supervision & Control
Coordinator configures SLA thresholds, receives real-time alerts, views productivity metrics, and defines client assignment rules.
**FRs covered:** FR19, FR23, FR24, FR25, FR27, FR28

### Epic 6: Mobile Experience
Vendor receives push notifications and manages conversations with AI assistance from the mobile app.
**FRs covered:** FR29, FR30, FR31

## Epic 1: Platform Foundation ✅ (Completed)

Users can authenticate, manage users by role, and configure company profile, branches and groups.

### Story 1.1: Project Setup and Initial Architecture

As a Developer,
I want to set up the foundation of the project using the agreed stack (Vite, Express, PostgreSQL, Prisma),
So that the team has a stable environment to build the features.

**Acceptance Criteria:**
**Given** the architecture requirements (AR-ARCH-01, AR-ARCH-06),
**When** the project is initialized,
**Then** the repository should contain a monorepo with `frontend` and `backend` directories,
**And** Docker Compose is configured with PostgreSQL 16, Node, and Nginx.

### Story 1.2: Tenant Provisioning & Isolation

As an Admin,
I want my company's data to be securely isolated from other companies,
So that data privacy and LFPDPPP compliance are guaranteed.

**Acceptance Criteria:**
**Given** a new company signing up,
**When** the instance is provisioned,
**Then** a dedicated PostgreSQL schema/tenant ID is assigned and enforced by Prisma middleware,
**And** all subsequent API requests are scoped strictly to the authenticated tenant.

### Story 1.3: User Authentication & JWT Auth

As a User,
I want to securely log into the system with my email and password,
So that I can access my workspace.

**Acceptance Criteria:**
**Given** valid credentials,
**When** I attempt to log in,
**Then** the system should return a JWT (1h expiration) and a refresh token (7 days),
**And** the UI should redirect me to my corresponding dashboard.

### Story 1.4: Role-Based Access Control (RBAC)

As an Admin,
I want the system to strictly enforce permissions based on roles (Admin, Coordinator, Vendor),
So that users can only perform actions authorized for their role.

**Acceptance Criteria:**
**Given** an authenticated session,
**When** a user attempts to access an endpoint or UI route,
**Then** the RBAC middleware must validate if the user's role has permission,
**And** return a 403 Forbidden or redirect if unauthorized.

### Story 1.5: User Management for Admin

As an Admin,
I want to create, edit, and deactivate any user within my tenant,
So that I can manage my staff access.

**Acceptance Criteria:**
**Given** an Admin is logged in,
**When** they navigate to the Users settings,
**Then** they can create users assigning any role (Admin, Coordinator, Vendor),
**And** edit or soft-delete (deactivate) existing users.

### Story 1.6: User Management for Coordinator

As a Coordinator,
I want to create and deactivate Vendor users,
So that I can manage my team without needing Admin privileges.

**Acceptance Criteria:**
**Given** a Coordinator is logged in,
**When** they navigate to the Users settings,
**Then** they can only create users with the "Vendor" role,
**And** they cannot create or edit Admins or other Coordinators.

### Story 1.7: Company Profile & Branding Configuration

As an Admin,
I want to configure the company profile (name, logo, colors),
So that the platform reflects my corporate identity.

**Acceptance Criteria:**
**Given** an Admin is logged in,
**When** they update the company settings,
**Then** the changes are saved in the database,
**And** the UI (sidebar, theme) updates to reflect the branding.

## Epic 2: WhatsApp Communication

Admin configures WhatsApp Business API integration; system receives and sends messages via WhatsApp and handles media attachments.

### Story 2.1: WhatsApp API Configuration

As an Admin,
I want to securely store my WhatsApp Business API credentials,
So that the system can connect to my official number.

**Acceptance Criteria:**
**Given** the WhatsApp Settings page,
**When** an Admin enters the API Token and Phone Number ID,
**Then** the credentials are symmetrically encrypted (AES-256) and saved,
**And** the system verifies the connection by hitting Meta's API.

### Story 2.2: Incoming Message Webhook

As a System,
I need to receive incoming messages via Meta Webhooks,
So that they can be processed and shown to vendors.

**Acceptance Criteria:**
**Given** an active WhatsApp webhook connection,
**When** a client sends a message to the business number,
**Then** the backend receives the payload, verifies the webhook signature,
**And** stores the message in the database associated with the correct tenant.

### Story 2.3: Outgoing Message Delivery

As a Vendor or AI,
I want to send text messages back to the client,
So that I can answer their queries.

**Acceptance Criteria:**
**Given** an active conversation,
**When** a message is sent from the platform,
**Then** the system uses the WhatsApp Send API to deliver it,
**And** updates the message status (sent, delivered, read) via webhooks.

### Story 2.4: Media Attachment Handling

As a Client or Vendor,
I want to send and receive images and documents (JPG, PNG, PDF),
So that I can share necessary files.

**Acceptance Criteria:**
**Given** a message with media,
**When** it is received or sent,
**Then** the system downloads/uploads the media to a secure bucket,
**And** renders it correctly in the chat interface.

## Epic 3: Conversation Management

Vendors manage conversations with full history, tags and search. Coordinators supervise, comment, reassign and intervene in all conversations.

### Story 3.1: Vendor Chat Interface & Real-time Sync

As a Vendor,
I want to see my assigned conversations updating in real-time,
So that I can reply instantly to clients.

**Acceptance Criteria:**
**Given** the chat dashboard (UX-DR2),
**When** a new message arrives,
**Then** Socket.IO pushes the update,
**And** the UI reflects the new message without reloading (response < 3s).

### Story 3.2: Complete Conversation History

As a Vendor,
I want to scroll back and see the entire history with a client,
So that I understand the full context of their case.

**Acceptance Criteria:**
**Given** a chat window,
**When** I scroll up,
**Then** the system loads older messages with infinite scroll,
**And** guarantees 100% history persistence.

### Story 3.3: Chat History Search & Command Palette

As a Vendor,
I want to search through history using a Command Palette (Cmd+K),
So that I can quickly find past information (UX-DR1).

**Acceptance Criteria:**
**Given** the Cmd+K shortcut,
**When** I type a keyword,
**Then** the system returns matching messages across my conversations in < 2 seconds.

### Story 3.4: Conversation Tagging

As a Vendor,
I want to attach tags to specific messages,
So that I can categorize important points (UX-DR5).

**Acceptance Criteria:**
**Given** a message bubble,
**When** I add a tag (e.g., "Factura", "Urgente"),
**Then** the tag is visible inline and can be used as a search filter.

### Story 3.5: Coordinator Dual View

As a Coordinator,
I want to see all conversations in a Dual View (Preview & Focus mode),
So that I can monitor multiple vendors simultaneously (UX-DR3).

**Acceptance Criteria:**
**Given** the Coordinator dashboard,
**When** I toggle the view mode,
**Then** I can see a dense list of chat previews,
**And** click on any to open it in a detailed focus panel.

### Story 3.6: Coordinator Comments & Context

As a Coordinator,
I want to add internal comments to a chat thread,
So that I can guide the vendor (UX-DR16).

**Acceptance Criteria:**
**Given** a client conversation,
**When** a Coordinator posts an internal comment,
**Then** it appears visually distinct (inline thread),
**And** is completely hidden from the client on WhatsApp.

### Story 3.7: Client Reassignment & History Preservation

As a Coordinator,
I want to reassign a client to another vendor,
So that workloads can be balanced without losing context.

**Acceptance Criteria:**
**Given** an active chat,
**When** the Coordinator changes the assigned vendor,
**Then** the new vendor sees the chat appear instantly via Socket.IO,
**And** the entire history and internal comments are preserved.

### Story 3.8: Malicious User Blocking

As a Coordinator,
I want to block abusive clients,
So that they stop consuming resources.

**Acceptance Criteria:**
**Given** a client's profile,
**When** the Coordinator clicks "Block",
**Then** incoming messages from that number are ignored,
**And** active chats are closed.

### Story 3.9: Coordinator Direct Intervention

As a Coordinator,
I want to reply directly to a client in a vendor's chat,
So that I can de-escalate complex situations.

**Acceptance Criteria:**
**Given** a conversation assigned to a vendor,
**When** the Coordinator sends a message,
**Then** it is sent to the client,
**And** marked visually in the UI as sent by the Coordinator.

## Epic 4: AI Agent & RAG

AI agent handles first-line client responses with RAG knowledge, escalates to humans, and assists vendors within conversations.

### Story 4.1: AI Provider Configuration (Adapter Pattern)

As an Admin,
I want to configure the API keys for the AI Provider (e.g., Gemini),
So that the AI features can function.

**Acceptance Criteria:**
**Given** the Settings page,
**When** I input the Gemini API Key,
**Then** the backend initializes the AI Service via the Adapter Pattern,
**And** securely encrypts the keys in the database.

### Story 4.2: RAG Knowledge Base Management

As an Admin,
I want to upload documents (PDF, CSV) to the Knowledge Base,
So that the AI can answer using my company's actual data.

**Acceptance Criteria:**
**Given** the Knowledge Base UI,
**When** I upload a file,
**Then** the system extracts text, generates embeddings (pgvector),
**And** saves them linked to the tenant.

### Story 4.3: AI Auto-Response to New Clients

As a Client,
I want to get immediate answers when I send my first message,
So that I don't have to wait for a human.

**Acceptance Criteria:**
**Given** an unassigned conversation,
**When** a message arrives,
**Then** the AI queries the RAG database and replies in < 5 seconds.

### Story 4.4: AI Escalation & Human Handoff

As a Client,
I want to be routed to a human when the AI cannot resolve my issue,
So that my problem gets solved.

**Acceptance Criteria:**
**Given** a conversation managed by AI,
**When** the AI detects a complex request (or the user asks for a human),
**Then** the system triggers a handoff (< 1s),
**And** updates the UI with a subtle transition indicator (UX-DR4).

### Story 4.5: Vendor Inline AI Assistance

As a Vendor,
I want to ask the AI for suggested answers while chatting,
So that I can reply faster (UX-DR11).

**Acceptance Criteria:**
**Given** the message input box,
**When** I type "/" and request a summary or suggestion,
**Then** the AI generates a draft reply only visible to me.

### Story 4.6: Coordinator Escalation Alerts

As a Coordinator,
I want to be alerted when the AI escalates a chat,
So that I can ensure it gets handled immediately.

**Acceptance Criteria:**
**Given** an AI handoff event,
**When** it occurs,
**Then** the Coordinator dashboard shows a high-priority alert badge.

### Story 4.7: AI Off-Hours Mode

As a System,
I want the AI to inform clients when they contact us outside business hours,
So that expectations are managed.

**Acceptance Criteria:**
**Given** a message received at 2 AM,
**When** the AI responds,
**Then** it self-identifies, answers basic queries, and schedules a human callback for the next morning.

## Epic 5: Supervision & Control

Coordinator configures SLA thresholds, receives real-time alerts, views productivity metrics, and defines client assignment rules.

### Story 5.1: Client Assignment Rules Configuration

As an Admin,
I want to define how new chats are assigned (manual vs. round-robin),
So that workloads distribute according to company policy.

**Acceptance Criteria:**
**Given** the routing settings,
**When** I select "Round-Robin" and select active vendors,
**Then** the system saves the rule for the tenant.

### Story 5.2: Automatic Client Assignment Engine

As a Vendor,
I want new clients to be assigned to me automatically,
So that I don't have to claim them manually.

**Acceptance Criteria:**
**Given** round-robin routing is active,
**When** a new chat escalates from AI or arrives,
**Then** it is assigned to the vendor with the least active load.

### Story 5.3: SLA Thresholds Configuration

As a Coordinator,
I want to define acceptable response times (SLAs),
So that I can measure team performance.

**Acceptance Criteria:**
**Given** the SLA settings,
**When** I set a limit of 15 minutes for first response,
**Then** the system uses this threshold for alerts and reports.

### Story 5.4: Real-time SLA Alerts

As a Coordinator,
I want to see visual badges when a chat exceeds the SLA,
So that I can intervene (UX-DR7).

**Acceptance Criteria:**
**Given** a chat waiting for a vendor response,
**When** the wait time exceeds the SLA,
**Then** the chat turns red/orange in the UI and pushes a Socket.IO alert.

### Story 5.5: Vendor Productivity Metrics

As a Coordinator,
I want to view a dashboard with vendor metrics,
So that I can evaluate their performance.

**Acceptance Criteria:**
**Given** the Metrics dashboard,
**When** I select a date range,
**Then** I see average response times, total chats handled, and resolution rates per vendor.

### Story 5.6: Usage & Activity Reports

As an Admin,
I want to export system usage data,
So that I can analyze business volume.

**Acceptance Criteria:**
**Given** the Reports tab,
**When** I request a monthly report,
**Then** I can download a CSV with message volume, AI usage, and active sessions.

## Epic 6: Mobile Experience

Vendor receives push notifications and manages conversations with AI assistance from the mobile app.

### Story 6.1: React Native Project Scaffold

As a Developer,
I want to set up the React Native mobile app in the monorepo,
So that mobile development can begin.

**Acceptance Criteria:**
**Given** the monorepo,
**When** initialized,
**Then** the `mobile` folder contains a working React Native scaffold connected to the backend API.

### Story 6.2: Push Notifications System

As a Vendor,
I want to receive push notifications on my phone when I'm away,
So that I don't miss client messages.

**Acceptance Criteria:**
**Given** the mobile app is installed,
**When** a new message arrives to my assigned chat,
**Then** FCM/APNs delivers a push notification with a sound (UX-DR14).

### Story 6.3: Mobile Chat Interface

As a Vendor,
I want to chat with clients easily from my phone,
So that I can work remotely (UX-DR12).

**Acceptance Criteria:**
**Given** the mobile app,
**When** I open a chat,
**Then** I can see the history, send texts, and send images using mobile touch gestures.

### Story 6.4: Mobile AI Assistance

As a Vendor,
I want to trigger the AI helper from my mobile keyboard,
So that I can reply quickly on the go.

**Acceptance Criteria:**
**Given** the mobile chat interface,
**When** I tap the "AI Suggest" button,
**Then** the app queries the backend and pastes the suggested draft into my input field.
