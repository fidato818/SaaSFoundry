/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Workspace, Task, WorkspaceMember, User as UserType, TaskStatus, PlanTier } from './types';
import { apiService, SimulationMode } from './services/apiService';
import { Header } from './components/Header';
import { TenantToolbar } from './components/TenantToolbar';
import { OverviewScreen } from './components/OverviewScreen';
import { TasksScreen } from './components/TasksScreen';
import { MembersScreen } from './components/MembersScreen';
import { BillingScreen } from './components/BillingScreen';
import { ApiTestPlanScreen } from './components/ApiTestPlanScreen';
import { TaskModal } from './components/TaskModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members' | 'billing' | 'tests'>('overview');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(apiService.getCurrentUser());
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(apiService.getSimulationMode());

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<TaskStatus>('todo');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all workspaces for the current user
  const loadWorkspaces = useCallback(async () => {
    try {
      const list = await apiService.getWorkspaces();
      setWorkspaces(list);
      if (list.length > 0) {
        // If current active workspace is still in list, keep it; otherwise select first
        setActiveWorkspace((prev) => {
          if (prev && list.some((w) => w.id === prev.id)) {
            return list.find((w) => w.id === prev.id) || list[0];
          }
          return list[0];
        });
      } else {
        setActiveWorkspace(null);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load workspaces');
    }
  }, [addToast]);

  // Load tasks and members for active workspace
  const loadWorkspaceData = useCallback(async (wsId: string) => {
    try {
      setIsLoading(true);
      const [fetchedTasks, fetchedMembers] = await Promise.all([
        apiService.getTasks(wsId),
        apiService.getMembers(wsId),
      ]);
      setTasks(fetchedTasks);
      setMembers(fetchedMembers);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load workspace data');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // When active workspace changes, reload tasks and members
  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceData(activeWorkspace.id);
    } else {
      setTasks([]);
      setMembers([]);
      setIsLoading(false);
    }
  }, [activeWorkspace, loadWorkspaceData]);

  // Refresh entire app state (used by test runner and reset)
  const refreshAppState = async () => {
    await loadWorkspaces();
    if (activeWorkspace) {
      await loadWorkspaceData(activeWorkspace.id);
    }
  };

  // User Persona Switcher
  const handleSelectUser = async (userId: string) => {
    apiService.setCurrentUser(userId);
    const updatedUser = apiService.getCurrentUser();
    setCurrentUser(updatedUser);
    addToast(
      'info',
      updatedUser
        ? `Persona shifted to ${updatedUser.displayName} (${updatedUser.id === 'user_alex' ? 'Owner' : 'Member'})`
        : 'Signed out (Guest). Requests will simulate 401.'
    );
    await loadWorkspaces();
  };

  // Simulation Mode Switcher
  const handleSelectSimulationMode = (mode: SimulationMode) => {
    apiService.setSimulationMode(mode);
    setSimulationMode(mode);
    if (mode === 'none') {
      addToast('info', 'Simulation mode set to Nominal');
    } else {
      addToast('error', `Simulation active: ${mode}`);
    }
  };

  // Create Workspace (POST /workspaces)
  const handleCreateWorkspace = async (name: string): Promise<Workspace> => {
    const ws = await apiService.createWorkspace({ name });
    addToast('success', `Workspace "${ws.name}" created (POST 201)`);
    await loadWorkspaces();
    setActiveWorkspace(ws);
    return ws;
  };

  // Create Task (POST /workspaces/{id}/tasks)
  const handleCreateTask = async (data: {
    title: string;
    assigneeId?: string | null;
    status: TaskStatus;
  }) => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const newTask = await apiService.createTask(activeWorkspace.id, data);
    addToast('success', `Task created successfully: ${newTask.title.substring(0, 32)}...`);
    await loadWorkspaceData(activeWorkspace.id);
  };

  // Quick Status update (PATCH /tasks/{id})
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updated = await apiService.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: updated.status, updatedAt: updated.updatedAt } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      addToast('success', `Status updated to ${newStatus.replace('_', ' ')} (PATCH 200)`);
    } catch (err: any) {
      addToast('error', err.message || 'Status update failed');
      throw err;
    }
  };

  // Full Task Update from Detail Drawer
  const handleUpdateTask = async (
    taskId: string,
    data: { title?: string; assigneeId?: string | null; status?: TaskStatus }
  ): Promise<Task> => {
    const updated = await apiService.updateTask(taskId, data);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: updated.title,
              status: updated.status,
              assigneeId: updated.assigneeId,
              updatedAt: updated.updatedAt,
              assignee: updated.assigneeId
                ? members.find((m) => m.userId === updated.assigneeId)?.user || null
                : null,
            }
          : t
      )
    );
    setSelectedTask(updated);
    addToast('success', 'Task changes persisted');
    return updated;
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    await apiService.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
    addToast('info', 'Task deleted');
  };

  // Invite Member
  const handleInviteMember = async (email: string, role: 'owner' | 'member') => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const member = await apiService.inviteMember(activeWorkspace.id, email, role);
    setMembers((prev) => [...prev, member]);
    addToast('success', `Invited ${email} as ${role}`);
  };

  // Upgrade Plan (simulate billing shift)
  const handleUpgradePlan = async (tier: PlanTier) => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const updated = await apiService.updateWorkspacePlan(activeWorkspace.id, tier);
    setActiveWorkspace(updated);
    setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    addToast('success', `Workspace updated to ${tier.toUpperCase()} tier`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Contract (3 Zones) */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'tasks') setStatusFilter(undefined);
        }}
        currentUser={currentUser}
        onOpenNewTask={() => {
          setTaskModalDefaultStatus('todo');
          setIsTaskModalOpen(true);
        }}
        onOpenNewWorkspace={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Sub-header / Tenant Switcher toolbar */}
      <TenantToolbar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(ws) => setActiveWorkspace(ws)}
        onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        simulationMode={simulationMode}
        onSelectSimulationMode={handleSelectSimulationMode}
        taskCount={tasks.length}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        {activeTab === 'overview' && (
          <OverviewScreen
            workspace={activeWorkspace}
            tasks={tasks}
            members={members}
            currentUser={currentUser}
            onNavigateToTasks={(filter) => {
              setStatusFilter(filter);
              setActiveTab('tasks');
            }}
            onNavigateToMembers={() => setActiveTab('members')}
            onNavigateToBilling={() => setActiveTab('billing')}
            onNavigateToTests={() => setActiveTab('tests')}
            onOpenCreateTask={() => {
              setTaskModalDefaultStatus('todo');
              setIsTaskModalOpen(true);
            }}
            onSelectTask={(task) => setSelectedTask(task)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksScreen
            workspace={activeWorkspace}
            tasks={tasks}
            members={members}
            currentUser={currentUser}
            isLoading={isLoading}
            statusFilter={statusFilter}
            onClearStatusFilter={() => setStatusFilter(undefined)}
            onOpenCreateTask={(defaultStatus) => {
              setTaskModalDefaultStatus(defaultStatus || 'todo');
              setIsTaskModalOpen(true);
            }}
            onSelectTask={(task) => setSelectedTask(task)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'members' && (
          <MembersScreen
            workspace={activeWorkspace}
            members={members}
            currentUser={currentUser}
            onInviteMember={handleInviteMember}
          />
        )}

        {activeTab === 'billing' && (
          <BillingScreen
            workspace={activeWorkspace}
            currentUser={currentUser}
            onUpgradePlan={handleUpgradePlan}
            currentTaskCount={tasks.length}
            currentMemberCount={members.length}
          />
        )}

        {activeTab === 'tests' && (
          <ApiTestPlanScreen
            onRefreshAppState={refreshAppState}
            activeWorkspace={activeWorkspace}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">SaaSFoundry</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Tenant Architecture</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">API Contract v1</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Isolated Workspaces</span>
            <span>RBAC Verification</span>
            <span>Quota Enforcement</span>
          </div>
        </div>
      </footer>

      {/* Modals & Slide-overs */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        workspace={activeWorkspace}
        members={members}
        defaultStatus={taskModalDefaultStatus}
        currentTaskCount={tasks.length}
        onSubmit={handleCreateTask}
      />

      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSubmit={handleCreateWorkspace}
      />

      <TaskDetailDrawer
        task={selectedTask}
        workspace={activeWorkspace}
        members={members}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
