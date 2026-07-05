# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]
2. New code must include tests (unit/integration) as applicable
3. Lint must pass with zero errors

## Definition of Done

Before marking this story complete, ALL of the following must be satisfied:

### Code Quality
- [ ] Lint passes with zero errors (`npm run lint`)
- [ ] No secrets or credentials committed
- [ ] File List includes every new/modified/deleted file

### Tests
- [ ] Unit tests for business logic and core functionality
- [ ] Integration tests for component/API interactions (success + error cases)
- [ ] All tests pass
- [ ] No regressions introduced (existing tests still pass)

### Documentation
*For Backend stories:*
- [ ] Each new REST endpoint has JSDoc `@openapi` annotation in its route file
- [ ] Annotations are visible in Swagger UI at `/api-docs`
- [ ] Request/response schemas documented

*For Frontend stories:*
- [ ] New components have JSDoc comments (props, purpose)
- [ ] New hooks have JSDoc comments (parameters, return values)
- [ ] Key user flows are described in the story file

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Swagger docs: add `@openapi` JSDoc block above each route handler
- Tests: use existing patterns in `tests/integration/` and `tests/unit/`
- Source tree components to touch

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
