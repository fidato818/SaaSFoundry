/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { store } from '../store';
import { TaskStatus } from '../../types';

export const tasksRouter = Router();

// All task routes require authentication
tasksRouter.use(requireAuth);

/**
 * PATCH /api/v1/tasks/:taskId
 * Update a task's title, assignee, or status.
 * Contract:
 * Input: { "status": "in_progress" }
 * Success 200: { "id": "task_123", "status": "in_progress" }
 * Errors: 400 invalid input, 401 not signed in, 403 no permission, 404 task not found
 */
tasksRouter.patch('/:taskId', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { taskId } = req.params;

  const existingTask = store.getTaskById(taskId);
  if (!existingTask) {
    res.status(404).json({
      status: 404,
      message: 'Task not found',
      code: 'TASK_NOT_FOUND',
    });
    return;
  }

  // Caller must be a member of the task's parent workspace
  if (!store.isMember(existingTask.workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You do not have permission to modify tasks in this workspace',
      code: 'FORBIDDEN',
    });
    return;
  }

  const updates: {
    title?: string;
    status?: TaskStatus;
    assigneeId?: string | null;
  } = {};

  if (req.body?.title !== undefined) {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length < 1 || title.length > 120) {
      res.status(400).json({
        status: 400,
        message: 'Invalid input: Task title must be between 1 and 120 characters',
        fieldErrors: { title: 'Title must be 1 to 120 characters long' },
      });
      return;
    }
    updates.title = title;
  }

  if (req.body?.status !== undefined) {
    const allowedStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const status: TaskStatus = req.body.status;
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        status: 400,
        message: `Invalid input: Status must be one of: ${allowedStatuses.join(', ')}`,
        fieldErrors: { status: 'Status is not valid' },
      });
      return;
    }
    updates.status = status;
  }

  if (req.body?.assigneeId !== undefined) {
    const assigneeId = req.body.assigneeId;
    if (assigneeId !== null) {
      if (!store.isMember(existingTask.workspaceId, assigneeId)) {
        res.status(400).json({
          status: 400,
          message: 'Invalid input: Assignee must be a workspace member',
          fieldErrors: { assigneeId: 'Selected user is not a member of this workspace' },
        });
        return;
      }
    }
    updates.assigneeId = assigneeId;
  }

  const updatedTask = store.updateTask(taskId, updates);
  if (!updatedTask) {
    res.status(404).json({
      status: 404,
      message: 'Task not found',
      code: 'TASK_NOT_FOUND',
    });
    return;
  }

  // Contract response: returns documented 200 payload
  res.status(200).json({
    id: updatedTask.id,
    workspaceId: updatedTask.workspaceId,
    title: updatedTask.title,
    assigneeId: updatedTask.assigneeId,
    status: updatedTask.status,
    createdBy: updatedTask.createdBy,
    createdAt: updatedTask.createdAt,
    updatedAt: updatedTask.updatedAt,
  });
});

/**
 * GET /api/v1/tasks/:taskId
 * Retrieve a single task if caller is a member of the workspace.
 */
tasksRouter.get('/:taskId', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { taskId } = req.params;

  const task = store.getTaskById(taskId);
  if (!task) {
    res.status(404).json({
      status: 404,
      message: 'Task not found',
      code: 'TASK_NOT_FOUND',
    });
    return;
  }

  if (!store.isMember(task.workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You do not have access to tasks in this workspace',
      code: 'FORBIDDEN',
    });
    return;
  }

  res.status(200).json(task);
});

/**
 * DELETE /api/v1/tasks/:taskId
 * Delete a task if caller is a member of the workspace.
 */
tasksRouter.delete('/:taskId', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { taskId } = req.params;

  const task = store.getTaskById(taskId);
  if (!task) {
    res.status(404).json({
      status: 404,
      message: 'Task not found',
      code: 'TASK_NOT_FOUND',
    });
    return;
  }

  if (!store.isMember(task.workspaceId, user.id)) {
    res.status(403).json({
      status: 403,
      message: 'Forbidden: You do not have permission to delete tasks in this workspace',
      code: 'FORBIDDEN',
    });
    return;
  }

  store.deleteTask(taskId);
  res.status(200).json({ success: true, id: taskId });
});

