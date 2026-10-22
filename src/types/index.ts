/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'owner' | 'member' | 'admin';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type PlanTier = 'starter' | 'growth' | 'scale';

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  planTier: PlanTier;
  taskLimit: number;
  memberLimit: number;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user?: User;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  assigneeId: string | null;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
}

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  targetAudience: string;
  taskLimit: number;
  memberLimit: number;
  features: string[];
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface TestResult {
  id: string;
  scenario: string;
  expectedResult: string;
  actualStatus: number | string;
  passed: boolean;
  details: string;
  timestamp: string;
}
