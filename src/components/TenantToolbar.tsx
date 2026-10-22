/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, ChevronDown, Plus, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import { Workspace, User as UserType } from '../types';
import { SimulationMode } from '../services/apiService';

interface TenantToolbarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenCreateWorkspace: () => void;
  currentUser: UserType | null;
  onSelectUser: (userId: string) => void;
  simulationMode: SimulationMode;
  onSelectSimulationMode: (mode: SimulationMode) => void;
  taskCount: number;
}

export const TenantToolbar: React.FC<TenantToolbarProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  currentUser,
  onSelectUser,
  simulationMode,
  onSelectSimulationMode,
  taskCount,
}) => {
  const isOwner = currentUser?.id === activeWorkspace?.ownerId;

  return (
    <div className="bg-slate-100/80 border-b border-slate-200/80 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Multi-Tenant Workspace Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tenant / Workspace:</span>
          </div>

          <div className="relative">
            <select
              aria-label="Select active workspace"
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const found = workspaces.find(w => w.id === e.target.value);
                if (found) onSelectWorkspace(found);
              }}
              className="appearance-none bg-white font-medium text-slate-800 border border-slate-200 rounded-md pl-2.5 pr-7 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.id})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={onOpenCreateWorkspace}
            title="Create Workspace (POST /workspaces)"
            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium transition-colors shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">New Workspace</span>
          </button>

          {/* Clean unboxed plan & quota metadata (Zero-Pill discipline) */}
          {activeWorkspace && (
            <div className="hidden lg:flex items-center gap-2 text-slate-500 pl-2">
              <span className="capitalize font-medium text-slate-700">{activeWorkspace.planTier} Plan</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-600">
                {taskCount}/{activeWorkspace.taskLimit} tasks
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-mono">
                {isOwner ? 'Role: Owner' : 'Role: Member'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Interactive Role & Error Testing controls */}
        <div className="flex items-center gap-3">
          {/* Persona Switcher to test RBAC live */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 hidden md:inline">Persona:</span>
            <select
              aria-label="Switch active persona"
              value={currentUser?.id || 'none'}
              onChange={(e) => onSelectUser(e.target.value)}
              className="bg-white text-slate-800 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
            >
              <option value="user_alex">Adnan (Owner)</option>
              <option value="user_sarah">Sarah (Member)</option>
              <option value="user_marcus">Marcus (Member)</option>
              <option value="none">Signed Out (Test 401)</option>
            </select>
          </div>

          {/* Error Injection Switcher to verify T7 & T4 error handling */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 hidden xl:inline">Simulate State:</span>
            <select
              aria-label="Simulate network and error states"
              value={simulationMode}
              onChange={(e) => onSelectSimulationMode(e.target.value as SimulationMode)}
              className={`bg-white border rounded-md px-2 py-1 text-xs font-medium focus:outline-none shadow-2xs ${
                simulationMode !== 'none'
                  ? 'border-amber-400 text-amber-800 bg-amber-50/50'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="none">Normal (Nominal)</option>
              <option value="500_server_error">Simulate 500 DB Failure (T7)</option>
              <option value="401_unauthenticated">Simulate 401 Auth Error (T4)</option>
              <option value="403_forbidden">Simulate 403 Forbidden (T5)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
