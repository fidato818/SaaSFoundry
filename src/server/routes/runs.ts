/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

export const runsRouter = Router();

// Output validation can be called with optional auth context
runsRouter.use(optionalAuth);

/**
 * POST /api/v1/runs/validate
 * Validates a structured AgentOps sample run output against schema and data types.
 * Contract:
 * Input: { "runId": "...", "agentId": "...", "status": "...", "inputs": ..., "outputs": ... }
 * Returns 200 with { valid, errors, summary, details }
 */
runsRouter.post('/validate', (req: Request, res: Response): void => {
  const payload = req.body;

  if (payload === undefined || payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    const receivedType = payload === null ? 'null' : Array.isArray(payload) ? 'array' : typeof payload;
    res.status(400).json({
      valid: false,
      errors: [
        {
          field: 'payload',
          message: `Invalid input: Expected a JSON object payload, received ${receivedType}`,
          code: 'INVALID_PAYLOAD',
          expected: 'object',
          received: receivedType,
        },
      ],
      summary: `Validation failed: Root payload must be a JSON object, received ${receivedType}.`,
      details: {
        totalChecked: 1,
        passedCount: 0,
        errorCount: 1,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const result = store.validateOutput(payload);
  res.status(200).json(result);
});

