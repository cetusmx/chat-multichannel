---
baseline_commit: 88ad9e2aea8e258ffe284307a89f1fa8be49a5d5
---

# Story 6.4: Mobile AI Assistance

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Vendor,
I want to trigger the AI helper from my mobile keyboard using a `/` command or an AI Suggest button,
so that I can reply quickly on the go.

## Acceptance Criteria

1. **Given** the mobile chat interface, **When** I tap the "AI Suggest" button or type a `/` command, **Then** the app queries the backend (`POST /api/conversations/:id/ai-assist`).
2. **Given** the AI is processing, **When** it takes time, **Then** the UI shows a loading state and disables the input to prevent race conditions.
3. **Given** a successful AI response, **When** it arrives, **Then** the suggested draft is pasted into the input field for me to edit, without sending it automatically.
4. **Given** a network failure, **When** the AI request fails, **Then** the loading state is cleared and an error Toast is shown.

## Tasks / Subtasks

- [ ] Task 1 (AC: 1, 2)
  - [ ] Subtask 1.1: Modify `mobile/src/components/ChatInput.jsx` to include an "AI Suggest" button (e.g., a magic wand icon). CRITICAL: Integrate it elegantly into the existing flex container without breaking the `TextInput` styling or expanding the area out of bounds.
  - [ ] Subtask 1.2: In `ChatInput.jsx`, accept a new prop `isAiLoading`. When true, show a small `ActivityIndicator` in place of or inside the AI Suggest button and disable the Send and AI Suggest buttons to prevent duplicate requests.
  - [ ] Subtask 1.3: In `ChatInput.jsx`, accept a new prop `onRequestAi(text)`. Trigger this callback when the user taps the AI button or when detecting if the user types `/ai ` (or similar command pattern) at the start of the text.
- [ ] Task 2 (AC: 1, 4)
  - [ ] Subtask 2.1: Implement the API call in the smart container `mobile/src/screens/ChatDetailScreen.jsx` by adding a `handleRequestAi(text)` function. CRITICAL: Import `{ post } from '../services/api'` and hit the endpoint `/conversations/${chatId}/ai-assist` sending `{ prompt: text }`. DO NOT create a new backend endpoint.
  - [ ] Subtask 2.2: Ensure error boundaries in `ChatDetailScreen.jsx`: Wrap the fetch in a try/catch, use `Toast.show({ type: 'error' })` on failure, and manage a local `isAiLoading` state, ensuring it is ALWAYS cleared in the `finally` block to prevent UI locks.
- [ ] Task 3 (AC: 3)
  - [ ] Subtask 3.1: To inject the text into the child component's local state cleanly, wrap `ChatInput` with `forwardRef` and use `useImperativeHandle` to expose an `injectText(draft)` method. 
  - [ ] Subtask 3.2: Upon successful API response in `ChatDetailScreen.jsx`, call `chatInputRef.current?.injectText(draft)`.
  - [ ] Subtask 3.3: CRITICAL: Maintain focus on the `TextInput` in `ChatInput.jsx` after pasting the suggestion so the Keyboard doesn't unexpectedly dismiss and break the `KeyboardAvoidingView` layout.

## Dev Notes

- Relevant architecture patterns and constraints:
  - Mobile project uses bare React Native.
  - Strictly separate presentational components (`ChatInput.jsx`) from container logic (`ChatDetailScreen.jsx`).
  - Use `mobile/src/services/api.js` for backend requests, which already handles JWT appending via Axios/fetch wrappers.
  - The backend endpoint `/api/conversations/:id/ai-assist` exists and expects a `{ prompt: string }` body (max 1000 chars).
- Source tree components to touch:
  - `mobile/src/components/ChatInput.jsx`
  - `mobile/src/screens/ChatDetailScreen.jsx`
- Testing standards summary:
  - Ensure the UI doesn't crash if the AI returns an empty string or null.
  - Ensure the keyboard remains open when the text is injected.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming):
  - Do NOT duplicate the input logic in `ChatDetailScreen.jsx`. Extend the existing `ChatInput.jsx` cleanly.
- Detected conflicts or variances (with rationale):
  - The API path on the backend is `/api/conversations/:id/ai-assist`. The mobile `api.js` automatically prepends `BASE_URL/api`. Call `post('/conversations/${chatId}/ai-assist', ...)` directly. Do not confuse it with `/chat` endpoints used for messages.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#FR16] Vendor can request AI assistance within a conversation.
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR11] Quick responses via "/" command within chat.
- [Source: backend/src/routes/conversation.routes.js#L47] `POST /:id/ai-assist` expecting `{ prompt: string }`.

## Dev Agent Record

### Agent Model Used

Antigravity 2.0 (BMad Context Engine)

### Debug Log References

- Reviewed `backend/src/routes/conversation.routes.js` to extract correct payload and endpoint.
- Reviewed `epics.md` to restore UX constraints (UX-DR11).
- Reviewed `mobile/src/components/ChatInput.jsx` to enforce React `forwardRef` architecture instead of lifting state.

### Completion Notes List

- Applied 100% adherence to `template.md` including exact headers like `Task 1 (AC: #)`.
- Exposed the existing backend endpoint to prevent the dev agent from reinventing it.
- Explicit instructions added regarding UI state (loading, error handling) and Keyboard retention.
- Explicit React architecture patterns defined to prevent spaghetti code between Smart and Presentational components.

### File List

- `mobile/src/screens/ChatDetailScreen.jsx`
- `mobile/src/components/ChatInput.jsx`
