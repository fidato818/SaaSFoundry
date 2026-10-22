/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Global error handler middleware.
 * Ensures consistent JSON responses according to API_CONTRACT.md.
 * Prevents secret leakage, stack trace disclosure, and sensitive internal detail exposure.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error: Unexpected server failure';
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');

  // Server-side logging only - stack traces and secrets never leak to the client
  if (status >= 500) {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err);
  }

  res.status(status).json({
    status,
    message,
    code,
    ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
  });
}

/**
 * Pre-handler middleware for testing simulated error injection (e.g. T7 / T11 failure tests).
 */
export function errorSimulationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const simulate = req.headers['x-simulate-error'];
  if (simulate === '500_server_error') {
    const err: AppError = new Error('Internal Server Error: Database failure during save operation');
    err.status = 500;
    err.code = 'INTERNAL_ERROR';
    return next(err);
  }

  if (simulate === '403_forbidden') {
    const err: AppError = new Error('Forbidden: Caller does not have permission in this workspace');
    err.status = 403;
    err.code = 'FORBIDDEN';
    return next(err);
  }

  next();
}

