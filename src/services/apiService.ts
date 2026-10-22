/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Task, 
  Workspace, 
  WorkspaceMember, 
  User, 
  TaskStatus, 
  PlanTier, 
  ApiError,
  AgentSampleRun,
  OutputValidationResult,
  ValidationError,
  AgentRunStatus
} from '../types';
import { SEED_USERS, SEED_WORKSPACES, SEED_MEMBERS, SEED_TASKS, PLAN_CONFIGS } from '../data/seedData';

// Configurable API base URL as required
export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

const STORAGE_KEYS = {
  WORKSPACES: 'saasfoundry_workspaces_v1',
  TASKS: 'saasfoundry_tasks_v1',
  MEMBERS: 'saasfoundry_members_v1',
  CURRENT_USER_ID: 'saasfoundry_active_user_id',
  SIMULATE_FAILURE: 'saasfoundry_simulate_failure',
};

export type SimulationMode = 'none' | '401_unauthenticated' | '403_forbidden' | '500_server_error';

class ApiService {
  private currentUserId: string = 'user_alex'; // Default to Alex (Owner)
  private simulateFailure: SimulationMode = 'none';

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      if (!localStorage.getItem(STORAGE_KEYS.WORKSPACES)) {
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(SEED_WORKSPACES));
      }
      if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(SEED_MEMBERS));
      }
      const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (savedUserId) {
        this.currentUserId = savedUserId;
      }
    } catch {
      // Graceful fallback for non-browser or sandboxed storage
    }
  }

  public resetToSeedData(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(SEED_WORKSPACES));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(SEED_MEMBERS));
      } catch {}
    }
    this.currentUserId = 'user_alex';
    this.simulateFailure = 'none';
  }

  public setSimulationMode(mode: SimulationMode) {
    this.simulateFailure = mode;
  }

  public getSimulationMode(): SimulationMode {
    return this.simulateFailure;
  }

  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
      } catch {}
    }
  }

  public getCurrentUser(): User | null {
    if (this.currentUserId === 'none') return null;
    return SEED_USERS.find(u => u.id === this.currentUserId) || null;
  }

  public getAllUsers(): User[] {
    return SEED_USERS;
  }

  private checkSimulatedErrors(workspaceId?: string): void {
    if (this.simulateFailure === '401_unauthenticated' || this.currentUserId === 'none') {
      const err: ApiError = {
        status: 401,
        message: 'Unauthorized: User is not authenticated',
        code: 'AUTH_REQUIRED',
      };
      throw err;
    }

    if (this.simulateFailure === '500_server_error') {
      const err: ApiError = {
        status: 500,
        message: 'Internal Server Error: Database failure during save operation',
        code: 'INTERNAL_ERROR',
      };
      throw err;
    }

    if (this.simulateFailure === '403_forbidden') {
      const err: ApiError = {
        status: 403,
        message: 'Forbidden: Caller does not have permission in this workspace',
        code: 'FORBIDDEN',
      };
      throw err;
    }

    // Dynamic membership access check
    if (workspaceId) {
      const members = this.getRawMembers();
      const isMember = members.some(m => m.workspaceId === workspaceId && m.userId === this.currentUserId);
      if (!isMember) {
        const err: ApiError = {
          status: 403,
          message: 'Forbidden: You are not a member of this workspace',
          code: 'NO_WORKSPACE_ACCESS',
        };
        throw err;
      }
    }
  }

  private async networkLatency(ms = 120): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRawWorkspaces(): Workspace[] {
    try {
      if (typeof localStorage === 'undefined') return SEED_WORKSPACES;
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKSPACES) || '[]');
    } catch {
      return SEED_WORKSPACES;
    }
  }

  private setRawWorkspaces(workspaces: Workspace[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
      } catch {}
    }
  }

  private getRawTasks(): Task[] {
    try {
      if (typeof localStorage === 'undefined') return SEED_TASKS;
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
    } catch {
      return SEED_TASKS;
    }
  }

  private setRawTasks(tasks: Task[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      } catch {}
    }
  }

  private getRawMembers(): WorkspaceMember[] {
    try {
      if (typeof localStorage === 'undefined') return SEED_MEMBERS;
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || '[]');
    } catch {
      return SEED_MEMBERS;
    }
  }

  private setRawMembers(members: WorkspaceMember[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      } catch {}
    }
  }

  // --------------------------------------------------------------------------
  // Documented API Endpoints (as defined in API_CONTRACT.md)
  // --------------------------------------------------------------------------

  /**
   * POST /workspaces
   * Create a workspace for the authenticated user.
   * Input: { name: string }
   * Response 201: { id, name, ownerId }
   * Errors: 400 invalid input, 401 not signed in
   */
  public async createWorkspace(data: { name: string }): Promise<Workspace> {
    await this.networkLatency();
    this.checkSimulatedErrors();

    const name = data?.name?.trim();
    if (!name || name.length < 1 || name.length > 80) {
      const err: ApiError = {
        status: 400,
        message: 'Invalid input: Workspace name must be between 1 and 80 characters',
        fieldErrors: { name: 'Name must be between 1 and 80 characters' },
      };
      throw err;
    }

    const currentUserId = this.currentUserId;
    const newWorkspace: Workspace = {
      id: `ws_${Date.now().toString(36)}`,
      name,
      ownerId: currentUserId,
      createdAt: new Date().toISOString(),
      planTier: 'starter',
      taskLimit: PLAN_CONFIGS.starter.taskLimit,
      memberLimit: PLAN_CONFIGS.starter.memberLimit,
    };

    const workspaces = this.getRawWorkspaces();
    workspaces.unshift(newWorkspace);
    this.setRawWorkspaces(workspaces);

    // Creator automatically becomes workspace owner
    const members = this.getRawMembers();
    members.push({
      workspaceId: newWorkspace.id,
      userId: currentUserId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    this.setRawMembers(members);

    return newWorkspace;
  }

  /**
   * POST /workspaces/{workspaceId}/tasks
   * Create a task in a workspace the caller can access.
   * Input: { title: string, assigneeId?: string | null, status?: TaskStatus }
   * Response 201: { id, workspaceId, title, assigneeId, status }
   * Errors: 400 invalid input, 401 not signed in, 403 no workspace access, 404 workspace not found
   */
  public async createTask(workspaceId: string, data: {
    title: string;
    assigneeId?: string | null;
    status?: TaskStatus;
  }): Promise<Task> {
    await this.networkLatency();
    this.checkSimulatedErrors(workspaceId);

    const workspaces = this.getRawWorkspaces();
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) {
      const err: ApiError = {
        status: 404,
        message: 'Workspace not found',
      };
      throw err;
    }

    const title = data?.title?.trim();
    if (!title || title.length < 1 || title.length > 120) {
      const err: ApiError = {
        status: 400,
        message: 'Invalid input: Task title is required and must be between 1 and 120 characters',
        fieldErrors: { title: 'Title must be 1 to 120 characters long' },
      };
      throw err;
    }

    const allowedStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const status: TaskStatus = data.status || 'todo';
    if (!allowedStatuses.includes(status)) {
      const err: ApiError = {
        status: 400,
        message: `Invalid input: Status must be one of: ${allowedStatuses.join(', ')}`,
        fieldErrors: { status: 'Status is not valid' },
      };
      throw err;
    }

    // Check assignee membership if provided
    if (data.assigneeId) {
      const members = this.getRawMembers();
      const isAssigneeMember = members.some(m => m.workspaceId === workspaceId && m.userId === data.assigneeId);
      if (!isAssigneeMember) {
        const err: ApiError = {
          status: 400,
          message: 'Invalid input: Assignee must be an active workspace member',
          fieldErrors: { assigneeId: 'Selected user is not a member of this workspace' },
        };
        throw err;
      }
    }

    // Check plan quota limits
    const existingTasks = this.getRawTasks().filter(t => t.workspaceId === workspaceId);
    if (existingTasks.length >= ws.taskLimit) {
      const err: ApiError = {
        status: 400,
        message: `Plan limit reached: The ${ws.planTier.toUpperCase()} tier allows max ${ws.taskLimit} tasks. Upgrade to create more.`,
        code: 'QUOTA_EXCEEDED',
      };
      throw err;
    }

    const newTask: Task = {
      id: `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      workspaceId,
      title,
      assigneeId: data.assigneeId || null,
      status,
      createdBy: this.currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tasks = this.getRawTasks();
    tasks.unshift(newTask);
    this.setRawTasks(tasks);

    return newTask;
  }

  /**
   * PATCH /tasks/{taskId}
   * Update a task's title, assignee, or status.
   * Input: { status?: TaskStatus, title?: string, assigneeId?: string | null }
   * Response 200: { id, status, ... }
   * Errors: 400 invalid input, 401 not signed in, 403 no permission, 404 task not found
   */
  public async updateTask(taskId: string, data: {
    status?: TaskStatus;
    title?: string;
    assigneeId?: string | null;
  }): Promise<Task> {
    await this.networkLatency();
    const tasks = this.getRawTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      const err: ApiError = {
        status: 404,
        message: 'Task not found',
      };
      throw err;
    }

    const task = tasks[taskIndex];
    this.checkSimulatedErrors(task.workspaceId);

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title || title.length < 1 || title.length > 120) {
        const err: ApiError = {
          status: 400,
          message: 'Invalid input: Task title must be between 1 and 120 characters',
          fieldErrors: { title: 'Title must be 1 to 120 characters long' },
        };
        throw err;
      }
      task.title = title;
    }

    if (data.status !== undefined) {
      const allowedStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
      if (!allowedStatuses.includes(data.status)) {
        const err: ApiError = {
          status: 400,
          message: `Invalid input: Status must be one of: ${allowedStatuses.join(', ')}`,
          fieldErrors: { status: 'Status is not valid' },
        };
        throw err;
      }
      task.status = data.status;
    }

    if (data.assigneeId !== undefined) {
      if (data.assigneeId !== null) {
        const members = this.getRawMembers();
        const isMember = members.some(m => m.workspaceId === task.workspaceId && m.userId === data.assigneeId);
        if (!isMember) {
          const err: ApiError = {
            status: 400,
            message: 'Invalid input: Assignee must be a workspace member',
            fieldErrors: { assigneeId: 'User is not a member' },
          };
          throw err;
        }
      }
      task.assigneeId = data.assigneeId;
    }

    task.updatedAt = new Date().toISOString();
    tasks[taskIndex] = task;
    this.setRawTasks(tasks);

    return task;
  }

  // --------------------------------------------------------------------------
  // AgentOps Output Validation Endpoint (POST /runs/validate)
  // --------------------------------------------------------------------------

  /**
   * POST /api/v1/runs/validate
   * Validates a structured AgentOps sample run output.
   * Checks required fields (runId, agentId, status, inputs, outputs) and data types.
   * Returns a predictable result with valid, errors, summary, and details.
   * Handles simulated errors (500 server error, 401 unauthenticated).
   */
  public async validateOutput(sampleRun: any): Promise<OutputValidationResult> {
    await this.networkLatency(60);
    this.checkSimulatedErrors();

    const errors: ValidationError[] = [];
    let totalChecked = 0;

    // 1. Root payload structure check
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

    // 2. Validate runId (required, non-empty string)
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

    // 3. Validate agentId (required, non-empty string)
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

    // 4. Validate status (required, enum string)
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

    // 5. Validate inputs (required, object or non-empty string)
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

    // 6. Validate outputs (required, object or non-empty string)
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

    // 7. Optional field: latencyMs (must be number >= 0 if provided)
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
          message: `Invalid value for 'latencyMs': must be a non-negative number, received ${sampleRun.latencyMs}`,
          code: 'INVALID_VALUE',
          expected: 'number >= 0',
          received: String(sampleRun.latencyMs),
        });
      }
    }

    // 8. Optional field: timestamp (must be valid ISO date string if provided)
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

    // 9. Optional field: metrics (must be an object with valid sub-properties if provided)
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

  // --------------------------------------------------------------------------
  // Multi-Tenant Workspace Queries & Actions
  // --------------------------------------------------------------------------

  public async getWorkspaces(): Promise<Workspace[]> {
    await this.networkLatency();
    this.checkSimulatedErrors();

    const workspaces = this.getRawWorkspaces();
    const members = this.getRawMembers();

    // Only return workspaces the current user is a member of
    const userWorkspaceIds = new Set(
      members.filter(m => m.userId === this.currentUserId).map(m => m.workspaceId)
    );

    return workspaces.filter(w => userWorkspaceIds.has(w.id));
  }

  public async getWorkspace(id: string): Promise<Workspace | null> {
    await this.networkLatency();
    this.checkSimulatedErrors(id);
    const workspaces = this.getRawWorkspaces();
    return workspaces.find(w => w.id === id) || null;
  }

  public async getTasks(workspaceId: string): Promise<Task[]> {
    await this.networkLatency();
    this.checkSimulatedErrors(workspaceId);

    const tasks = this.getRawTasks().filter(t => t.workspaceId === workspaceId);
    // Enrich with assignee object
    return tasks.map(t => ({
      ...t,
      assignee: t.assigneeId ? SEED_USERS.find(u => u.id === t.assigneeId) || null : null,
    }));
  }

  public async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    await this.networkLatency();
    this.checkSimulatedErrors(workspaceId);

    const members = this.getRawMembers().filter(m => m.workspaceId === workspaceId);
    return members.map(m => ({
      ...m,
      user: SEED_USERS.find(u => u.id === m.userId),
    }));
  }

  public async inviteMember(workspaceId: string, email: string, role: 'owner' | 'member' = 'member'): Promise<WorkspaceMember> {
    await this.networkLatency();
    this.checkSimulatedErrors(workspaceId);

    // Only owners can invite members
    const members = this.getRawMembers();
    const currentMember = members.find(m => m.workspaceId === workspaceId && m.userId === this.currentUserId);
    if (!currentMember || currentMember.role !== 'owner') {
      const err: ApiError = {
        status: 403,
        message: 'Only workspace owners can invite or configure team members',
      };
      throw err;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      const err: ApiError = {
        status: 400,
        message: 'A valid email address is required',
        fieldErrors: { email: 'Please enter a valid email address' },
      };
      throw err;
    }

    // Check workspace member quota
    const ws = this.getRawWorkspaces().find(w => w.id === workspaceId);
    const existingMembers = members.filter(m => m.workspaceId === workspaceId);
    if (ws && existingMembers.length >= ws.memberLimit) {
      const err: ApiError = {
        status: 400,
        message: `Plan limit reached: The ${ws.planTier.toUpperCase()} tier allows max ${ws.memberLimit} members. Upgrade to invite more.`,
      };
      throw err;
    }

    // Check if user already exists or create new
    let user = SEED_USERS.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      user = {
        id: `user_${Date.now().toString(36)}`,
        displayName: trimmedEmail.split('@')[0],
        email: trimmedEmail,
      };
      SEED_USERS.push(user);
    }

    // Check if already in workspace
    const alreadyMember = existingMembers.some(m => m.userId === user!.id);
    if (alreadyMember) {
      const err: ApiError = {
        status: 400,
        message: 'User is already a member of this workspace',
      };
      throw err;
    }

    const newMember: WorkspaceMember = {
      workspaceId,
      userId: user.id,
      role,
      joinedAt: new Date().toISOString(),
      user,
    };

    members.push(newMember);
    this.setRawMembers(members);

    return newMember;
  }

  public async updateWorkspacePlan(workspaceId: string, planTier: PlanTier): Promise<Workspace> {
    await this.networkLatency();
    this.checkSimulatedErrors(workspaceId);

    const workspaces = this.getRawWorkspaces();
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) {
      throw { status: 404, message: 'Workspace not found' };
    }

    const planConfig = PLAN_CONFIGS[planTier];
    if (!planConfig) {
      throw { status: 400, message: 'Invalid plan tier' };
    }

    ws.planTier = planTier;
    ws.taskLimit = planConfig.taskLimit;
    ws.memberLimit = planConfig.memberLimit;

    this.setRawWorkspaces(workspaces);
    return ws;
  }

  public async deleteTask(taskId: string): Promise<{ success: boolean }> {
    await this.networkLatency();
    const tasks = this.getRawTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw { status: 404, message: 'Task not found' };
    }
    this.checkSimulatedErrors(task.workspaceId);

    const filtered = tasks.filter(t => t.id !== taskId);
    this.setRawTasks(filtered);
    return { success: true };
  }
}

export const apiService = new ApiService();
