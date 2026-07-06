---
baseline_commit: NO_VCS
---

# Story 3.7: Client Reassignment & History Preservation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Coordinator,
I want to reassign a client to another vendor,
So that workloads can be balanced without losing context.

## Acceptance Criteria

1. **Given** an active chat, **When** the Coordinator changes the assigned vendor, **Then** the new vendor sees the chat appear instantly via Socket.IO, **And** the entire history and internal comments are preserved.

## Tasks / Subtasks

- [ ] Task 1: Backend API for Reassignment (AC: 1)
  - [ ] Create endpoint `PATCH /api/conversations/:id/assign` to update the assigned vendor ID.
  - [ ] Add strict RBAC validation to ensure only `COORDINATOR` and `ADMIN` roles can reassign.
  - [ ] Implement logic to broadcast Socket.IO events to both the old vendor (to remove the chat from their active list) and the new vendor (to add it).
- [ ] Task 2: Frontend UI for Reassignment (AC: 1)
  - [ ] Update `FocusPanel` or `ChatHeader` to include a vendor assignment dropdown for Coordinators.
  - [ ] Fetch the list of active vendors to populate the dropdown.
  - [ ] Handle API submission when a new vendor is selected, providing loading/success/error feedback.
- [ ] Task 3: State Management & Socket (AC: 1)
  - [ ] Update `useChatStore.js` to handle `conversation_reassigned` socket events.
  - [ ] Ensure that if a vendor receives a reassignment event moving a chat to them, the chat is added to their `conversations` list and history is accessible.
  - [ ] Ensure that if a vendor receives a reassignment event removing a chat from them, the chat is removed from their active `conversations` list.

## Dev Notes

### Architecture & Guardrails
- **State Management:** When updating Zustand arrays or objects (like `conversations` list), return a new array/object to ensure React re-renders properly. Do NOT mutate state directly.
- **Styling:** Use React 19 & Tailwind CSS 4. Follow utility class order: Layout → Sizing → Colors → Effects → Typography. Apply glassmorphism and the Slate/Coral/Orange palette.
- **Socket Rooms:** Be extremely careful about joining/leaving socket rooms when a conversation is reassigned so that the old vendor stops receiving messages for it, and the new vendor starts receiving them.

### Known Technical Debt / Previous Learnings
- **MessageList Re-renders:** Be careful when using `MessageList.jsx`; memoization is required.
- **Socket Events:** Previous stories had issues with duplicate socket messages. For reassignment, ensure the frontend handles the event idempotently.
- **Role Validation:** Reassignment must strictly validate roles on backend.
- **Optimistic Updates:** When updating UI optimistically, avoid naive ID generation like `Date.now()`.

### File Structure Requirements
- `backend/src/routes/chat.routes.js` (UPDATE)
- `backend/src/services/chat.service.js` (UPDATE)
- `backend/src/socket.js` (UPDATE - for reassignment broadcasts)
- `frontend/src/features/chat/components/FocusPanel.jsx` or similar header component (UPDATE)
- `frontend/src/stores/useChatStore.js` (UPDATE)

### Project Structure Notes
- Component boundaries strictly follow the `/features/chat/components` domain-driven structure.
- State is managed via Zustand `useChatStore.js`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic_3]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional_Requirements] (FR20, FR21)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings
- [x] [Review][Patch] Avoid redundant reassignment (vendorId === oldVendorId) [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Validate new vendorId exists and belongs to tenant [backend/src/routes/chat.routes.js]
- [x] [Review][Patch] Prevent unauthorized clients from joining arbitrary vendor sockets [backend/src/socket.js]
- [x] [Review][Patch] Null check on conversation prop in VendorAssignmentSelect [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Patch] Missing Socket Room Detachment (Message Leak) [backend/src/socket.js / frontend]
- [x] [Review][Patch] Missing Success Feedback on Vendor Reassignment [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Patch] Non-Compliant Tailwind Class Ordering [frontend/src/features/chat/components/FocusPanel.jsx]
- [x] [Review][Defer] Concurrent reassignments race condition [backend/src/routes/chat.routes.js] — deferred, pre-existing edge case
