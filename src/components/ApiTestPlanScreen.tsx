/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { TestResult, Workspace, Task } from '../types';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Terminal, 
  AlertTriangle,
  Code2,
  FileCheck2
} from 'lucide-react';

interface ApiTestPlanScreenProps {
  onRefreshAppState: () => Promise<void>;
  activeWorkspace: Workspace | null;
}

export const ApiTestPlanScreen: React.FC<ApiTestPlanScreenProps> = ({
  onRefreshAppState,
  activeWorkspace,
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'contract'>('tests');

  const runAllTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Save initial state to restore later
    const initialUser = apiService.getCurrentUser()?.id || 'user_alex';

    try {
      // -------------------------------------------------------------
      // T1: Owner creates a workspace
      // -------------------------------------------------------------
      apiService.setCurrentUser('user_alex');
      apiService.setSimulationMode('none');
      try {
        const testWsName = `Test Team ${Math.floor(Math.random() * 900 + 100)}`;
        const createdWs = await apiService.createWorkspace({ name: testWsName });
        const allWorkspaces = await apiService.getWorkspaces();
        const found = allWorkspaces.some((w) => w.id === createdWs.id);

        results.push({
          id: 'T1',
          scenario: 'Owner creates a workspace (POST /workspaces)',
          expectedResult: 'Workspace is saved and appears in the list with ownerId set',
          actualStatus: 201,
          passed: found && createdWs.ownerId === 'user_alex',
          details: `Created workspace ID: ${createdWs.id}, Name: "${createdWs.name}", Owner: ${createdWs.ownerId}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T1',
          scenario: 'Owner creates a workspace',
          expectedResult: 'Workspace is saved and appears in the list',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message || 'Creation failed',
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T2: Owner creates a task with a valid title
      // -------------------------------------------------------------
      const targetWsId = activeWorkspace?.id || 'ws_launch';
      let createdTaskId = '';
      try {
        const taskTitle = 'Automated Verification Task for T2';
        const createdTask = await apiService.createTask(targetWsId, {
          title: taskTitle,
          status: 'todo',
        });
        createdTaskId = createdTask.id;

        results.push({
          id: 'T2',
          scenario: 'Owner creates a task with a valid title (POST /workspaces/{id}/tasks)',
          expectedResult: 'Task persists with todo status and 201 response',
          actualStatus: 201,
          passed: createdTask.status === 'todo' && createdTask.title === taskTitle,
          details: `Task ID: ${createdTask.id}, Status: "${createdTask.status}", Title: "${createdTask.title}"`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T2',
          scenario: 'Owner creates a task with a valid title',
          expectedResult: 'Task persists with todo status',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T3: Member changes task status
      // -------------------------------------------------------------
      apiService.setCurrentUser('user_sarah'); // Sarah Chen is a member
      try {
        const taskIdToUpdate = createdTaskId || 'task_004';
        const updatedTask = await apiService.updateTask(taskIdToUpdate, {
          status: 'in_progress',
        });

        // Verify status persisted
        const wsTasks = await apiService.getTasks(targetWsId);
        const taskInStore = wsTasks.find((t) => t.id === taskIdToUpdate);

        results.push({
          id: 'T3',
          scenario: 'Member changes task status (PATCH /tasks/{taskId})',
          expectedResult: 'New status remains in_progress after save and retrieval',
          actualStatus: 200,
          passed: taskInStore?.status === 'in_progress',
          details: `Member user_sarah updated ${taskIdToUpdate} status to: ${taskInStore?.status}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T3',
          scenario: 'Member changes task status',
          expectedResult: 'New status remains after update',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T4: Signed-out user calls a protected endpoint
      // -------------------------------------------------------------
      apiService.setCurrentUser('none'); // Guest / Unauthenticated
      try {
        await apiService.createWorkspace({ name: 'Unauthorized Workspace' });
        results.push({
          id: 'T4',
          scenario: 'Signed-out user calls a protected endpoint (POST /workspaces)',
          expectedResult: 'Request is rejected with 401 Unauthorized',
          actualStatus: 200,
          passed: false,
          details: 'FAIL: Unauthenticated request was unexpectedly allowed',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T4',
          scenario: 'Signed-out user calls a protected endpoint',
          expectedResult: 'Request is rejected with 401 Unauthorized',
          actualStatus: err.status || 401,
          passed: err.status === 401,
          details: `Correctly rejected: ${err.message} (${err.code})`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T5: Non-member reads or updates a task
      // -------------------------------------------------------------
      // Use Elena (user_elena), who is not added to ws_billing
      apiService.setCurrentUser('user_elena');
      try {
        await apiService.createTask('ws_billing', { title: 'Elena intruder task' });
        results.push({
          id: 'T5',
          scenario: 'Non-member reads or updates a task in foreign workspace',
          expectedResult: 'Access is denied with 403 Forbidden',
          actualStatus: 200,
          passed: false,
          details: 'FAIL: Non-member was improperly granted workspace access',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T5',
          scenario: 'Non-member reads or updates a task',
          expectedResult: 'Access is denied with 403 Forbidden',
          actualStatus: err.status || 403,
          passed: err.status === 403,
          details: `Correctly blocked: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T6: Empty title or invalid status is submitted
      // -------------------------------------------------------------
      apiService.setCurrentUser('user_alex');
      try {
        await apiService.createTask(targetWsId, { title: '   ', status: 'todo' });
        results.push({
          id: 'T6',
          scenario: 'Empty title or invalid status is submitted (POST validation)',
          expectedResult: 'Validation error is returned with 400 Bad Request',
          actualStatus: 200,
          passed: false,
          details: 'FAIL: Empty task title passed validation',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T6',
          scenario: 'Empty title or invalid status is submitted',
          expectedResult: 'Validation error is returned with 400 Bad Request',
          actualStatus: err.status || 400,
          passed: err.status === 400,
          details: `Validation passed correctly: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T7: API/database fails during save
      // -------------------------------------------------------------
      apiService.setCurrentUser('user_alex');
      apiService.setSimulationMode('500_server_error'); // Trigger simulated 500 error
      try {
        await apiService.createWorkspace({ name: 'Failing DB Workspace' });
        results.push({
          id: 'T7',
          scenario: 'API/database fails during save (Server 500 error)',
          expectedResult: 'UI handles error gracefully and does not claim success',
          actualStatus: 200,
          passed: false,
          details: 'FAIL: Server failure was not triggered',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T7',
          scenario: 'API/database fails during save (Server 500 error)',
          expectedResult: 'UI handles error gracefully and does not claim success',
          actualStatus: err.status || 500,
          passed: err.status === 500,
          details: `Server error captured: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        apiService.setSimulationMode('none');
      }

      setTestResults(results);
      // Restore initial user
      apiService.setCurrentUser(initialUser);
      await onRefreshAppState();
    } finally {
      setIsRunning(false);
    }
  };

  const allPassed = testResults.length > 0 && testResults.every((t) => t.passed);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Automated Verification Suite</span>
            <span aria-hidden="true">·</span>
            <span>TEST_PLAN.md & API_CONTRACT.md</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Critical Test Plan Execution & Contract Audit
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Live execution harness for the 7 critical test scenarios specified in the documented MVP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              apiService.resetToSeedData();
              onRefreshAppState();
              setTestResults([]);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Database</span>
          </button>

          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Running Tests...' : 'Run All Tests (T1–T7)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Critical Tests (T1–T7)
        </button>
        <button
          onClick={() => setActiveTab('contract')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeTab === 'contract'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          API Contract Specifications
        </button>
      </div>

      {activeTab === 'tests' ? (
        <div className="space-y-6">
          {/* Summary Banner if executed */}
          {testResults.length > 0 && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                allPassed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {allPassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <span className="font-bold text-sm block">
                    {allPassed
                      ? 'All Critical Test Scenarios Passed (7/7)'
                      : 'Some Test Scenarios Did Not Pass'}
                  </span>
                  <span className="text-xs opacity-90">
                    Verified against API_CONTRACT.md endpoints and multi-tenant security rules.
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums font-semibold">
                {testResults.filter((r) => r.passed).length}/{testResults.length} passed
              </span>
            </div>
          )}

          {/* Test Cases Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-3 px-4 w-14">ID</th>
                    <th className="py-3 px-4">Scenario</th>
                    <th className="py-3 px-4">Expected Result</th>
                    <th className="py-3 px-4 w-28">Status</th>
                    <th className="py-3 px-4">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testResults.length === 0 ? (
                    [
                      { id: 'T1', scenario: 'Owner creates a workspace', expected: 'Workspace is saved and appears in list' },
                      { id: 'T2', scenario: 'Owner creates a task with a valid title', expected: 'Task persists with todo status' },
                      { id: 'T3', scenario: 'Member changes task status', expected: 'New status remains after refresh' },
                      { id: 'T4', scenario: 'Signed-out user calls a protected endpoint', expected: 'Request is rejected with 401' },
                      { id: 'T5', scenario: 'Non-member reads or updates a task', expected: 'Access is denied with 403' },
                      { id: 'T6', scenario: 'Empty title or invalid status is submitted', expected: 'Validation error 400 is returned' },
                      { id: 'T7', scenario: 'API/database fails during save', expected: 'UI shows error and does not claim success' },
                    ].map((row) => (
                      <tr key={row.id} className="text-slate-500">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{row.id}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{row.scenario}</td>
                        <td className="py-3.5 px-4">{row.expected}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">Ready to run</td>
                        <td className="py-3.5 px-4 text-slate-400">Click &quot;Run All Tests&quot; to execute</td>
                      </tr>
                    ))
                  ) : (
                    testResults.map((result) => (
                      <tr key={result.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{result.id}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{result.scenario}</td>
                        <td className="py-3.5 px-4 text-slate-600">{result.expectedResult}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                              result.passed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {result.passed ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            {result.actualStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate" title={result.details}>
                          {result.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Contract Specifications View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="font-mono text-xs font-bold text-slate-800 block mb-1">
                POST /api/v1/workspaces
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Create a workspace for the authenticated caller. Creator automatically becomes owner.
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
{`// Request
{ "name": "Launch Team" }

// Response 201
{
  "id": "ws_123",
  "name": "Launch Team",
  "ownerId": "user_alex"
}`}
              </pre>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="font-mono text-xs font-bold text-slate-800 block mb-1">
                POST /api/v1/workspaces/{'{workspaceId}'}/tasks
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Create a task in a workspace caller can access. Validates title (1–120 chars) and assignee.
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
{`// Request
{
  "title": "Build landing page",
  "assigneeId": "user_sarah",
  "status": "todo"
}

// Response 201
{
  "id": "task_123",
  "workspaceId": "ws_launch",
  "title": "Build landing page",
  "status": "todo"
}`}
              </pre>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="font-mono text-xs font-bold text-slate-800 block mb-1">
                PATCH /api/v1/tasks/{'{taskId}'}
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Update a task's title, assignee, or status (`todo`, `in_progress`, `done`).
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
{`// Request
{ "status": "in_progress" }

// Response 200
{
  "id": "task_123",
  "status": "in_progress"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
