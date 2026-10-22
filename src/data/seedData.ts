/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Workspace, WorkspaceMember, Task, PlanConfig } from '../types';

export const SEED_USERS: User[] = [
  {
    id: 'user_alex',
    displayName: 'Alex Vance',
    email: 'alex@saasfoundry.io',
  },
  {
    id: 'user_sarah',
    displayName: 'Sarah Chen',
    email: 'sarah.chen@saasfoundry.io',
  },
  {
    id: 'user_marcus',
    displayName: 'Marcus Brody',
    email: 'marcus.brody@saasfoundry.io',
  },
  {
    id: 'user_elena',
    displayName: 'Elena Rostova',
    email: 'elena.rostova@saasfoundry.io',
  },
];

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    targetAudience: 'For early-stage validation and prototyping',
    taskLimit: 15,
    memberLimit: 3,
    features: [
      'Up to 15 active tasks per workspace',
      'Up to 3 team members',
      'Role-based permissions (Owner & Member)',
      'REST API v1 endpoints',
      'Basic tenant isolation',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 49,
    targetAudience: 'For scaling operations with multi-team workflows',
    taskLimit: 100,
    memberLimit: 15,
    features: [
      'Up to 100 active tasks per workspace',
      'Up to 15 team members',
      'Custom roles and permission matrices',
      'Priority webhook delivery',
      'Dedicated tenant namespace encryption',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Enterprise Scale',
    priceMonthly: 199,
    targetAudience: 'For high-throughput organizations needing strict SLA',
    taskLimit: 9999,
    memberLimit: 9999,
    features: [
      'Unlimited tasks & unlimited workspaces',
      'Unlimited organization members',
      'Custom audit log streaming',
      'Single Sign-On (SAML/Okta)',
      '99.99% uptime SLA guarantee',
    ],
  },
};

export const SEED_WORKSPACES: Workspace[] = [
  {
    id: 'ws_launch',
    name: 'Launch Team',
    ownerId: 'user_alex',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    planTier: 'starter',
    taskLimit: 15,
    memberLimit: 3,
  },
  {
    id: 'ws_billing',
    name: 'Billing & Subscriptions',
    ownerId: 'user_alex',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    planTier: 'growth',
    taskLimit: 100,
    memberLimit: 15,
  },
];

export const SEED_MEMBERS: WorkspaceMember[] = [
  {
    workspaceId: 'ws_launch',
    userId: 'user_alex',
    role: 'owner',
    joinedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    workspaceId: 'ws_launch',
    userId: 'user_sarah',
    role: 'member',
    joinedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    workspaceId: 'ws_launch',
    userId: 'user_marcus',
    role: 'member',
    joinedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    workspaceId: 'ws_billing',
    userId: 'user_alex',
    role: 'owner',
    joinedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    workspaceId: 'ws_billing',
    userId: 'user_sarah',
    role: 'member',
    joinedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const SEED_TASKS: Task[] = [
  {
    id: 'task_001',
    workspaceId: 'ws_launch',
    title: 'Build multi-tenant landing page and auth flow',
    assigneeId: 'user_sarah',
    status: 'done',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'task_002',
    workspaceId: 'ws_launch',
    title: 'Configure workspace isolation & Firestore security rules',
    assigneeId: 'user_alex',
    status: 'in_progress',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'task_003',
    workspaceId: 'ws_launch',
    title: 'Implement role-based authorization middleware (Owner vs Member)',
    assigneeId: 'user_marcus',
    status: 'in_progress',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'task_004',
    workspaceId: 'ws_launch',
    title: 'Implement usage metering and quota enforcement check',
    assigneeId: 'user_alex',
    status: 'todo',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'task_005',
    workspaceId: 'ws_launch',
    title: 'Run end-to-end test scenarios T1 through T7 before launch',
    assigneeId: null,
    status: 'todo',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'task_006',
    workspaceId: 'ws_billing',
    title: 'Implement Stripe webhook signature verification',
    assigneeId: 'user_sarah',
    status: 'in_progress',
    createdBy: 'user_alex',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];
