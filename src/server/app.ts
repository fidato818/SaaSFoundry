/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { config } from './config';
import { workspacesRouter } from './routes/workspaces';
import { tasksRouter } from './routes/tasks';
import { runsRouter } from './routes/runs';
import { healthRouter } from './routes/health';
import { errorHandler, errorSimulationMiddleware } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS Middleware for multi-port local development (e.g. Vite on 3000, API on 3001)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', config.corsOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-simulate-error');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Pre-route error simulation hook (for T7 and T11 test harness verification)
  app.use(errorSimulationMiddleware);

  // Mount API v1 Routes
  const prefix = config.apiPrefix;
  app.use(`${prefix}/workspaces`, workspacesRouter);
  app.use(`${prefix}/tasks`, tasksRouter);
  app.use(`${prefix}/runs`, runsRouter);
  app.use(`${prefix}/health`, healthRouter);

  // 404 Handler for unknown routes under API prefix
  app.use(`${prefix}/*`, (req: Request, res: Response) => {
    res.status(404).json({
      status: 404,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

