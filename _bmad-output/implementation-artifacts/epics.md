---
stepsCompleted: ["step-01", "step-02", "step-03", "step-04"]
inputDocuments: ["SPEC-modulo-de-clientes.md", "architecture-conventions.md"]
---

# Módulo de Clientes - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Módulo de Clientes, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system maintains a paginated directory of clients summarizing key engagement and sales metrics, with robust search capabilities.
FR2: Users can view a detailed historical profile for any given client including a timeline of chat history with inbound/outbound indicators.
FR3: Users can initiate new outbound conversations directly from a client's profile explicitly flagged as outbound.
FR4: Users can close a conversation with distinct outcomes: a standard closure or a successful sale.
FR5: The system correctly attributes the directionality of conversations originating from the customer as inbound via webhook.

### NonFunctional Requirements

NFR1: The system must build upon the existing database schema, expanding the Conversation model.
NFR2: The scope is strictly a directory and interaction history derived from chat and cart data (not a fully-fledged CRM with lead scoring).

### Additional Requirements

- Database (Prisma): Add `CLOSED_WON` to ConversationStatus Enum. Add `isOutbound` boolean (default false) to Conversation model.
- Backend: Client List API must return paginated list, filterable by WhatsApp/RFC, computing last vendor, last purchase (`CLOSED_WON`), and last inbound contact (`isOutbound = false`). Client Details API must return history with `isOutbound` flag and cart data. Webhook must explicitly set `isOutbound = false`.
- Frontend UI: Directory Table requires search bar (WhatsApp/RFC) and columns for Name, RFC, WhatsApp, Last Vendor (Avatar/Initials), Last Purchase date, and Last Inbound Contact date. Client Profile Drawer requires a Radiography timeline view with distinct visual indicators (blue/green) for directionality. Unblocked "New Outbound Chat" button and split 'Close Chat' options (Sin Venta vs Venta Concretada).

### UX Design Requirements

N/A (Derived from Frontend UI architectural requirements above)

### FR Coverage Map

FR1: Epic 1 - Directory Backend and Frontend implementations
FR2: Epic 1 - Client Profile Radiography API and UI Timeline
FR3: Epic 1 - Outbound Action Integrations
FR4: Epic 1 - Chat Outcomes Split Feature
FR5: Epic 1 - Foundation and Webhook Updates

## Epic List

### Epic 1: Módulo de Clientes
Sales representatives can view a complete client directory, analyze their interaction timeline with sales outcomes, and seamlessly initiate or close outbound/inbound sales conversations.
**FRs covered:** FR1, FR2, FR3, FR4, FR5


## Epic 1: Módulo de Clientes

Sales representatives can view a complete client directory, analyze their interaction timeline with sales outcomes, and seamlessly initiate or close outbound/inbound sales conversations.

### Story 1.1: Database Schema Expansion and Webhook Adjustments

As a system administrator,
I want to expand the Conversation model to track conversation directionality and sales outcomes,
So that historical reporting and routing function correctly based on outbound vs inbound data.

**Acceptance Criteria:**

**Given** a database migration
**When** the schema is updated
**Then** the ConversationStatus enum has a new `CLOSED_WON` value
**And** the Conversation model includes an `isOutbound` boolean field defaulting to false

**Given** an incoming message to the WhatsApp webhook
**When** it originates from a customer
**Then** the system initializes or updates the conversation explicitly with `isOutbound = false`
**And** it correctly registers the inbound contact.

### Story 1.2: Client Directory Backend API

As a sales representative,
I want a robust API that serves a paginated and searchable list of clients with their engagement metrics,
So that the frontend directory can quickly display the needed data.

**Acceptance Criteria:**

**Given** a request to the Client List Endpoint
**When** queried with pagination and optional filters (phoneNumber or cartData.rfc)
**Then** it returns the paginated list of clients matching the criteria
**And** each client record includes the computed fields: Last Vendor, Last Purchase Date (from `CLOSED_WON`), and Last Inbound Contact Date (`isOutbound` = false).

### Story 1.3: Client Directory Frontend Interface

As a sales representative,
I want a centralized directory to view and search for all clients and their key engagement metrics,
So that I can identify who needs follow-up.

**Acceptance Criteria:**

**Given** the Módulo de Clientes is accessed
**When** the directory table renders
**Then** it displays columns for Name, RFC, WhatsApp contact, Last Vendor (as initials or avatar), Last Purchase date, and Last Inbound Contact date

**Given** the search bar
**When** I enter a WhatsApp number or RFC
**Then** the table correctly filters to show only matching clients.

### Story 1.4: Client Profile Radiography API

As a sales representative,
I want the backend to provide my client's complete conversation history and cart data,
So that the frontend can build a radiography timeline.

**Acceptance Criteria:**

**Given** a request for Client Details
**When** a specific client ID is provided
**Then** the API returns the complete chat history explicitly including the `isOutbound` flag
**And** any associated cart/billing data is attached to the payload.

### Story 1.5: Client Profile Timeline UI and Chat Initiation

As a sales representative,
I want to view a timeline of a client's past engagements and easily start a new outbound chat from their profile,
So that I understand their context before reaching out.

**Acceptance Criteria:**

**Given** a selected client in the directory
**When** their profile is opened in the drawer/sidebar
**Then** a "Radiography" timeline view of historical chats is displayed
**And** interactions are visually distinguished (e.g., blue/green) to differentiate outbound from inbound interactions based on the `isOutbound` flag

**Given** the profile drawer view
**When** I click the "New Outbound Chat" button
**Then** a new conversation is initiated with `isOutbound = true`
**And** the chat interface successfully opens for interaction.

### Story 1.6: Chat Closure Outcomes Integration

As a sales representative,
I want the ability to explicitly close a chat as a sale or no-sale,
So that the system correctly attributes successful transactions.

**Acceptance Criteria:**

**Given** an active conversation in the chat interface
**When** I choose to close the chat
**Then** I am presented with two distinct options: 'Cerrar (Sin Venta)' and 'Cerrar (Venta Concretada)'

**Given** I select the 'Cerrar (Sin Venta)' option
**When** the closure is confirmed
**Then** the terminal status of the chat updates to `CLOSED`

**Given** I select the 'Cerrar (Venta Concretada)' option
**When** the closure is confirmed
**Then** the terminal status of the chat updates to `CLOSED_WON`.
