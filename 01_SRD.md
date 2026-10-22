# SRD: TeamFlow MVP

> Keep this short. Update it only when the build scope changes.

## Goal
Help a small team create a workspace, assign tasks, and track progress.

## Users
- **Owner:** creates a workspace and manages members.
- **Member:** views and updates tasks in their workspace.

## MVP workflow
1. User signs in.
2. User creates or opens a workspace.
3. User creates and assigns a task.
4. Member changes task status.
5. Updated status appears on the board.

## Must-have
- Authentication and workspace access checks
- Workspace and task CRUD
- Statuses: `todo`, `in_progress`, `done`
- Loading, empty, and error states

## Not in MVP
Payments, real-time chat, calendar integrations, advanced analytics.

## Acceptance check
An owner can create a workspace and task; an authorized member can update the task; an unrelated user cannot read or change it.

## Build notes
React frontend; REST API; Firebase Auth + Firestore. Deploy the API separately only if using a custom backend.

---

## Reusable prompt

```text
Create or update a concise SRD from the project context and existing files.
Include: goal, users, main workflow, must-have features, out-of-scope items, and one acceptance check.
Focus on one complete end-to-end workflow we can build in the workshop.
Do not invent requirements or technologies; mark unknowns as [DECIDE].
If an SRD already exists, update it rather than creating a duplicate.
Output Markdown only.
Project: [NAME + TWO-SENTENCE DESCRIPTION]
```
