---
baseline_commit: NO_VCS
status: done
---

# Story 3.5: Coordinator Dual View

## 📖 Story

As a Coordinator,
I want to see all conversations in a Dual View (Preview & Focus mode),
so that I can monitor multiple vendors simultaneously without losing control.

## 🎯 Acceptance Criteria

- **Given** the Coordinator dashboard, **When** I toggle view mode, **Then** I see a dense list of chat previews (2 rows per chat).
- **Given** the dense preview list, **When** I click on up to 2 chats, **Then** they open side-by-side in a detailed focus panel.
- **Given** 2 chats are focused, **When** I click a 3rd chat, **Then** the oldest focused chat is replaced.

## 📋 Tasks / Subtasks

- [x] **Task 1: Backend Support for Coordinator View** (AC: 1)
  - [x] Update `GET /api/chat` to accept a `?role=coordinator` parameter (or derive from auth) to return all tenant conversations.
  - [x] Update Socket.IO logic (`backend/src/socket.js`) to broadcast message updates to a new `tenant_{tenantId}_coordinators` room, in addition to the specific `conversationId` room.
- [x] **Task 2: State Management & UI Shell** (AC: 1, 2)
  - [x] Update `frontend/src/stores/useUIStore.js` to track `coordinatorViewMode` ('preview' | 'focus') and `focusedChatIds` (array, max 2 elements).
  - [x] Update `frontend/src/pages/Dashboard.jsx` to render the `CoordinatorDashboard` if the user is a Coordinator.
  - [x] Subscribe to the `tenant_{tenantId}_coordinators` socket room on mount.
- [x] **Task 3: Preview Grid & Component Reuse** (AC: 1)
  - [x] Refactor `frontend/src/features/chat/components/ChatList.jsx` to accept a `layout="grid"` or `layout="list"` prop, reusing existing mapping logic instead of building a new grid from scratch.
  - [x] Implement the `CoordinatorDashboard` component showing the grid.
- [x] **Task 4: Focus Panel** (AC: 2, 3)
  - [x] Create `frontend/src/features/chat/components/FocusPanel.jsx` to render up to 2 selected chats side-by-side.
  - [x] Implement an "Empty State" UI in `FocusPanel` to instruct the user to "Selecciona un chat para enfocar" when `focusedChatIds` is empty.
  - [x] Enforce the max 2 chats logic (replace oldest) when a 3rd chat is clicked.

### Review Findings
- [x] [Review][Patch] Empty state text in FocusPanel.jsx does not match AC [frontend/src/features/chat/components/FocusPanel.jsx:151]
- [x] [Review][Patch] Deviation from Approved Color Palette in ChatList and FocusPanel [frontend/src/features/chat/components/FocusPanel.jsx:148]
- [x] [Review][Patch] Non-compliant Tailwind CSS Utility Class Ordering [frontend/src/features/chat/components/FocusPanel.jsx:113]
- [x] [Review][Patch] loadMessages lacks AbortController causing memory leaks on rapid toggle [frontend/src/features/chat/components/FocusPanel.jsx:21]
- [x] [Review][Patch] Network failures in handleSendMessage silently purge drafted text [frontend/src/features/chat/components/FocusPanel.jsx:87]
- [x] [Review][Patch] Optimistic message temp ID uses naive Date.now causing collisions [frontend/src/features/chat/components/FocusPanel.jsx:75]
- [x] [Review][Patch] Socket emits new_message with null payload crashes UI [frontend/src/features/chat/components/FocusPanel.jsx:50]
- [x] [Review][Patch] API POST response is OK but lacks data field [frontend/src/features/chat/components/FocusPanel.jsx:87]
- [x] [Review][Defer] Socket.io lacking auth for join:conversation / join:tenant_coordinators [backend/src/socket.js:17] — deferred, pre-existing
- [x] [Review][Defer] WhatsApp service incomingLocks mutex broken [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Double-deletion of temporary media files [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Message search route /chat/search un-paginated [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Updating lastMessageAt outside Prisma transaction [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Meta media download logic validates content-length late [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Media handling suppresses filesystem cleanup errors [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Socket emission errors swept under rug [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Webhook payload missing message.from [backend/src/services/whatsapp.service.js:93] — deferred, pre-existing
- [x] [Review][Defer] Message type unsupported [backend/src/services/whatsapp.service.js:99] — deferred, pre-existing
- [x] [Review][Defer] Meta API returns non-ok status for metadata [backend/src/services/whatsapp.service.js:174] — deferred, pre-existing
- [x] [Review][Defer] Meta JSON lacks media url [backend/src/services/whatsapp.service.js:178] — deferred, pre-existing
- [x] [Review][Defer] Meta API file empty body [backend/src/services/whatsapp.service.js:194] — deferred, pre-existing
- [x] [Review][Defer] aroundMessageId cursor does not exist [backend/src/routes/chat.routes.js:334] — deferred, pre-existing
- [x] [Review][Defer] Conversation lacks lastMessageAt and createdAt displays Invalid Date [frontend/src/features/chat/components/ChatList.jsx:35] — deferred, pre-existing

## 🧠 Dev Notes

### Architecture & Guardrails
- **Role Validation:** Ensure the UI strictly checks `useAuthStore` to confirm the user is a Coordinator.
- **Zustand State:** When updating Zustand arrays or objects (like `focusedChatIds`), return a new array/object to ensure React re-renders properly. Do NOT mutate state directly. Use inline selectors (e.g., `useUIStore(s => s.focusedChatIds)`) to prevent re-renders.
- **Styling:** Use React 19 & Tailwind CSS 4. Follow utility class order: Layout → Sizing → Colors → Effects → Typography. Apply glassmorphism and the Slate/Coral/Orange palette.
- **Transitions:** Use Framer Motion 12 for simple `layout` transitions between Preview and Focus modes.

### Known Technical Debt / Previous Learnings
- **Socket Rooms:** Coordinators MUST NOT subscribe to every single conversation ID room, as this will crash the client/server with 50+ chats. Using the global `tenant_{tenantId}_coordinators` room is mandatory.
- **MessageList Re-renders:** Previous stories identified `MessageList.jsx` as causing massive re-renders on keystroke. Be extremely careful when using it in Focus Mode; memoization is required.

### File Structure Requirements
- `backend/src/routes/chat.routes.js` (UPDATE)
- `backend/src/socket.js` (UPDATE)
- `frontend/src/pages/Dashboard.jsx` (UPDATE)
- `frontend/src/stores/useUIStore.js` (UPDATE/CREATE)
- `frontend/src/features/chat/components/ChatList.jsx` (UPDATE)
- `frontend/src/features/chat/components/CoordinatorDashboard.jsx` (CREATE)
- `frontend/src/features/chat/components/FocusPanel.jsx` (CREATE)

### Project Structure Notes
- Component boundaries (FocusPanel vs CoordinatorDashboard) strictly follow the `/features/chat/components` domain-driven structure.
- View state is properly lifted to `useUIStore.js` to ensure the layout components remain decoupled.

### References
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Usuario_Coordinador]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic_3]

## 🧑‍💻 Dev Agent Record

### Agent Model Used
*(Pending Dev Agent)*

### Debug Log References
*(Pending Dev Agent)*

### Completion Notes List
*(Pending Dev Agent)*

### File List
*(Pending Dev Agent)*
