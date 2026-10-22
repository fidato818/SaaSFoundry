/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiService } from '../src/services/apiService';
import { AgentSampleRun } from '../src/types';

export async function runOutputValidationTests() {
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
  console.log('🧪 Starting AgentOps Output Validation Test Suite');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // Test 1: Valid structured agent run
  // -----------------------------------------------------------------
  console.log('--- Test Suite 1: Valid Structured Agent Run ---');
  const validRun: AgentSampleRun = {
    runId: 'run_valid_101',
    agentId: 'agent_analyst_01',
    status: 'success',
    inputs: { prompt: 'Analyze code quality', files: 42 },
    outputs: { score: 98, status: 'approved' },
    latencyMs: 250,
    timestamp: '2026-10-22T10:00:00.000Z',
    metrics: {
      totalTokens: 520,
      costUsd: 0.0015,
    },
  };

  const res1 = await apiService.validateOutput(validRun);
  assert(res1.valid === true, 'Valid run returns valid: true');
  assert(res1.errors.length === 0, 'Valid run has 0 errors');
  assert(res1.summary.includes('Validation passed'), 'Valid run summary indicates success');
  assert(res1.details?.errorCount === 0, 'Details errorCount is 0');
  assert(res1.details?.passedCount === res1.details?.totalChecked, 'All checked fields passed');
  assert((res1.details?.totalChecked || 0) >= 5, 'At least 5 required fields checked');
  assert(res1.details?.passedCount === res1.details?.totalChecked, 'All checked fields passed');

  // Also valid with string inputs/outputs
  const validWithStringIO = {
    runId: 'run_string_102',
    agentId: 'agent_chat',
    status: 'completed',
    inputs: 'Hello agent',
    outputs: 'Hello user, all systems operational',
  };
  const res1b = await apiService.validateOutput(validWithStringIO);
  assert(res1b.valid === true, 'Valid run with string inputs/outputs is accepted');
  assert(res1b.errors.length === 0, 'String IO run has 0 errors');

  // -----------------------------------------------------------------
  // Test 2: Missing required fields
  // -----------------------------------------------------------------
  console.log('\n--- Test Suite 2: Missing Required Fields ---');

  // 2a: Missing runId
  const missingRunId = { ...validRun, runId: undefined };
  const res2a = await apiService.validateOutput(missingRunId);
  assert(res2a.valid === false, 'Missing runId returns valid: false');
  assert(res2a.errors.some(e => e.field === 'runId' && e.code === 'MISSING_FIELD'), 'Reports missing runId');

  // 2b: Missing agentId
  const missingAgentId = { ...validRun, agentId: undefined };
  const res2b = await apiService.validateOutput(missingAgentId);
  assert(res2b.valid === false, 'Missing agentId returns valid: false');
  assert(res2b.errors.some(e => e.field === 'agentId' && e.code === 'MISSING_FIELD'), 'Reports missing agentId');

  // 2c: Missing status
  const missingStatus = { ...validRun, status: undefined };
  const res2c = await apiService.validateOutput(missingStatus);
  assert(res2c.valid === false, 'Missing status returns valid: false');
  assert(res2c.errors.some(e => e.field === 'status' && e.code === 'MISSING_FIELD'), 'Reports missing status');

  // 2d: Missing inputs
  const missingInputs = { ...validRun, inputs: undefined };
  const res2d = await apiService.validateOutput(missingInputs);
  assert(res2d.valid === false, 'Missing inputs returns valid: false');
  assert(res2d.errors.some(e => e.field === 'inputs' && e.code === 'MISSING_FIELD'), 'Reports missing inputs');

  // 2e: Missing outputs
  const missingOutputs = { ...validRun, outputs: undefined };
  const res2e = await apiService.validateOutput(missingOutputs);
  assert(res2e.valid === false, 'Missing outputs returns valid: false');
  assert(res2e.errors.some(e => e.field === 'outputs' && e.code === 'MISSING_FIELD'), 'Reports missing outputs');

  // 2f: Multiple missing fields at once
  const multipleMissing = { latencyMs: 120 };
  const res2f = await apiService.validateOutput(multipleMissing);
  assert(res2f.valid === false, 'Multiple missing returns valid: false');
  assert(res2f.errors.length >= 5, 'Reports all missing required fields (at least 5)');

  // -----------------------------------------------------------------
  // Test 3: Invalid data types & values
  // -----------------------------------------------------------------
  console.log('\n--- Test Suite 3: Invalid Data Types & Values ---');

  // 3a: runId as number
  const invalidRunIdType = { ...validRun, runId: 12345 };
  const res3a = await apiService.validateOutput(invalidRunIdType);
  assert(res3a.valid === false, 'Number runId returns valid: false');
  assert(res3a.errors.some(e => e.field === 'runId' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on runId');

  // 3b: agentId as empty string
  const emptyAgentId = { ...validRun, agentId: '   ' };
  const res3b = await apiService.validateOutput(emptyAgentId);
  assert(res3b.valid === false, 'Empty string agentId returns valid: false');
  assert(res3b.errors.some(e => e.field === 'agentId' && e.code === 'INVALID_VALUE'), 'Reports INVALID_VALUE on empty agentId');

  // 3c: status with invalid value (not in allowed enum)
  const invalidStatusValue = { ...validRun, status: 'arbitrary_status' };
  const res3c = await apiService.validateOutput(invalidStatusValue);
  assert(res3c.valid === false, 'Invalid status enum returns valid: false');
  assert(res3c.errors.some(e => e.field === 'status' && e.code === 'INVALID_VALUE'), 'Reports INVALID_VALUE on status');

  // 3d: status with wrong type (number)
  const numberStatus = { ...validRun, status: 200 };
  const res3d = await apiService.validateOutput(numberStatus);
  assert(res3d.valid === false, 'Number status returns valid: false');
  assert(res3d.errors.some(e => e.field === 'status' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on status');

  // 3e: inputs with wrong type (boolean)
  const boolInputs = { ...validRun, inputs: true };
  const res3e = await apiService.validateOutput(boolInputs);
  assert(res3e.valid === false, 'Boolean inputs returns valid: false');
  assert(res3e.errors.some(e => e.field === 'inputs' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on inputs');

  // 3f: outputs with wrong type (number)
  const numberOutputs = { ...validRun, outputs: 999 };
  const res3f = await apiService.validateOutput(numberOutputs);
  assert(res3f.valid === false, 'Number outputs returns valid: false');
  assert(res3f.errors.some(e => e.field === 'outputs' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on outputs');

  // 3g: latencyMs with string instead of number
  const stringLatency = { ...validRun, latencyMs: '250ms' };
  const res3g = await apiService.validateOutput(stringLatency);
  assert(res3g.valid === false, 'String latencyMs returns valid: false');
  assert(res3g.errors.some(e => e.field === 'latencyMs' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on latencyMs');

  // 3h: latencyMs with negative number
  const negativeLatency = { ...validRun, latencyMs: -50 };
  const res3h = await apiService.validateOutput(negativeLatency);
  assert(res3h.valid === false, 'Negative latencyMs returns valid: false');
  assert(res3h.errors.some(e => e.field === 'latencyMs' && e.code === 'INVALID_VALUE'), 'Reports INVALID_VALUE on negative latencyMs');

  // 3i: timestamp with invalid format
  const badDateTimestamp = { ...validRun, timestamp: 'invalid-iso-date' };
  const res3i = await apiService.validateOutput(badDateTimestamp);
  assert(res3i.valid === false, 'Invalid timestamp returns valid: false');
  assert(res3i.errors.some(e => e.field === 'timestamp' && e.code === 'INVALID_VALUE'), 'Reports INVALID_VALUE on invalid timestamp');

  // 3j: metrics as non-object (e.g. array or string)
  const arrayMetrics = { ...validRun, metrics: ['tokens', 500] };
  const res3j = await apiService.validateOutput(arrayMetrics);
  assert(res3j.valid === false, 'Array metrics returns valid: false');
  assert(res3j.errors.some(e => e.field === 'metrics' && e.code === 'INVALID_TYPE'), 'Reports INVALID_TYPE on array metrics');

  // -----------------------------------------------------------------
  // Test 4: Root payload validation (Non-object or null)
  // -----------------------------------------------------------------
  console.log('\n--- Test Suite 4: Non-Object / Null Root Payload ---');

  const res4Null = await apiService.validateOutput(null);
  assert(res4Null.valid === false, 'Null payload returns valid: false');
  assert(res4Null.errors[0].code === 'INVALID_PAYLOAD', 'Null payload has INVALID_PAYLOAD error');

  const res4String = await apiService.validateOutput('plain text string');
  assert(res4String.valid === false, 'String payload returns valid: false');
  assert(res4String.errors[0].code === 'INVALID_PAYLOAD', 'String payload has INVALID_PAYLOAD error');

  const res4Array = await apiService.validateOutput([1, 2, 3]);
  assert(res4Array.valid === false, 'Array payload returns valid: false');
  assert(res4Array.errors[0].code === 'INVALID_PAYLOAD', 'Array payload has INVALID_PAYLOAD error');

  // -----------------------------------------------------------------
  // Test 5: API failure handling (Simulate 500 Server Error)
  // -----------------------------------------------------------------
  console.log('\n--- Test Suite 5: Simulated Server API Failure ---');
  apiService.setSimulationMode('500_server_error');
  let caught500 = false;
  try {
    await apiService.validateOutput(validRun);
  } catch (err: any) {
    caught500 = true;
    assert(err.status === 500, 'API throws simulated 500 status');
    assert(err.code === 'INTERNAL_ERROR', 'API error code is INTERNAL_ERROR');
  } finally {
    apiService.setSimulationMode('none');
  }
  assert(caught500 === true, '500 error was caught as expected');

  // -----------------------------------------------------------------
  // Test 6: API unauthenticated failure handling (Simulate 401)
  // -----------------------------------------------------------------
  console.log('\n--- Test Suite 6: Simulated 401 Unauthenticated ---');
  apiService.setSimulationMode('401_unauthenticated');
  let caught401 = false;
  try {
    await apiService.validateOutput(validRun);
  } catch (err: any) {
    caught401 = true;
    assert(err.status === 401, 'API throws simulated 401 status');
    assert(err.code === 'AUTH_REQUIRED', 'API error code is AUTH_REQUIRED');
  } finally {
    apiService.setSimulationMode('none');
  }
  assert(caught401 === true, '401 error was caught as expected');

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 Output Validation Tests Completed: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    throw new Error(`${failedTests} output validation tests failed`);
  }
}

// Standalone execution support
if (process.argv[1]?.replace(/\\/g, '/').endsWith('outputValidation.test.ts')) {
  runOutputValidationTests().catch((err) => {
    console.error('Unhandled test failure:', err);
    process.exit(1);
  });
}
