---
baseline_commit: 9a60ddd
---
# Story 4.7: AI Off-Hours Mode

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want the AI to inform clients when they contact us outside business hours,
so that expectations are managed.

## Acceptance Criteria

1. **Given** a message is received from a client,
2. **When** the current time or day is outside the tenant's configured business hours (AND the tenant has `businessHours` configured. If null, assume 24/7 operation and skip off-hours mode),
3. **Then** the AI auto-response must explicitly self-identify as an AI assistant.
4. **And** the AI must inform the client that it is currently outside business hours.
5. **And** the AI should answer basic queries using the RAG knowledge base.
6. **And** the AI must inform the user that a human will contact them the next morning (callback scheduling).
7. **And** the conversation status is set to `ESCALATED` with `aiPendingEscalation: true` so that a human reviews it next morning.

## Tasks / Subtasks

- [x] Task 1 (AC: 2) - Business Hours Configuration (Database)
  - [x] Update `backend/prisma/schema.prisma`: Add `businessHours Json?` to the `Tenant` model.
  - [x] Create a JSDoc typedef in `backend/src/utils/date.js` defining the expected JSON structure: `{ start: string, end: string, timezone: string, days: number[] }`.
  - [x] Generate and run Prisma migration (`npx prisma migrate dev --name add_tenant_business_hours`).
- [x] Task 2 (AC: 1, 2) - Off-Hours Detection Logic (Backend)
  - [x] Install `date-fns` and `date-fns-tz` if not present (`npm install date-fns date-fns-tz` in `backend/`) to safely handle timezone conversions and DST.
  - [x] Create a helper function `isOffHours(businessHours, currentDate)` in `backend/src/utils/date.js`. Return `false` immediately if `businessHours` is null or invalid (tenant operates 24/7).
  - [x] Fetch the tenant's `businessHours` before generating the auto-response in `whatsapp.service.js` and determine the off-hours state using the helper.
- [x] Task 3 (AC: 3, 4, 5, 6, 7) - AI Prompt Injection for Off-Hours (Backend)
  - [x] If off-hours, inject this explicit instruction into the system prompt for `generateAutoResponse`: *"It is currently outside business hours. You must self-identify as an AI, inform the user that human agents will review the chat the next morning, answer their question if possible using context, and include [[ESCALATE]] so a human agent is assigned."*
  - [x] Ensure the existing `[[ESCALATE]]` parser in `whatsapp.service.js` updates the conversation to `status: 'ESCALATED'` and `aiPendingEscalation: true`.
- [x] Task 4 (AC: 1-7) - Testing & Validation
  - [x] Add unit tests in `backend/tests/integration/chat.test.js` simulating off-hours for both time (e.g. 2 AM) and day (e.g. Sunday) using a mock tenant with business hours.
  - [x] Add a test verifying that if `businessHours` is null, it does NOT trigger off-hours mode (24/7 test).
  - [x] Use `jest.useFakeTimers().setSystemTime(...)` to mock the system clock safely.
  - [x] Clean up with `jest.useRealTimers()` in the `finally` block to prevent breaking other tests.

## Dev Notes

- Relevant architecture patterns and constraints
  - **Timezones:** Use `date-fns-tz` to reliably calculate the local hour and day in the tenant's timezone before comparing against `start`, `end`, and `days`.
  - **Escalation Reuse:** Rely exactly on the existing `[[ESCALATE]]` keyword mechanic implemented in 4.6. Do not reinvent the escalation socket emission.
  - **Multiple Messages Edge Case:** By transitioning to `ESCALATED`, the existing architecture naturally ignores subsequent client messages for auto-response. This is the desired behavior. Do not write additional logic to block messages.
- Source tree components to touch
  - `backend/prisma/schema.prisma`
  - `backend/src/services/whatsapp.service.js`
  - `backend/src/utils/date.js` (create if doesn't exist)
  - `backend/package.json` (add date-fns dependencies)
- Testing standards summary
  - Mock time using `jest.useFakeTimers()` to avoid flaky tests depending on CI server local time. Ensure timers are restored in teardown blocks.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - All date utilities belong in a shared `backend/src/utils/` folder to prevent cluttering service files with pure logic functions.
- Detected conflicts or variances (with rationale)
  - Modifying the `Tenant` schema is consistent with current multi-tenant boundaries. Adding `date-fns-tz` prevents critical DST calculation bugs in Node.js.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-AI-Agent--RAG]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings
- [x] [Review][Patch] Fix wording: "the next morning" is hardcoded and misaligns with "callback scheduling". It should inform that a human will contact them as soon as possible. [backend/src/services/ai.service.js]
- [x] [Review][Patch] Overnight shifts always incorrectly evaluate as off-hours because `start > end` is not handled. [backend/src/utils/date.js]
- [x] [Review][Patch] Lexicographical string comparison incorrectly evaluates times if they lack zero-padding (e.g. '9:00'). [backend/src/utils/date.js]
- [x] [Review][Patch] Strict equality fails for `days` array if values are strings instead of numbers. [backend/src/utils/date.js]
- [x] [Review][Patch] options parameter explicitly passed as null causes TypeError during object destructuring. [backend/src/services/ai.service.js]
- [x] [Review][Patch] The `isOffHours` function evaluates the day of the week before the time of day, causing shifts crossing midnight to falsely trigger on non-business days. [backend/src/utils/date.js]
- [x] [Review][Patch] Remove unprofessional rambling comments. [backend/src/utils/date.js]
- [x] [Review][Patch] Move inline require for `date.js` to module top. [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Missing error logging in `formatInTimeZone` catch block. [backend/src/utils/date.js]
- [x] [Review][Patch] Move `jest.restoreAllMocks()` inside an `afterAll` hook. [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Add missing test assertion for `aiPendingEscalation` flag. [backend/tests/integration/chat.test.js]
- [x] [Review][Patch] Update story status to DONE in markdown frontmatter. [_bmad-output/implementation-artifacts/4-7-ai-off-hours-mode.md]
- [x] [Review][Defer] Unnecessary tenant query `prisma.tenant.findUnique` inside message handling logic. [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Empty catch blocks in `afterEach` hook for database cleanup. [backend/tests/integration/chat.test.js] — deferred, pre-existing
- [x] [Review][Defer] Race condition relying on `setTimeout(r, 100)` delays before making assertions. [backend/tests/integration/chat.test.js] — deferred, pre-existing
- [x] [Review][Patch] Validate elements of `days` array to avoid coercing empty strings to 0 (Sunday). [backend/src/utils/date.js]
- [x] [Review][Patch] Handle continuous 24-hour schedules (start == end) correctly. [backend/src/utils/date.js]
- [x] [Review][Patch] Remove redundant `options || {}` destructuring in `generateAutoResponse`. [backend/src/services/ai.service.js]
- [x] [Review][Patch] Fix indentation of the appended system prompt string. [backend/src/services/ai.service.js]
- [x] [Review][Patch] Fix contradictory instructions in fallback prompt if context is missing. [backend/src/services/ai.service.js]
- [x] [Review][Patch] Move inline `require('./ai.service')` to the top. [backend/src/services/whatsapp.service.js]
- [x] [Review][Patch] Update `webhook.ai.test.js` to strictly assert the `options` payload. [backend/tests/integration/webhook.ai.test.js]
- [x] [Review][Patch] Validate format of start/end time strings in `isOffHours`. [backend/src/utils/date.js]
- [x] [Review][Patch] Validate elements of `days` array to ensure they are valid numbers. [backend/src/utils/date.js]
