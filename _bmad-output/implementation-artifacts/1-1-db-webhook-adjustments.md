# Story 1.1: Database Schema Expansion and Webhook Adjustments

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system administrator,
I want to expand the Conversation model to track conversation directionality and sales outcomes,
so that historical reporting and routing function correctly based on outbound vs inbound data.

## Acceptance Criteria

1. **Given** a database migration
**When** the schema is updated
**Then** the ConversationStatus enum has a new `CLOSED_WON` value
**And** the Conversation model includes an `isOutbound` boolean field defaulting to false

2. **Given** an incoming message to the WhatsApp webhook
**When** it originates from a customer
**Then** the system initializes or updates the conversation explicitly with `isOutbound = false`
**And** it correctly registers the inbound contact.

## Tasks / Subtasks

- [ ] Task 1: Update Database Schema (AC: 1)
  - [ ] Subtask 1.1: Add `CLOSED_WON` to `ConversationStatus` enum in `backend/prisma/schema.prisma`
  - [ ] Subtask 1.2: Add `isOutbound Boolean @default(false)` to `Conversation` model
  - [ ] Subtask 1.3: Run Prisma migration using the safe command: `npx prisma migrate dev --name add_conversation_direction`
- [ ] Task 2: Update Webhook Logic (AC: 2)
  - [ ] Subtask 2.1: Modify the webhook entry point (e.g., `processMessage`) in `backend/src/services/whatsapp.service.js` to handle `isOutbound`.
  - [ ] Subtask 2.2: Update the `upsert` call on the `prisma.conversation` model. `isOutbound` must ONLY be set to `false` in the `create` block. The `update` block MUST NOT touch the `isOutbound` field to avoid overwriting existing conversation directions.

## Dev Notes

### Context
We need to expand the Conversation model to track conversation directionality and sales outcomes. This ensures that historical reporting and routing function correctly based on whether a conversation was initiated outbound or inbound.

### Technical Requirements
- **Prisma Updates:** Update `ConversationStatus` and `Conversation` in `backend/prisma/schema.prisma`.
- **Migration:** Apply changes to PostgreSQL using `npx prisma migrate dev --name add_conversation_direction`.
- **Webhook Logic:** Modify the main message handler (e.g., `processMessage`) in `backend/src/services/whatsapp.service.js`.
- **Prisma Upsert Rule:** When a customer messages the webhook, ensure the Prisma `upsert` syntax specifically isolates `isOutbound` in the `create` block only. Example:
  ```javascript
  await prisma.conversation.upsert({
    where: { /* conversation identifier */ },
    update: {
      // Do NOT include isOutbound here
      lastMessageAt: new Date(),
    },
    create: {
      // ...other fields
      isOutbound: false,
    }
  });
  ```
  This is critical: If a customer replies to an existing outbound conversation, `isOutbound` MUST NOT be overwritten to false.

### Testing Requirements
- **Database:** Verify migration runs cleanly without regressions.
- **Webhook Integration:** Validate that a new inbound message correctly creates a conversation with `isOutbound: false`. Validate that an inbound reply to an existing outbound conversation does NOT change `isOutbound` to `false`.

### Architecture Compliance
- Changes are strictly localized to the backend ORM schema (`backend/prisma/schema.prisma`) and WhatsApp service integration point (`backend/src/services/whatsapp.service.js`).
- Follows existing PostgreSQL 16 + Prisma 6 and Node.js/Express 5 patterns. No architectural conflicts detected.

## Dev Agent Record

### Agent Model Used

Product Planning Agent (Read-only Subagent)

### Debug Log References

### Completion Notes List

### File List
