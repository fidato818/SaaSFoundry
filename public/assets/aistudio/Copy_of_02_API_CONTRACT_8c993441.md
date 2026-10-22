# API Contract: TeamFlow MVP

> Document only endpoints used by the MVP. Keep examples aligned with the code.

Base path: `/api/v1`

## `POST /workspaces`
Create a workspace for the authenticated user.

Request:
```json
{ "name": "Launch Team" }
```

Success `201`:
```json
{ "id": "ws_123", "name": "Launch Team", "ownerId": "user_123" }
```

Errors: `400` invalid input · `401` not signed in

## `POST /workspaces/{workspaceId}/tasks`
Create a task in a workspace the caller can access.

Request:
```json
{ "title": "Build landing page", "assigneeId": "user_456", "status": "todo" }
```

Success `201`:
```json
{ "id": "task_123", "workspaceId": "ws_123", "title": "Build landing page", "assigneeId": "user_456", "status": "todo" }
```

Errors: `400` invalid input · `401` not signed in · `403` no workspace access · `404` workspace not found

## `PATCH /tasks/{taskId}`
Update a task's title, assignee, or status.

Request:
```json
{ "status": "in_progress" }
```

Success `200`:
```json
{ "id": "task_123", "status": "in_progress" }
```

Errors: `400` invalid input · `401` not signed in · `403` no permission · `404` task not found

## Contract rules
- Validate input on the server.
- Derive `ownerId`, creator IDs, and timestamps from trusted auth/server context.
- Never trust a client-supplied ID to grant access.
- Use consistent errors; do not expose secrets or stack traces.

---

## Reusable prompt

```text
Draft a concise API contract from the SRD and current code.
For each required endpoint include method/path, purpose, auth/access rule, minimal request and success JSON, and expected errors.
Keep names, fields, and enums consistent with the SRD and data model.
Do not invent endpoints or fields; mark unknowns as [DECIDE].
If code exists, document the real behavior instead of silently redesigning it.
Output Markdown only.
Sources: [SRD PATH], [DATA MODEL PATH], [ROUTE/SCHEMA PATHS]
```
