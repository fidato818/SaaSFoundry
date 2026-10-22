/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { store } from '../store';
import { TaskStatus, PlanTier } from '../../types';
import { PLAN_CONFIGS } from '../../data/seedData';

export const workspacesRouter = Router();

// All workspace routes require authentication
workspacesRouter.use(requireAuth);

/**
 * POST /api/v1/workspaces
 * Create a workspace for the authenticated user.
 * Contract:
 * Input: { "name": "Launch Team" }
 * Success 201: { "id": "ws_123", "name": "Launch Team", "ownerId": "user_123" }
 * Errors: 400 invalid input, 401 not signed in
 */
workspacesRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!name || name.length < 1 || name.length > 80) {
    res.status(400).json({
      status: 400,
      message: 'Invalid input: Workspace name is required and must be between 1 and 80 characters',
      fieldErrors: { name: 'Name must be 1 to 80 characters long' },
    });
    return;
  }

  const workspace = store.createWorkspace(name, user.id);

  // Return documented response
  res.status(201).json({
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    planTier: workspace.planTier,
    taskLimit: workspace.taskLimit,
    memberLimit: workspace.memberLimit,
  });
});

/**
 * GET /api/v1/workspaces
 * List workspaces the authenticated user is a member of.
 */
workspacesRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const workspaces = store.getWorkspacesForUser(user.id);
  res.status(200).json(workspaces);
});

/**
 * GET /api/v1/workspaces/:workspaceId
 * Get details of a single workspace if caller is a member.
 */
workspacesRouter.get('/:workspaceId', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;
  const workspace = store.getWorkspaceById(workspaceId);

  if (!workspace) {
    res.status(404).json({
      status: 404,
      message: 'Workspace not found',
      code: 'WORKSPACE_NOT_FOUND',
    });
    return;
  }

  if (!store.isMember(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You are not a member of this workspace',
      code: 'NO_WORKSPACE_ACCESS',
    });
    return;
  }

  res.status(200).json(workspace);
});

/**
 * POST /api/v1/workspaces/:workspaceId/tasks
 * Create a task in a workspace the caller can access.
 * Contract:
 * Input: { "title": "Build landing page", "assigneeId": "user_456", "status": "todo" }
 * Success 201: { "id": "task_123", "workspaceId": "ws_123", "title": "...", "assigneeId": "...", "status": "todo" }
 * Errors: 400 invalid input, 401 not signed in, 403 no workspace access, 404 workspace not found
 */
workspacesRouter.post('/:workspaceId/tasks', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;

  const workspace = store.getWorkspaceById(workspaceId);
  if (!workspace) {
    res.status(404).json({
      status: 404,
      message: 'Workspace not found',
      code: 'WORKSPACE_NOT_FOUND',
    });
    return;
  }

  if (!store.isMember(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You are not a member of this workspace',
      code: 'NO_WORKSPACE_ACCESS',
    });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length < 1 || title.length > 120) {
    res.status(400).json({
      status: 400,
      message: 'Invalid input: Task title is required and must be between 1 and 120 characters',
      fieldErrors: { title: 'Title must be 1 to 120 characters long' },
    });
    return;
  }

  const allowedStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
  const status: TaskStatus = req.body?.status || 'todo';
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({
      status: 400,
      message: `Invalid input: Status must be one of: ${allowedStatuses.join(', ')}`,
      fieldErrors: { status: 'Status is not valid' },
    });
    return;
  }

  const assigneeId = req.body?.assigneeId || null;
  if (assigneeId) {
    if (!store.isMember(workspaceId, assigneeId)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid input: Assignee must be an active workspace member',
        fieldErrors: { assigneeId: 'Selected user is not a member of this workspace' },
      });
      return;
    }
  }

  // Quota enforcement
  const existingTasks = store.getTasksByWorkspace(workspaceId);
  if (existingTasks.length >= workspace.taskLimit) {
    res.status(400).json({
      status: 400,
      message: `Plan limit reached: The ${workspace.planTier.toUpperCase()} tier allows max ${workspace.taskLimit} tasks. Upgrade to create more.`,
      code: 'QUOTA_EXCEEDED',
    });
    return;
  }

  const task = store.createTask({
    workspaceId,
    title,
    assigneeId,
    status,
    createdBy: user.id,
  });

  res.status(201).json({
    id: task.id,
    workspaceId: task.workspaceId,
    title: task.title,
    assigneeId: task.assigneeId,
    status: task.status,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/tasks
 * Get all tasks for a workspace if caller is a member.
 */
workspacesRouter.get('/:workspaceId/tasks', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;

  const workspace = store.getWorkspaceById(workspaceId);
  if (!workspace) {
    res.status(404).json({
      status: 404,
      message: 'Workspace not found',
      code: 'WORKSPACE_NOT_FOUND',
    });
    return;
  }

  if (!store.isMember(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You are not a member of this workspace',
      code: 'NO_WORKSPACE_ACCESS',
    });
    return;
  }

  const tasks = store.getTasksByWorkspace(workspaceId);
  res.status(200).json(tasks);
});

/**
 * GET /api/v1/workspaces/:workspaceId/members
 * Get all members of a workspace.
 */
workspacesRouter.get('/:workspaceId/members', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;

  if (!store.isMember(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You are not a member of this workspace',
      code: 'NO_WORKSPACE_ACCESS',
    });
    return;
  }

  const members = store.getWorkspaceMembers(workspaceId);
  res.status(200).json(members);
});

/**
 * POST /api/v1/workspaces/:workspaceId/members
 * Invite a member to a workspace (Owner only).
 */
workspacesRouter.post('/:workspaceId/members', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;

  const workspace = store.getWorkspaceById(workspaceId);
  if (!workspace) {
    res.status(404).json({ status: 404, message: 'Workspace not found' });
    return;
  }

  if (!store.isOwner(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: Only workspace owners can invite team members',
      code: 'OWNER_ONLY',
    });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    res.status(400).json({
      status: 400,
      message: 'A valid email address is required',
      fieldErrors: { email: 'Please enter a valid email address' },
    });
    return;
  }

  const role = req.body?.role === 'owner' ? 'owner' : 'member';

  // Check seat quota
  const currentMembers = store.getWorkspaceMembers(workspaceId);
  if (currentMembers.length >= workspace.memberLimit) {
    res.status(400).json({
      status: 400,
      message: `Plan limit reached: The ${workspace.planTier.toUpperCase()} tier allows max ${workspace.memberLimit} members. Upgrade to invite more.`,
      code: 'QUOTA_EXCEEDED',
    });
    return;
  }

  let invitee = store.getUserByEmail(email);
  if (!invitee) {
    invitee = store.createUser({
      id: `user_${Date.now().toString(36)}`,
      displayName: email.split('@')[0],
      email,
    });
  }

  if (store.isMember(workspaceId, invitee.id)) {
    res.status(400).json({
      status: 400,
      message: 'User is already a member of this workspace',
    });
    return;
  }

  const newMember = store.addMember(workspaceId, invitee.id, role);
  res.status(201).json(newMember);
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/plan
 * Update workspace subscription tier and quota limits (Owner only).
 */
workspacesRouter.patch('/:workspaceId/plan', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { workspaceId } = req.params;

  const workspace = store.getWorkspaceById(workspaceId);
  if (!workspace) {
    res.status(404).json({ status: 404, message: 'Workspace not found' });
    return;
  }

  if (!store.isOwner(workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: Only workspace owners can update plan tiers',
      code: 'OWNER_ONLY',
    });
    return;
  }

  const planTier = req.body?.planTier as PlanTier;
  if (!planTier || !PLAN_CONFIGS[planTier]) {
    res.status(400).json({
      status: 400,
      message: 'Invalid plan tier. Allowed: starter, growth, scale',
    });
    return;
  }

  const updated = store.updateWorkspacePlan(workspaceId, planTier);
  res.status(200).json(updated);
});

