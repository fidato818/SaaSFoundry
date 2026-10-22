/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runOutputValidationTests } from './outputValidation.test';
import { runBackendApiTests } from './backendApi.test';

async function main() {
  console.log('🚀 Running Full Project Test Verification...\n');

  try {
    console.log('▶️ Running Test Suite 1: AgentOps Output Validation...');
    await runOutputValidationTests();

    console.log('\n▶️ Running Test Suite 2: Backend REST API Endpoints & Auth...');
    await runBackendApiTests();

    console.log('\n🎉 ALL TEST SUITES PASSED SUCCESSFULLY!\n');
  } catch (err: any) {
    console.error('\n💥 Test suite execution failed:', err.message);
    process.exit(1);
  }
}

main();

