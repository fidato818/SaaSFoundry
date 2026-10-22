/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Plus, UserCheck, Shield, User } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  activeTab: 'overview' | 'tasks' | 'members' | 'billing' | 'tests';
  onSelectTab: (tab: 'overview' | 'tasks' | 'members' | 'billing' | 'tests') => void;
  currentUser: UserType | null;
  onOpenNewTask: () => void;
  onOpenNewWorkspace: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenNewTask,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                SaaSFoundry
              </span>
            </button>
          </div>

          {/* Zone 2: 4-5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('overview')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onSelectTab('tasks')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === 'tasks'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Tasks Board
            </button>
            <button
              onClick={() => onSelectTab('members')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === 'members'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Team & Roles
            </button>
            <button
              onClick={() => onSelectTab('billing')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === 'billing'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Plans & Quotas
            </button>
            <button
              onClick={() => onSelectTab('tests')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === 'tests'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent'
              }`}
            >
              API & Test Suite
            </button>
          </nav>

          {/* Zone 3: 1 primary action and active persona indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-medium">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-slate-900 block leading-tight">{currentUser.displayName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {currentUser.id === 'user_alex' ? 'Owner' : 'Member'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Guest (401)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 gap-4 text-xs font-medium text-slate-600 no-scrollbar">
          <button
            onClick={() => onSelectTab('overview')}
            className={`whitespace-nowrap ${activeTab === 'overview' ? 'text-slate-900 font-bold' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab('tasks')}
            className={`whitespace-nowrap ${activeTab === 'tasks' ? 'text-slate-900 font-bold' : ''}`}
          >
            Tasks
          </button>
          <button
            onClick={() => onSelectTab('members')}
            className={`whitespace-nowrap ${activeTab === 'members' ? 'text-slate-900 font-bold' : ''}`}
          >
            Team
          </button>
          <button
            onClick={() => onSelectTab('billing')}
            className={`whitespace-nowrap ${activeTab === 'billing' ? 'text-slate-900 font-bold' : ''}`}
          >
            Plans
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className={`whitespace-nowrap ${activeTab === 'tests' ? 'text-indigo-600 font-bold' : ''}`}
          >
            Test Suite
          </button>
        </div>
      </div>
    </header>
  );
};
