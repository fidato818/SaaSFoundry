/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TaskStatus, WorkspaceMember, Workspace, ApiError } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  members: WorkspaceMember[];
  defaultStatus?: TaskStatus;
  currentTaskCount: number;
  onSubmit: (data: { title: string; assigneeId?: string | null; status: TaskStatus }) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  workspace,
  members,
  defaultStatus = 'todo',
  currentTaskCount,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAtQuota = workspace ? currentTaskCount >= workspace.taskLimit : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Task title is required (1-120 characters)');
      return;
    }

    if (trimmedTitle.length > 120) {
      setValidationError('Task title cannot exceed 120 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: trimmedTitle,
        assigneeId: assigneeId || null,
        status,
      });
      // Reset form
      setTitle('');
      setAssigneeId('');
      setStatus('todo');
      onClose();
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMessage(apiErr.message || 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Create New Task</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              POST /workspaces/{workspace?.id}/tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quota Warning if near or at limit */}
          {isAtQuota && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Task Quota Reached</span>
                This workspace has reached its limit of {workspace?.taskLimit} tasks on the {workspace?.planTier} tier.
                Creation will be rejected with an API error.
              </div>
            </div>
          )}

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title Field */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-medium text-slate-700">
                Task Title <span className="text-red-500">*</span>
              </label>
              <span className={`font-mono text-[11px] ${title.length > 120 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                {title.length}/120
              </span>
            </div>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Configure workspace isolation & Firestore security rules"
              className={`w-full p-2.5 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors ${
                validationError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
              }`}
            />
            {validationError && (
              <p className="text-xs text-red-600 mt-1">{validationError}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Required by API Contract (1–120 characters).
            </p>
          </div>

          {/* Assignee & Status fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              <p className="text-[11px] text-slate-400 mt-1">Must be workspace member</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">todo · in_progress · done</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
