/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, TaskStatus, Workspace, WorkspaceMember, User as UserType } from '../types';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  ChevronRight,
  ArrowRight,
  RotateCcw,
  User as UserIcon,
  Filter
} from 'lucide-react';

interface TasksScreenProps {
  workspace: Workspace | null;
  tasks: Task[];
  members: WorkspaceMember[];
  currentUser: UserType | null;
  isLoading: boolean;
  onOpenCreateTask: (defaultStatus?: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  statusFilter?: string;
  onClearStatusFilter?: () => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  workspace,
  tasks,
  members,
  isLoading,
  onOpenCreateTask,
  onSelectTask,
  onUpdateStatus,
  statusFilter,
  onClearStatusFilter,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Filter tasks based on search, assignee, and active statusFilter
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedAssignee !== 'all') {
      if (selectedAssignee === 'unassigned') {
        if (task.assigneeId !== null) return false;
      } else {
        if (task.assigneeId !== selectedAssignee) return false;
      }
    }
    if (statusFilter && task.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.stopPropagation();
    try {
      setUpdatingTaskId(taskId);
      await onUpdateStatus(taskId, newStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const columns: { id: TaskStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'todo',
      label: 'To Do',
      icon: <ListTodo className="w-4 h-4 text-slate-400" />,
      desc: 'Pending work',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      desc: 'Actively in development',
    },
    {
      id: 'done',
      label: 'Done',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      desc: 'Completed and verified',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Controls: Search, View Mode, Filters, and Add Task */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Primary Workflow</span>
            <span aria-hidden="true">·</span>
            <span>Task State Transition (`todo` → `in_progress` → `done`)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tasks in {workspace?.name || 'Workspace'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Board/List View Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <button
            onClick={() => onOpenCreateTask()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 border border-slate-200 rounded-lg shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks by title or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
          </div>

          {/* Filter by Assignee */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">Assignee:</span>
            <select
              aria-label="Filter tasks by assignee"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Members</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.displayName || m.userId}
                </option>
              ))}
            </select>
          </div>

          {/* Active status filter clear tag */}
          {statusFilter && (
            <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-md border border-indigo-200">
              <span>Filtered: {statusFilter.replace('_', ' ')}</span>
              {onClearStatusFilter && (
                <button
                  onClick={onClearStatusFilter}
                  className="font-bold hover:text-indigo-950 ml-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Loading State Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((col) => (
            <div key={col} className="bg-slate-100 rounded-lg p-4 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-white rounded border border-slate-200" />
              <div className="h-20 bg-white rounded border border-slate-200" />
            </div>
          ))}
        </div>
      ) : viewMode === 'board' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((column) => {
            const colTasks = filteredTasks.filter((t) => t.status === column.id);

            return (
              <div
                key={column.id}
                className="bg-slate-100/60 border border-slate-200 rounded-lg p-4 flex flex-col min-h-[480px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    {column.icon}
                    <span className="font-semibold text-slate-900 text-sm">{column.label}</span>
                    <span className="font-mono tabular-nums text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenCreateTask(column.id)}
                    title={`Add task to ${column.label}`}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-40 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-xs text-slate-400">No {column.label.toLowerCase()} tasks</p>
                      <button
                        onClick={() => onOpenCreateTask(column.id)}
                        className="mt-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        + Create a task
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 cursor-pointer transition-all shadow-2xs hover:shadow-xs group space-y-3"
                      >
                        {/* Title */}
                        <div className="font-medium text-slate-900 text-sm leading-snug break-words">
                          {task.title}
                        </div>

                        {/* Unboxed Metadata (Zero-Pill Discipline) */}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono">{task.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">
                            {task.assignee ? task.assignee.displayName : 'Unassigned'}
                          </span>
                        </div>

                        {/* Interactive Status Transition Buttons (Calls PATCH /tasks/{id}) */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">Quick Move:</span>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {column.id === 'todo' && (
                              <button
                                disabled={updatingTaskId === task.id}
                                onClick={(e) => handleStatusChange(e, task.id, 'in_progress')}
                                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              >
                                → In Progress
                              </button>
                            )}

                            {column.id === 'in_progress' && (
                              <>
                                <button
                                  disabled={updatingTaskId === task.id}
                                  onClick={(e) => handleStatusChange(e, task.id, 'todo')}
                                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                                >
                                  ← To Do
                                </button>
                                <button
                                  disabled={updatingTaskId === task.id}
                                  onClick={(e) => handleStatusChange(e, task.id, 'done')}
                                  className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                >
                                  → Done
                                </button>
                              </>
                            )}

                            {column.id === 'done' && (
                              <button
                                disabled={updatingTaskId === task.id}
                                onClick={(e) => handleStatusChange(e, task.id, 'todo')}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Data List View */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Quick Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No tasks matched your filter criteria
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">{task.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-md truncate">
                        {task.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {task.assignee ? task.assignee.displayName : '—'}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700">
                        {task.status.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(task.updatedAt).toLocaleDateString()}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          aria-label={`Change status for task ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            onUpdateStatus(task.id, e.target.value as TaskStatus)
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
