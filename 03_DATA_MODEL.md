# Data Model: TeamFlow MVP

> Shared field reference. Add fields only when a feature needs them.

## `users`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auth provider user ID |
| `displayName` | string | Display name |
| `email` | string | Auth-managed; expose only when needed |

## `workspaces`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `name` | string | Required, 1–80 characters |
| `ownerId` | string | Creator's user ID |
| `createdAt` | timestamp | Server-generated |

## `workspaceMembers`
| Field | Type | Notes |
|---|---|---|
| `workspaceId` | string | Workspace reference |
| `userId` | string | Member reference |
| `role` | string | `owner` or `member` |
| `joinedAt` | timestamp | Server-generated |

## `tasks`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `workspaceId` | string | Parent workspace |
| `title` | string | Required, 1–120 characters |
| `assigneeId` | string/null | If set, must be a workspace member |
| `status` | string | `todo`, `in_progress`, `done` |
| `createdBy` | string | Authenticated creator |
| `createdAt` | timestamp | Server-generated |
| `updatedAt` | timestamp | Server-generated |

## Rules
- Users can read workspace data only if they are members.
- Server generates creator IDs and timestamps.
- Validate status against the allowed values.
- Enforce access in Firestore Security Rules or in the custom API; test the chosen enforcement layer.

---

## Reusable prompt

```text
Create a compact data model from the SRD and API contract.
For each entity include field/type, required or allowed values, relationships, and important validation/access rules.
Match the API contract exactly and flag contradictions instead of guessing.
Avoid speculative fields and premature complexity; model only the MVP workflow.
Use the selected database's terminology when known.
Output Markdown only.
Sources: [SRD PATH], [API CONTRACT PATH], [DATABASE CHOICE]
```
