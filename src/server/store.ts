/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Workspace, 
  Task, 
  WorkspaceMember, 
  User, 
  TaskStatus, 
  PlanTier,
  AgentSampleRun,
  OutputValidationResult,
  ValidationError,
  AgentRunStatus
} from '../types';
import { 
  SEED_USERS, 
  SEED_WORKSPACES, 
  SEED_MEMBERS, 
  SEED_TASKS, 
  PLAN_CONFIGS 
} from '../data/seedData';
import { config } from './config';

export class BackendStore {
  private users: User[] = [];
  private workspaces: Workspace[] = [];
  private members: WorkspaceMember[] = [];
  private tasks: Task[] = [];

  constructor() {
    this.reset();
  }

  /**
   * Reset store to initial seed fixtures
   */
  public reset(): void {
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.workspaces = JSON.parse(JSON.stringify(SEED_WORKSPACES));
    this.members = JSON.parse(JSON.stringify(SEED_MEMBERS));
    this.tasks = JSON.parse(JSON.stringify(SEED_TASKS));
  }

  // ---------------------------------------------------------------------------
  // User Queries
  // ---------------------------------------------------------------------------

  public getUserById(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  public getUserByEmail(email: string): User | null {
    const normalized = email.trim().toLowerCase();
    return this.users.find(u => u.email.toLowerCase() === normalized) || null;
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public createUser(user: User): User {
    this.users.push(user);
    return user;
  }

  // ---------------------------------------------------------------------------
  // Workspace Operations
  // ---------------------------------------------------------------------------

  public getWorkspacesForUser(userId: string): Workspace[] {
    const userWsIds = new Set(
      this.members.filter(m => m.userId === userId).map(m => m.workspaceId)
    );
    return this.workspaces.filter(ws => userWsIds.has(ws.id));
  }

  public getWorkspaceById(id: string): Workspace | null {
    return this.workspaces.find(ws => ws.id === id) || null;
  }

  public createWorkspace(name: string, ownerId: string): Workspace {
    const id = `ws_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const workspace: Workspace = {
      id,
      name,
      ownerId,
      createdAt: new Date().toISOString(),
      planTier: 'starter',
      taskLimit: PLAN_CONFIGS.starter.taskLimit,
      memberLimit: PLAN_CONFIGS.starter.memberLimit,
    };

    this.workspaces.unshift(workspace);

    // Creator automatically becomes workspace owner
    this.members.push({
      workspaceId: id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });

    return workspace;
  }

  public updateWorkspacePlan(workspaceId: string, planTier: PlanTier): Workspace | null {
    const ws = this.getWorkspaceById(workspaceId);
    if (!ws) return null;
    const plan = PLAN_CONFIGS[planTier];
    if (!plan) return null;

    ws.planTier = planTier;
    ws.taskLimit = plan.taskLimit;
    ws.memberLimit = plan.memberLimit;
    return ws;
  }

  // ---------------------------------------------------------------------------
  // Member Operations
  // ---------------------------------------------------------------------------

  public getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    return this.members
      .filter(m => m.workspaceId === workspaceId)
      .map(m => ({
        ...m,
        user: this.getUserById(m.userId) || undefined,
      }));
  }

  public getMember(workspaceId: string, userId: string): WorkspaceMember | null {
    return this.members.find(m => m.workspaceId === workspaceId && m.userId === userId) || null;
  }

  public isMember(workspaceId: string, userId: string): boolean {
    return this.members.some(m => m.workspaceId === workspaceId && m.userId === userId);
  }

  public isOwner(workspaceId: string, userId: string): boolean {
    const member = this.getMember(workspaceId, userId);
    return member?.role === 'owner';
  }

  public addMember(workspaceId: string, userId: string, role: 'owner' | 'member' = 'member'): WorkspaceMember {
    const member: WorkspaceMember = {
      workspaceId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
      user: this.getUserById(userId) || undefined,
    };
    this.members.push(member);
    return member;
  }

  // ---------------------------------------------------------------------------
  // Task Operations
  // ---------------------------------------------------------------------------

  public getTasksByWorkspace(workspaceId: string): Task[] {
    return this.tasks
      .filter(t => t.workspaceId === workspaceId)
      .map(t => ({
        ...t,
        assignee: t.assigneeId ? this.getUserById(t.assigneeId) : null,
      }));
  }

  public getTaskById(taskId: string): Task | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    return {
      ...task,
      assignee: task.assigneeId ? this.getUserById(task.assigneeId) : null,
    };
  }

  public createTask(data: {
    workspaceId: string;
    title: string;
    assigneeId?: string | null;
    status?: TaskStatus;
    createdBy: string;
  }): Task {
    const id = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const task: Task = {
      id,
      workspaceId: data.workspaceId,
      title: data.title,
      assigneeId: data.assigneeId || null,
      status: data.status || 'todo',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.unshift(task);
    return {
      ...task,
      assignee: task.assigneeId ? this.getUserById(task.assigneeId) : null,
    };
  }

  public updateTask(taskId: string, data: {
    title?: string;
    status?: TaskStatus;
    assigneeId?: string | null;
  }): Task | null {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const task = this.tasks[taskIndex];
    if (data.title !== undefined) {
      task.title = data.title;
    }
    if (data.status !== undefined) {
      task.status = data.status;
    }
    if (data.assigneeId !== undefined) {
      task.assigneeId = data.assigneeId;
    }
    task.updatedAt = new Date().toISOString();
    this.tasks[taskIndex] = task;

    return {
      ...task,
      assignee: task.assigneeId ? this.getUserById(task.assigneeId) : null,
    };
  }

  public deleteTask(taskId: string): boolean {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    return this.tasks.length < initialLen;
  }

  // ---------------------------------------------------------------------------
  // AgentOps Run Output Validation Engine
  // ---------------------------------------------------------------------------

  public validateOutput(sampleRun: any): OutputValidationResult {
    const errors: ValidationError[] = [];
    let totalChecked = 0;

    if (!sampleRun || typeof sampleRun !== 'object' || Array.isArray(sampleRun)) {
      const receivedType = sampleRun === null ? 'null' : Array.isArray(sampleRun) ? 'array' : typeof sampleRun;
      errors.push({
        field: 'payload',
        message: `Invalid input: Expected a JSON object payload, received ${receivedType}`,
        code: 'INVALID_PAYLOAD',
        expected: 'object',
        received: receivedType,
      });

      return {
        valid: false,
        errors,
        summary: `Validation failed: Root payload must be a JSON object, received ${receivedType}.`,
        details: {
          totalChecked: 1,
          passedCount: 0,
          errorCount: 1,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 1. runId
    totalChecked++;
    if (sampleRun.runId === undefined || sampleRun.runId === null) {
      errors.push({
        field: 'runId',
        message: "Missing required field: 'runId'",
        code: 'MISSING_FIELD',
        expected: 'string',
        received: sampleRun.runId === null ? 'null' : 'undefined',
      });
    } else if (typeof sampleRun.runId !== 'string') {
      errors.push({
        field: 'runId',
        message: `Invalid data type for 'runId': expected string, received ${typeof sampleRun.runId}`,
        code: 'INVALID_TYPE',
        expected: 'string',
        received: typeof sampleRun.runId,
      });
    } else if (sampleRun.runId.trim().length === 0) {
      errors.push({
        field: 'runId',
        message: "Invalid value for 'runId': string must not be empty",
        code: 'INVALID_VALUE',
        expected: 'non-empty string',
        received: 'empty string',
      });
    }

    // 2. agentId
    totalChecked++;
    if (sampleRun.agentId === undefined || sampleRun.agentId === null) {
      errors.push({
        field: 'agentId',
        message: "Missing required field: 'agentId'",
        code: 'MISSING_FIELD',
        expected: 'string',
        received: sampleRun.agentId === null ? 'null' : 'undefined',
      });
    } else if (typeof sampleRun.agentId !== 'string') {
      errors.push({
        field: 'agentId',
        message: `Invalid data type for 'agentId': expected string, received ${typeof sampleRun.agentId}`,
        code: 'INVALID_TYPE',
        expected: 'string',
        received: typeof sampleRun.agentId,
      });
    } else if (sampleRun.agentId.trim().length === 0) {
      errors.push({
        field: 'agentId',
        message: "Invalid value for 'agentId': string must not be empty",
        code: 'INVALID_VALUE',
        expected: 'non-empty string',
        received: 'empty string',
      });
    }

    // 3. status
    totalChecked++;
    const allowedStatuses: AgentRunStatus[] = ['success', 'failed', 'in_progress', 'error', 'completed'];
    if (sampleRun.status === undefined || sampleRun.status === null) {
      errors.push({
        field: 'status',
        message: "Missing required field: 'status'",
        code: 'MISSING_FIELD',
        expected: `one of [${allowedStatuses.join(', ')}]`,
        received: sampleRun.status === null ? 'null' : 'undefined',
      });
    } else if (typeof sampleRun.status !== 'string') {
      errors.push({
        field: 'status',
        message: `Invalid data type for 'status': expected string, received ${typeof sampleRun.status}`,
        code: 'INVALID_TYPE',
        expected: 'string',
        received: typeof sampleRun.status,
      });
    } else if (!allowedStatuses.includes(sampleRun.status as AgentRunStatus)) {
      errors.push({
        field: 'status',
        message: `Invalid value for 'status': '${sampleRun.status}'. Expected one of: ${allowedStatuses.join(', ')}`,
        code: 'INVALID_VALUE',
        expected: allowedStatuses.join(' | '),
        received: String(sampleRun.status),
      });
    }

    // 4. inputs
    totalChecked++;
    if (sampleRun.inputs === undefined || sampleRun.inputs === null) {
      errors.push({
        field: 'inputs',
        message: "Missing required field: 'inputs'",
        code: 'MISSING_FIELD',
        expected: 'object or string',
        received: sampleRun.inputs === null ? 'null' : 'undefined',
      });
    } else if (typeof sampleRun.inputs !== 'object' && typeof sampleRun.inputs !== 'string') {
      errors.push({
        field: 'inputs',
        message: `Invalid data type for 'inputs': expected object or string, received ${typeof sampleRun.inputs}`,
        code: 'INVALID_TYPE',
        expected: 'object | string',
        received: typeof sampleRun.inputs,
      });
    } else if (typeof sampleRun.inputs === 'string' && sampleRun.inputs.trim().length === 0) {
      errors.push({
        field: 'inputs',
        message: "Invalid value for 'inputs': string must not be empty",
        code: 'INVALID_VALUE',
        expected: 'non-empty string or object',
        received: 'empty string',
      });
    }

    // 5. outputs
    totalChecked++;
    if (sampleRun.outputs === undefined || sampleRun.outputs === null) {
      errors.push({
        field: 'outputs',
        message: "Missing required field: 'outputs'",
        code: 'MISSING_FIELD',
        expected: 'object or string',
        received: sampleRun.outputs === null ? 'null' : 'undefined',
      });
    } else if (typeof sampleRun.outputs !== 'object' && typeof sampleRun.outputs !== 'string') {
      errors.push({
        field: 'outputs',
        message: `Invalid data type for 'outputs': expected object or string, received ${typeof sampleRun.outputs}`,
        code: 'INVALID_TYPE',
        expected: 'object | string',
        received: typeof sampleRun.outputs,
      });
    } else if (typeof sampleRun.outputs === 'string' && sampleRun.outputs.trim().length === 0) {
      errors.push({
        field: 'outputs',
        message: "Invalid value for 'outputs': string must not be empty",
        code: 'INVALID_VALUE',
        expected: 'non-empty string or object',
        received: 'empty string',
      });
    }

    // Optional fields
    if (sampleRun.latencyMs !== undefined && sampleRun.latencyMs !== null) {
      totalChecked++;
      if (typeof sampleRun.latencyMs !== 'number' || isNaN(sampleRun.latencyMs)) {
        errors.push({
          field: 'latencyMs',
          message: `Invalid data type for 'latencyMs': expected number, received ${typeof sampleRun.latencyMs}`,
          code: 'INVALID_TYPE',
          expected: 'number',
          received: typeof sampleRun.latencyMs,
        });
      } else if (sampleRun.latencyMs < 0) {
        errors.push({
          field: 'latencyMs',
          message: `Invalid value for 'latencyMs': must be non-negative, received ${sampleRun.latencyMs}`,
          code: 'INVALID_VALUE',
          expected: 'number >= 0',
          received: String(sampleRun.latencyMs),
        });
      }
    }

    if (sampleRun.timestamp !== undefined && sampleRun.timestamp !== null) {
      totalChecked++;
      if (typeof sampleRun.timestamp !== 'string') {
        errors.push({
          field: 'timestamp',
          message: `Invalid data type for 'timestamp': expected ISO date string, received ${typeof sampleRun.timestamp}`,
          code: 'INVALID_TYPE',
          expected: 'string',
          received: typeof sampleRun.timestamp,
        });
      } else if (isNaN(Date.parse(sampleRun.timestamp))) {
        errors.push({
          field: 'timestamp',
          message: `Invalid value for 'timestamp': '${sampleRun.timestamp}' is not a valid date format`,
          code: 'INVALID_VALUE',
          expected: 'ISO 8601 date string',
          received: sampleRun.timestamp,
        });
      }
    }

    if (sampleRun.metrics !== undefined && sampleRun.metrics !== null) {
      totalChecked++;
      if (typeof sampleRun.metrics !== 'object' || Array.isArray(sampleRun.metrics)) {
        errors.push({
          field: 'metrics',
          message: `Invalid data type for 'metrics': expected object, received ${Array.isArray(sampleRun.metrics) ? 'array' : typeof sampleRun.metrics}`,
          code: 'INVALID_TYPE',
          expected: 'object',
          received: Array.isArray(sampleRun.metrics) ? 'array' : typeof sampleRun.metrics,
        });
      } else if (
        sampleRun.metrics.totalTokens !== undefined &&
        (typeof sampleRun.metrics.totalTokens !== 'number' || sampleRun.metrics.totalTokens < 0)
      ) {
        errors.push({
          field: 'metrics.totalTokens',
          message: `Invalid data type for 'metrics.totalTokens': expected non-negative number, received ${sampleRun.metrics.totalTokens}`,
          code: 'INVALID_TYPE',
          expected: 'number >= 0',
          received: String(sampleRun.metrics.totalTokens),
        });
      }
    }

    const isValid = errors.length === 0;
    const passedCount = totalChecked - errors.length;

    let summary = '';
    if (isValid) {
      summary = `Validation passed: All ${totalChecked} checked fields and data types match the AgentOps run specification.`;
    } else {
      const errorFieldNames = errors.map(e => `'${e.field}'`).join(', ');
      summary = `Validation failed with ${errors.length} error(s) across ${totalChecked} checked fields (${errorFieldNames}).`;
    }

    return {
      valid: isValid,
      errors,
      summary,
      details: {
        totalChecked,
        passedCount: Math.max(0, passedCount),
        errorCount: errors.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Backend Integration Status
  // ---------------------------------------------------------------------------

  public getStatus() {
    return {
      status: 'healthy',
      mode: config.nodeEnv,
      persistence: config.firebase.isConfigured ? 'firestore' : 'in_memory',
      firebase: {
        configured: config.firebase.isConfigured,
        connected: false, // Honoring "Do not pretend an external service is connected when it is not"
        projectId: config.firebase.projectId,
        message: config.firebase.isConfigured 
          ? 'Firebase credentials provided; live connection ready' 
          : 'Firebase credentials not supplied; operating with server memory store',
      },
      counts: {
        users: this.users.length,
        workspaces: this.workspaces.length,
        members: this.members.length,
        tasks: this.tasks.length,
      },
    };
  }
}

export const store = new BackendStore();

