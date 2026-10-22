/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { 
  TestResult, 
  Workspace, 
  OutputValidationResult, 
  ValidationError, 
  AgentSampleRun 
} from '../types';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Terminal, 
  AlertTriangle,
  Code2,
  FileCheck2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ApiTestPlanScreenProps {
  onRefreshAppState: () => Promise<void>;
  activeWorkspace: Workspace | null;
}

const PRESET_VALID: AgentSampleRun = {
  runId: 'run_agent_9981',
  agentId: 'agent_code_analyzer',
  status: 'success',
  inputs: {
    repository: 'SaaSFoundry',
    targetBranch: 'main',
    task: 'audit-contracts',
  },
  outputs: {
    verdict: 'approved',
    summary: 'Multi-tenant architecture and security checks passed.',
    riskLevel: 'low',
  },
  latencyMs: 340,
  timestamp: new Date().toISOString(),
  metrics: {
    totalTokens: 1450,
    costUsd: 0.0029,
  },
};

const PRESET_MISSING_FIELDS = {
  runId: 'run_incomplete_002',
  status: 'success',
  inputs: {
    prompt: 'Summarize workspace tasks',
  },
  // agentId and outputs are missing
};

const PRESET_INVALID_TYPES = {
  runId: 'run_types_err_003',
  agentId: 'agent_worker',
  status: 500, // Invalid: should be string
  inputs: true, // Invalid: should be object or string
  outputs: 12345, // Invalid: should be object or string
  latencyMs: 'very_fast', // Invalid: should be number
  timestamp: 'not-a-real-date', // Invalid: not valid ISO date
  metrics: 'not-an-object', // Invalid: should be object
};

const PRESET_NON_OBJECT = 'Malformed payload string instead of object';

export const ApiTestPlanScreen: React.FC<ApiTestPlanScreenProps> = ({
  onRefreshAppState,
  activeWorkspace,
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'validator' | 'contract'>('tests');

  // AgentOps Output Validator State
  const [validatorInput, setValidatorInput] = useState<string>(
    JSON.stringify(PRESET_VALID, null, 2)
  );
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('valid');
  const [validationResult, setValidationResult] = useState<OutputValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validatorApiError, setValidatorApiError] = useState<string | null>(null);
  const [validationApiLog, setValidationApiLog] = useState<{
    request: any;
    response: any;
    status: number;
  } | null>(null);

  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    setValidatorApiError(null);
    setValidationResult(null);

    if (key === 'valid') {
      setValidatorInput(JSON.stringify(PRESET_VALID, null, 2));
    } else if (key === 'missing_fields') {
      setValidatorInput(JSON.stringify(PRESET_MISSING_FIELDS, null, 2));
    } else if (key === 'invalid_types') {
      setValidatorInput(JSON.stringify(PRESET_INVALID_TYPES, null, 2));
    } else if (key === 'non_object') {
      setValidatorInput(JSON.stringify(PRESET_NON_OBJECT, null, 2));
    }
  };

  const handleValidateOutput = async () => {
    setIsValidating(true);
    setValidatorApiError(null);

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(validatorInput);
    } catch (parseErr: any) {
      setValidatorApiError(`JSON Syntax Error: ${parseErr.message}`);
      setIsValidating(false);
      return;
    }

    try {
      const result = await apiService.validateOutput(parsedPayload);
      setValidationResult(result);
      setValidationApiLog({
        request: parsedPayload,
        response: result,
        status: 200,
      });
    } catch (err: any) {
      setValidatorApiError(err.message || 'API request failed');
      setValidationResult(null);
      setValidationApiLog({
        request: parsedPayload,
        response: { error: err.message, status: err.status || 500 },
        status: err.status || 500,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSimulateApiFailure = async () => {
    setIsValidating(true);
    setValidatorApiError(null);
    apiService.setSimulationMode('500_server_error');

    let parsedPayload: any = { sample: 'test' };
    try {
      parsedPayload = JSON.parse(validatorInput);
    } catch {}

    try {
      await apiService.validateOutput(parsedPayload);
    } catch (err: any) {
      setValidatorApiError(`Simulated 500 Error: ${err.message}`);
      setValidationResult(null);
      setValidationApiLog({
        request: parsedPayload,
        response: { error: err.message, status: 500, code: 'INTERNAL_ERROR' },
        status: 500,
      });
    } finally {
      apiService.setSimulationMode('none');
      setIsValidating(false);
    }
  };

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
        await apiService.updateTask(taskIdToUpdate, {
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

      // -------------------------------------------------------------
      // T8: AgentOps Output Validation - Valid Run Payload
      // -------------------------------------------------------------
      apiService.setCurrentUser('user_alex');
      try {
        const valRes = await apiService.validateOutput(PRESET_VALID);
        results.push({
          id: 'T8',
          scenario: 'AgentOps Output Validation: Valid structured run (POST /api/v1/runs/validate)',
          expectedResult: 'Returns valid: true with 0 errors and success summary',
          actualStatus: 200,
          passed: valRes.valid === true && valRes.errors.length === 0,
          details: `${valRes.summary} (Checked: ${valRes.details?.totalChecked})`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T8',
          scenario: 'AgentOps Output Validation: Valid structured run',
          expectedResult: 'Returns valid: true with 0 errors',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T9: AgentOps Output Validation - Missing Required Fields
      // -------------------------------------------------------------
      try {
        const valRes = await apiService.validateOutput(PRESET_MISSING_FIELDS);
        const hasAgentIdErr = valRes.errors.some((e) => e.field === 'agentId');
        const hasOutputsErr = valRes.errors.some((e) => e.field === 'outputs');
        const allMissingCodes = valRes.errors.every((e) => e.code === 'MISSING_FIELD');

        results.push({
          id: 'T9',
          scenario: 'AgentOps Output Validation: Missing required fields (agentId, outputs)',
          expectedResult: 'Returns valid: false with MISSING_FIELD error codes',
          actualStatus: 200,
          passed: valRes.valid === false && hasAgentIdErr && hasOutputsErr && allMissingCodes,
          details: `Correctly caught ${valRes.errors.length} missing field errors: ${valRes.errors.map(e => e.field).join(', ')}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T9',
          scenario: 'AgentOps Output Validation: Missing required fields',
          expectedResult: 'Returns valid: false with missing field errors',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T10: AgentOps Output Validation - Invalid Data Types
      // -------------------------------------------------------------
      try {
        const valRes = await apiService.validateOutput(PRESET_INVALID_TYPES);
        const hasStatusErr = valRes.errors.some((e) => e.field === 'status');
        const hasLatencyErr = valRes.errors.some((e) => e.field === 'latencyMs');
        const hasTypeErrors = valRes.errors.some((e) => e.code === 'INVALID_TYPE');

        results.push({
          id: 'T10',
          scenario: 'AgentOps Output Validation: Invalid data types (status, latencyMs, inputs, outputs)',
          expectedResult: 'Returns valid: false with INVALID_TYPE error codes',
          actualStatus: 200,
          passed: valRes.valid === false && hasStatusErr && hasLatencyErr && hasTypeErrors,
          details: `Detected ${valRes.errors.length} type mismatches: ${valRes.errors.map(e => `${e.field} (${e.code})`).join(', ')}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T10',
          scenario: 'AgentOps Output Validation: Invalid data types',
          expectedResult: 'Returns valid: false with type errors',
          actualStatus: err.status || 500,
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // -------------------------------------------------------------
      // T11: AgentOps Output Validation - API Failure Handling (500)
      // -------------------------------------------------------------
      apiService.setSimulationMode('500_server_error');
      try {
        await apiService.validateOutput(PRESET_VALID);
        results.push({
          id: 'T11',
          scenario: 'AgentOps Output Validation: API failure handling (Simulate 500)',
          expectedResult: 'Handles server failure gracefully with 500 status',
          actualStatus: 200,
          passed: false,
          details: 'FAIL: Server 500 failure was not triggered',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          id: 'T11',
          scenario: 'AgentOps Output Validation: API failure handling (Simulate 500)',
          expectedResult: 'Handles server failure gracefully with 500 status',
          actualStatus: err.status || 500,
          passed: err.status === 500,
          details: `Server error captured gracefully: ${err.message}`,
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
            <span>AgentOps Verification Suite</span>
            <span aria-hidden="true">·</span>
            <span>TEST_PLAN.md & API_CONTRACT.md</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Critical Test Plan & AgentOps Output Validator
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Live execution harness for MVP test scenarios (T1–T11) and interactive output validation for AgentOps sample runs.
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
            <span>{isRunning ? 'Running Tests...' : 'Run All Tests (T1–T11)'}</span>
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
          Critical Tests (T1–T11)
        </button>
        <button
          onClick={() => setActiveTab('validator')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeTab === 'validator'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Output Validator (AgentOps)
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

      {/* Tab 1: Critical Tests (T1–T11) */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
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
                      ? `All Critical Test Scenarios Passed (${testResults.length}/${testResults.length})`
                      : 'Some Test Scenarios Did Not Pass'}
                  </span>
                  <span className="text-xs opacity-90">
                    Includes multi-tenant RBAC, task workflow CRUD, and AgentOps output validation tests.
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
                      { id: 'T8', scenario: 'Valid Agent Run Output Validation', expected: 'Returns valid: true with 0 errors' },
                      { id: 'T9', scenario: 'Missing Required Fields (agentId, outputs)', expected: 'Returns valid: false with MISSING_FIELD' },
                      { id: 'T10', scenario: 'Invalid Data Types (status, latencyMs, inputs)', expected: 'Returns valid: false with INVALID_TYPE' },
                      { id: 'T11', scenario: 'API Failure Handling on Validate Route', expected: 'Catches 500 server error gracefully' },
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
      )}

      {/* Tab 2: AgentOps Output Validator */}
      {activeTab === 'validator' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>AgentOps Output Validation Engine</span>
            </div>
            <h2 className="text-xl font-bold">Structured Agent Run Validator</h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl">
              Accepts structured sample runs, verifies required fields (<code className="text-indigo-300">runId</code>, <code className="text-indigo-300">agentId</code>, <code className="text-indigo-300">status</code>, <code className="text-indigo-300">inputs</code>, <code className="text-indigo-300">outputs</code>) and data types, and returns predictable evaluation results.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Input Editor & Presets */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Sample Run Payload (JSON)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Preset:</span>
                    <select
                      aria-label="Select sample run preset"
                      value={selectedPresetKey}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="valid">Valid Agent Run</option>
                      <option value="missing_fields">Missing Required Fields</option>
                      <option value="invalid_types">Invalid Data Types</option>
                      <option value="non_object">Non-Object / Malformed</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={16}
                  value={validatorInput}
                  onChange={(e) => {
                    setValidatorInput(e.target.value);
                    if (validatorApiError) setValidatorApiError(null);
                  }}
                  className="w-full font-mono text-[11px] p-3 bg-slate-950 text-emerald-400 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSimulateApiFailure}
                    disabled={isValidating}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simulate 500 Failure</span>
                  </button>

                  <button
                    onClick={handleValidateOutput}
                    disabled={isValidating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>{isValidating ? 'Validating...' : 'Validate Run (POST /api/v1/runs/validate)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 6 cols: Validation Results & Contract Inspector */}
            <div className="lg:col-span-6 space-y-4">
              {validatorApiError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Validation Failure / API Error</span>
                    <span>{validatorApiError}</span>
                  </div>
                </div>
              )}

              {validationResult && (
                <div className="space-y-4">
                  {/* Verdict Card */}
                  <div
                    className={`p-5 rounded-lg border ${
                      validationResult.valid
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-red-50/70 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {validationResult.valid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-bold text-sm">
                          {validationResult.valid ? 'Output Validation Passed' : 'Output Validation Failed'}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded ${
                          validationResult.valid
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {validationResult.valid ? 'VALID (200)' : 'INVALID (200)'}
                      </span>
                    </div>

                    <p className="text-xs opacity-90 leading-relaxed font-medium">
                      {validationResult.summary}
                    </p>

                    {validationResult.details && (
                      <div className="flex items-center gap-4 text-xs font-mono mt-3 pt-3 border-t border-slate-200/60 opacity-80">
                        <span>Total Checked: {validationResult.details.totalChecked}</span>
                        <span>·</span>
                        <span>Passed: {validationResult.details.passedCount}</span>
                        <span>·</span>
                        <span>Errors: {validationResult.details.errorCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Errors Table if any */}
                  {validationResult.errors.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>Detected Schema Errors ({validationResult.errors.length})</span>
                        <span className="font-mono text-[11px] text-slate-500">Strict Type Check</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {validationResult.errors.map((err, idx) => (
                          <div key={idx} className="p-3 text-xs space-y-1 hover:bg-slate-50/60 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[11px]">
                                {err.field}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {err.code}
                              </span>
                            </div>
                            <p className="text-slate-800 text-[11px]">{err.message}</p>
                            {(err.expected || err.received) && (
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                                {err.expected && <span>Expected: <code className="text-slate-700 font-bold">{err.expected}</code></span>}
                                {err.received && <span>Received: <code className="text-red-600 font-bold">{err.received}</code></span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw JSON Contract Response Inspector */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-900 text-slate-100 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        Response Contract Inspector
                      </span>
                      <span className="text-[11px] text-slate-400">POST /api/v1/runs/validate</span>
                    </div>
                    <pre className="p-2.5 bg-black/60 rounded text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                      {JSON.stringify(validationResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!validationResult && !validatorApiError && (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500 space-y-2">
                  <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-medium text-slate-700">No output validation executed yet</p>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    Select a preset or edit the sample run JSON, then click &quot;Validate Run&quot; to test schema compliance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: API Contract Specifications */}
      {activeTab === 'contract' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="font-mono text-xs font-bold text-slate-800 block mb-1">
                POST /api/v1/workspaces
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Create a workspace for caller. Creator becomes owner.
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
                POST /api/v1/workspaces/{'{id}'}/tasks
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Create a task. Validates title (1–120 chars) and assignee.
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
                Update a task's title, assignee, or status.
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

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="font-mono text-xs font-bold text-slate-800 block mb-1">
                POST /api/v1/runs/validate
              </span>
              <p className="text-xs text-slate-600 mb-3">
                Validates structured AgentOps sample run output.
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
{`// Request
{
  "runId": "run_01",
  "agentId": "agent_worker",
  "status": "success",
  "inputs": { "q": "ping" },
  "outputs": { "res": "pong" }
}

// Response 200
{
  "valid": true,
  "errors": [],
  "summary": "Validation passed: ..."
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
