# Epic Close Gate — Verification Process

## Purpose

Prevent the situation that occurred at the end of Epic 1, where a story (1.6) was still pending but the epic was declared complete. This gate ensures all stories are accounted for before an epic is marked as `done`.

## Process Steps

When a user (or agent) proposes closing an epic, the following verification MUST be completed before marking it as done:

### Step 1: Source of Truth Audit

Read `epics.md` and extract:
- The complete list of stories under the epic being closed
- The acceptance criteria for each story

### Step 2: Implementation Artifact Check

For each story in the epic, verify that EITHER:
- An implementation artifact exists in `_bmad-output/implementation-artifacts/` (named `<epic>-<story>-<slug>.md`), OR
- The story is explicitly marked as completed with a note about where the implementation lives

If a story has no artifact and no completion note → **STOP. Do not close epic.**

### Step 3: AC Coverage Verification

For each story's acceptance criteria:
- Verify every `Given/When/Then` scenario is addressed by existing code or documentation
- If any AC is uncovered → **STOP. Do not close epic.**

### Step 4: Test Verification

- Run the full test suite (`npx jest --forceExit` in backend)
- Verify no regressions and all tests pass
- If tests fail → **STOP. Do not close epic.**

### Step 5: Lint Verification

- Run `npx eslint .` (or equivalent) in both backend and frontend
- If lint errors exist → **STOP. Do not close epic.**

### Step 6: Mark Epic Complete

Only after Steps 1-5 pass:
1. Update the epic's status in `epics.md` to `✅ (COMPLETE — verified by epic gate)`
2. Update the status line to show `N/N stories implemented`
3. Add a story table showing each story's status and artifact location
4. Push the change

## Checklist Template

```markdown
## Epic Close Gate — [Epic Name]

- [ ] Step 1: Source of Truth Audit — stories list extracted from epics.md
- [ ] Step 2: Implementation Artifact Check — all stories have artifacts or completion notes
- [ ] Step 3: AC Coverage Verification — every acceptance criterion is covered
- [ ] Step 4: Test Verification — all N tests pass (run: npx jest --forceExit)
- [ ] Step 5: Lint Verification — no lint errors (run: npx eslint .)
- [ ] Step 6: epics.md updated with story table and complete status

Gate passed by: [agent/user]
Date: [date]
```
