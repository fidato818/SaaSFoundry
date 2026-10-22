/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Workspace, Task, WorkspaceMember, User as UserType } from '../types';
import { PLAN_CONFIGS } from '../data/seedData';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Terminal,
  Database,
  AlertCircle
} from 'lucide-react';

interface OverviewScreenProps {
  workspace: Workspace | null;
  tasks: Task[];
  members: WorkspaceMember[];
  currentUser: UserType | null;
  onNavigateToTasks: (statusFilter?: string) => void;
  onNavigateToMembers: () => void;
  onNavigateToBilling: () => void;
  onNavigateToTests: () => void;
  onOpenCreateTask: () => void;
  onSelectTask: (task: Task) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  workspace,
  tasks,
  members,
  currentUser,
  onNavigateToTasks,
  onNavigateToMembers,
  onNavigateToBilling,
  onNavigateToTests,
  onOpenCreateTask,
  onSelectTask,
}) => {
  if (!workspace) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900">No Workspace Selected</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Create or select a workspace to monitor tenant usage and manage workspace tasks.
        </p>
      </div>
    );
  }

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const taskUsagePercent = Math.min(100, Math.round((tasks.length / workspace.taskLimit) * 100));
  const memberUsagePercent = Math.min(100, Math.round((members.length / workspace.memberLimit) * 100));

  const plan = PLAN_CONFIGS[workspace.planTier] || PLAN_CONFIGS.starter;
  const isOwner = currentUser?.id === workspace.ownerId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Header / Tenant Identity */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Tenant Namespace</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{workspace.id}</span>
            <span aria-hidden="true">·</span>
            <span>Created {new Date(workspace.createdAt).toLocaleDateString()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {workspace.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Multi-tenant workspace with isolated tasks, role enforcement, and automated quota monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
          <button
            onClick={onNavigateToTests}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Verify API & Tests (T1-T7)</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (Anti-slop: clean, unboxed figures with tabular alignment) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task Quota Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700">Workspace Task Quota</span>
            <span className="capitalize">{workspace.planTier} tier</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {tasks.length}
            </span>
            <span className="text-sm text-slate-500 font-mono tabular-nums">
              / {workspace.taskLimit} max active
            </span>
          </div>
          {/* Usage meter bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full transition-all ${
                taskUsagePercent >= 90
                  ? 'bg-red-500'
                  : taskUsagePercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-slate-900'
              }`}
              style={{ width: `${taskUsagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{taskUsagePercent}% utilized</span>
            <button
              onClick={onNavigateToBilling}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Adjust Quota
            </button>
          </div>
        </div>

        {/* Member Quota Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700">Organization Members</span>
            <span>{isOwner ? 'You are Owner' : 'You are Member'}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {members.length}
            </span>
            <span className="text-sm text-slate-500 font-mono tabular-nums">
              / {workspace.memberLimit} seats
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{ width: `${memberUsagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{members.length} active seat{members.length !== 1 ? 's' : ''}</span>
            <button
              onClick={onNavigateToMembers}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Manage Team
            </button>
          </div>
        </div>

        {/* Access & Security Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700">Multi-Tenant Security</span>
            <span className="font-mono">REST v1</span>
          </div>
          <div className="space-y-2 mt-1">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Workspace-level data isolation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Strict membership token verification</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contract verified with API_CONTRACT.md</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">POST /workspaces/:id/tasks</span>
            <button
              onClick={onNavigateToTests}
              className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <span>Audit Contract</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Status Overview Bars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Task Status Distribution</h2>
          <button
            onClick={() => onNavigateToTasks()}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Open Tasks Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* To Do */}
          <button
            onClick={() => onNavigateToTasks('todo')}
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-4 text-left transition-colors shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                To Do
              </span>
              <span className="text-xs text-slate-400 group-hover:text-slate-700">Filter →</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {todoTasks.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending assignment or kickoff</p>
          </button>

          {/* In Progress */}
          <button
            onClick={() => onNavigateToTasks('in_progress')}
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-4 text-left transition-colors shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                In Progress
              </span>
              <span className="text-xs text-slate-400 group-hover:text-slate-700">Filter →</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {inProgressTasks.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Currently being worked on</p>
          </button>

          {/* Done */}
          <button
            onClick={() => onNavigateToTasks('done')}
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-4 text-left transition-colors shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Done
              </span>
              <span className="text-xs text-slate-400 group-hover:text-slate-700">Filter →</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {doneTasks.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Completed and closed out</p>
          </button>
        </div>
      </div>

      {/* Recent Workspace Tasks List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Active Tasks in {workspace.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any row to open the detailed inspector view</p>
          </div>
          <button
            onClick={() => onNavigateToTasks()}
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            View all ({tasks.length})
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-slate-900">No tasks created yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Get started by creating the first task in this workspace.
            </p>
            <button
              onClick={onOpenCreateTask}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Add First Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="px-5 py-3 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-4 transition-colors text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 truncate">{task.title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{task.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {task.assignee ? task.assignee.displayName : 'Unassigned'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium text-slate-600 capitalize">
                    {task.status.replace('_', ' ')}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
