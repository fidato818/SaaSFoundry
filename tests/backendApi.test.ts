/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { createApp } from '../src/server/app';
import { store } from '../src/server/store';
import { AddressInfo } from 'net';

export async function runBackendApiTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      failedTests++;
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }

  console.log('====================================================');
  console.log('🧪 Starting Backend REST API Test Suite');
  console.log('====================================================\n');

  // Reset store to known state
  store.reset();

  // Create Express app and start on an ephemeral port
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  console.log(`📡 Test server running at ${baseUrl}\n`);

  try {
    // ---------------------------------------------------------------
    // 1. Health & Status
    // ---------------------------------------------------------------
    console.log('--- 1. Health & Server Status ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert(healthRes.status === 200, 'GET /health returns 200 OK');
    const healthData = await healthRes.json();
    assert(healthData.status === 'healthy', 'Health status is "healthy"');
    assert(healthData.persistence === 'in_memory', 'Persistence mode is in_memory');
    assert(healthData.firebase.connected === false, 'Accurately reports firebase.connected === false');
    assert(healthData.firebase.message.includes('server memory store'), 'Reports transparent store status message');

    // ---------------------------------------------------------------
    // 2. POST /workspaces (T1 & Validation)
    // ---------------------------------------------------------------
    console.log('\n--- 2. POST /workspaces (T1 & Input Validation) ---');

    // 2a. Unauthenticated request -> 401
    const unauthWsRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Workspace' }),
    });
    assert(unauthWsRes.status === 401, 'POST /workspaces without auth returns 401');
    const unauthWsData = await unauthWsRes.json();
    assert(unauthWsData.code === 'AUTH_REQUIRED', 'Error code is AUTH_REQUIRED');

    // 2b. Empty workspace name -> 400
    const emptyNameRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ name: '   ' }),
    });
    assert(emptyNameRes.status === 400, 'POST /workspaces with empty name returns 400');
    const emptyNameData = await emptyNameRes.json();
    assert(emptyNameData.fieldErrors?.name !== undefined, 'Includes fieldErrors for name');

    // 2c. Name exceeding 80 chars -> 400
    const longNameRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ name: 'A'.repeat(81) }),
    });
    assert(longNameRes.status === 400, 'POST /workspaces with >80 chars name returns 400');

    // 2d. Valid workspace creation -> 201 Created
    const validWsRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ name: 'Engineering Alpha' }),
    });
    assert(validWsRes.status === 201, 'POST /workspaces returns 201 Created');
    const validWsData = await validWsRes.json();
    assert(validWsData.name === 'Engineering Alpha', 'Workspace name matches request');
    assert(validWsData.ownerId === 'user_alex', 'ownerId derived from server auth context');
    assert(validWsData.id.startsWith('ws_'), 'Generates valid workspace ID');

    const createdWsId = validWsData.id;

    // 2e. GET /workspaces verifies it appears in user list
    const listWsRes = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': 'Bearer user_alex' },
    });
    assert(listWsRes.status === 200, 'GET /workspaces returns 200 OK');
    const listWsData = await listWsRes.json();
    assert(listWsData.some((w: any) => w.id === createdWsId), 'Created workspace appears in list');

    // ---------------------------------------------------------------
    // 3. POST /workspaces/:id/tasks (T2, T5, T6)
    // ---------------------------------------------------------------
    console.log('\n--- 3. POST /workspaces/:id/tasks (T2, T5, T6 Validation) ---');

    // 3a. Unauthenticated -> 401
    const unauthTaskRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task by guest' }),
    });
    assert(unauthTaskRes.status === 401, 'POST task without auth returns 401');

    // 3b. Non-member caller -> 403 Forbidden (T5)
    // user_elena is not a member of Engineering Alpha
    const forbiddenTaskRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_elena',
      },
      body: JSON.stringify({ title: 'Elena intruder task' }),
    });
    assert(forbiddenTaskRes.status === 403, 'POST task by non-member returns 403 Forbidden');

    // 3c. Empty title -> 400 Bad Request (T6)
    const emptyTitleRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ title: '   ', status: 'todo' }),
    });
    assert(emptyTitleRes.status === 400, 'POST task with empty title returns 400 Bad Request');

    // 3d. Invalid status -> 400 Bad Request (T6)
    const invalidStatusRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ title: 'Valid Title', status: 'non_existent_status' }),
    });
    assert(invalidStatusRes.status === 400, 'POST task with invalid status returns 400 Bad Request');

    // 3e. Assignee not in workspace -> 400 Bad Request
    const invalidAssigneeRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ title: 'Valid Title', assigneeId: 'user_elena' }),
    });
    assert(invalidAssigneeRes.status === 400, 'POST task with foreign assignee returns 400');

    // 3f. Valid task creation -> 201 Created (T2)
    const validTaskRes = await fetch(`${baseUrl}/workspaces/${createdWsId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({
        title: 'Build secure authentication module',
        status: 'todo',
      }),
    });
    assert(validTaskRes.status === 201, 'POST task returns 201 Created');
    const validTaskData = await validTaskRes.json();
    assert(validTaskData.title === 'Build secure authentication module', 'Task title matches');
    assert(validTaskData.status === 'todo', 'Task status is todo');
    assert(validTaskData.createdBy === 'user_alex', 'createdBy matches authenticated caller');

    const createdTaskId = validTaskData.id;

    // ---------------------------------------------------------------
    // 4. PATCH /tasks/:id (T3)
    // ---------------------------------------------------------------
    console.log('\n--- 4. PATCH /tasks/:id (T3 Status Update & Auth) ---');

    // 4a. Update status to in_progress by member -> 200 OK (T3)
    const updateTaskRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    assert(updateTaskRes.status === 200, 'PATCH task status returns 200 OK');
    const updateTaskData = await updateTaskRes.json();
    assert(updateTaskData.status === 'in_progress', 'Task status updated to in_progress');

    // 4b. Update with invalid status -> 400
    const badPatchRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ status: 'bogus_status' }),
    });
    assert(badPatchRes.status === 400, 'PATCH task with invalid status returns 400');

    // 4c. Non-existent task -> 404
    const notFoundPatchRes = await fetch(`${baseUrl}/tasks/task_does_not_exist_999`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user_alex',
      },
      body: JSON.stringify({ status: 'done' }),
    });
    assert(notFoundPatchRes.status === 404, 'PATCH non-existent task returns 404');

    // ---------------------------------------------------------------
    // 5. POST /runs/validate (AgentOps Output Validation)
    // ---------------------------------------------------------------
    console.log('\n--- 5. POST /runs/validate (AgentOps Output Validation) ---');

    // 5a. Valid sample run -> 200 OK, valid: true
    const validRunPayload = {
      runId: 'run_backend_101',
      agentId: 'agent_evaluator',
      status: 'success',
      inputs: { task: 'contract-compliance' },
      outputs: { verdict: 'pass' },
      latencyMs: 180,
      timestamp: '2026-10-22T10:00:00.000Z',
    };
    const validRunRes = await fetch(`${baseUrl}/runs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRunPayload),
    });
    assert(validRunRes.status === 200, 'POST /runs/validate returns 200 OK');
    const validRunData = await validRunRes.json();
    assert(validRunData.valid === true, 'Evaluated run is valid: true');
    assert(validRunData.errors.length === 0, 'No validation errors found');

    // 5b. Missing fields -> 200 OK, valid: false
    const missingRunPayload = {
      runId: 'run_backend_102',
      status: 'success',
      inputs: 'sample query',
      // missing agentId, outputs
    };
    const missingRunRes = await fetch(`${baseUrl}/runs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingRunPayload),
    });
    assert(missingRunRes.status === 200, 'POST /runs/validate returns 200 OK');
    const missingRunData = await missingRunRes.json();
    assert(missingRunData.valid === false, 'Missing fields evaluated as valid: false');
    assert(missingRunData.errors.some((e: any) => e.field === 'agentId'), 'Reports missing agentId');
    assert(missingRunData.errors.some((e: any) => e.field === 'outputs'), 'Reports missing outputs');

    // 5c. Malformed non-object body -> 400 Bad Request
    const malformedRunRes = await fetch(`${baseUrl}/runs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('string_instead_of_object'),
    });
    assert(malformedRunRes.status === 400, 'POST /runs/validate with non-object returns 400');

    // ---------------------------------------------------------------
    // 6. Error Simulation & Safety (T7 / T11)
    // ---------------------------------------------------------------
    console.log('\n--- 6. Error Simulation & Secret Protection ---');
    const simulatedErrorRes = await fetch(`${baseUrl}/workspaces`, {
      headers: { 
        'Authorization': 'Bearer user_alex',
        'x-simulate-error': '500_server_error',
      },
    });
    assert(simulatedErrorRes.status === 500, 'Simulated 500 error returns 500 status');
    const simulatedErrorData = await simulatedErrorRes.json();
    assert(simulatedErrorData.code === 'INTERNAL_ERROR', 'Error code is INTERNAL_ERROR');
    assert(simulatedErrorData.stack === undefined, 'Stack trace is never leaked to client');
    assert(simulatedErrorData.apiKey === undefined, 'Secrets are not leaked');

    console.log('\n====================================================');
    console.log(`📊 All Backend API Tests Passed: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);
    console.log('====================================================');
  } finally {
    server.close();
  }

  if (failedTests > 0) {
    throw new Error(`${failedTests} backend API tests failed`);
  }
}

// Standalone execution support
if (process.argv[1]?.replace(/\\/g, '/').endsWith('backendApi.test.ts')) {
  runBackendApiTests().catch((err) => {
    console.error('Unhandled backend test failure:', err);
    process.exit(1);
  });
}

