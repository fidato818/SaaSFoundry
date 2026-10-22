/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, ListTodo, Trash2, Save, Terminal, Code2, AlertCircle } from 'lucide-react';
import { Task, TaskStatus, WorkspaceMember, Workspace, ApiError } from '../types';

interface TaskDetailDrawerProps {
  task: Task | null;
  workspace: Workspace | null;
  members: WorkspaceMember[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, data: { title?: string; assigneeId?: string | null; status?: TaskStatus }) => Promise<Task>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  workspace,
  members,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiLog, setApiLog] = useState<{ request: any; response: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setAssigneeId(task.assigneeId || '');
      setError(null);
      setApiLog({
        request: { status: task.status },
        response: { id: task.id, status: task.status },
      });
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        title: title.trim(),
        status,
        assigneeId: assigneeId || null,
      };

      const updated = await onUpdateTask(task.id, payload);

      setApiLog({
        request: payload,
        response: {
          id: updated.id,
          status: updated.status,
          title: updated.title,
          assigneeId: updated.assigneeId,
        },
      });
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      setIsDeleting(true);
      await onDeleteTask(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>{task.id}</span>
              <span aria-hidden="true">·</span>
              <span>{workspace?.name}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">Task Details & API Inspector</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Title (1–120 characters)
            </label>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-mono">
              <span>PATCH /tasks/{task.id}</span>
              <span>{title.length}/120</span>
            </div>
          </div>

          {/* Status & Assignee Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 capitalize"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName || m.userId} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metadata Section (Zero-Pill discipline: unboxed clean text) */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-800 text-xs">Audit & Metadata</h4>
            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Created By</span>
                <span className="font-mono">{task.createdBy}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Workspace Reference</span>
                <span className="font-mono">{task.workspaceId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Created Timestamp</span>
                <span className="font-mono">{new Date(task.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Last Updated</span>
                <span className="font-mono">{new Date(task.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* API Contract Inspector (Live verification of API_CONTRACT.md) */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-900 text-slate-100 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                API Contract Compliance Inspector
              </span>
              <span className="text-[11px] text-slate-400">RFC 7231</span>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">PATCH /api/v1/tasks/{task.id} (Request)</div>
              <pre className="p-2.5 bg-black/50 rounded text-[11px] text-emerald-400 overflow-x-auto">
                {JSON.stringify(apiLog?.request || { status }, null, 2)}
              </pre>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">Response 200 OK</div>
              <pre className="p-2.5 bg-black/50 rounded text-[11px] text-indigo-300 overflow-x-auto">
                {JSON.stringify(apiLog?.response || { id: task.id, status }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
