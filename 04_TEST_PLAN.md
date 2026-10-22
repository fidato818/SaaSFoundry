# Test Plan: TeamFlow MVP

> Test the main user journey and highest-risk failure cases. Keep it small.

## Critical tests

| ID | Scenario | Expected result |
|---|---|---|
| T1 | Owner creates a workspace | Workspace is saved and appears in the list |
| T2 | Owner creates a task with a valid title | Task persists with `todo` status |
| T3 | Member changes task status | New status remains after refresh |
| T4 | Signed-out user calls a protected endpoint | Request is rejected with `401` |
| T5 | Non-member reads or updates a task | Access is denied |
| T6 | Empty title or invalid status is submitted | Validation error is returned |
| T7 | API/database fails during save | UI shows an error and does not claim success |
| T8 | Valid Agent Run Output Validation | Returns `valid: true` with 0 errors and success summary |
| T9 | Missing Required Fields (agentId, outputs) | Returns `valid: false` with `MISSING_FIELD` error codes |
| T10 | Invalid Data Types (status, latencyMs, inputs) | Returns `valid: false` with `INVALID_TYPE` error codes |
| T11 | API Failure Handling on Validate Route | Gracefully captures simulated 500 error |

## Before demo
- [ ] Complete the sign-in-to-task-update workflow.
- [ ] Refresh and confirm saved data persists.
- [ ] Test one invalid input and one unauthorized request.
- [ ] Verify AgentOps output validation with valid and invalid sample runs.
- [ ] Check loading, empty, and error states.
- [ ] Verify deployed frontend uses the correct API.
- [ ] Confirm no secrets are committed.

## Known limitations
Document untested features honestly. Do not claim production readiness based on this checklist.

---

## Reusable prompt

```text
Create a short, risk-focused test plan from the SRD, API contract, data model, and implemented code.
Include 5–8 specific scenarios with expected results, at least one invalid-input case, one authorization/security case, and a tiny pre-demo checklist.
Prioritize the main workflow and likely failure points. Exclude features outside the MVP.
Suggest only the smallest useful automated tests for the existing stack.
Never claim a test passed unless it was actually run and the result is known.
Output Markdown only.
Sources: [SRD PATH], [API CONTRACT PATH], [DATA MODEL PATH], [RELEVANT CODE PATHS]
```
