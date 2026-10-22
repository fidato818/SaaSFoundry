/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { config } from '../config';

export const healthRouter = Router();

/**
 * GET /api/v1/health
 * Returns service health, uptime, environment, and persistence status.
 * Never leaks server-side secrets or credentials.
 */
healthRouter.get('/', (req: Request, res: Response): void => {
  const storeStatus = store.getStatus();
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    apiPrefix: config.apiPrefix,
    persistence: storeStatus.persistence,
    firebase: storeStatus.firebase,
    counts: storeStatus.counts,
  });
});

