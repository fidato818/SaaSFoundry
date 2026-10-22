/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { Workspace, ApiError } from '../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<Workspace>;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 80) {
      setError('Workspace name is required and must be between 1 and 80 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(trimmed);
      setName('');
      onClose();
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Create New Workspace</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">POST /workspaces</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <label className="font-semibold text-slate-700">
                Workspace / Organization Name <span className="text-red-500">*</span>
              </label>
              <span className="font-mono text-[11px] text-slate-400">
                {name.length}/80
              </span>
            </div>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Analytics Engine, Beta Launch"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Defines the multi-tenant namespace (1–80 chars). You become the Workspace Owner.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
