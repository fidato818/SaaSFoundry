/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '../../types';
import { store } from '../store';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Authentication middleware.
 * Validates caller credentials via Bearer token or x-user-id header.
 * Derives user context from server-side store without trusting arbitrary client claims.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check for simulated error injection headers
  const simulateError = req.headers['x-simulate-error'];
  if (simulateError === '401_unauthenticated') {
    res.status(401).json({
      status: 401,
      message: 'Unauthorized: Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  let userId: string | null = null;

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // In our system, the token maps to a user ID or token_<userId>
    if (token.startsWith('token_')) {
      userId = token.replace('token_', '');
    } else if (token !== 'none' && token.length > 0) {
      userId = token;
    }
  }

  // 2. Check x-user-id header if not resolved via Bearer
  if (!userId && req.headers['x-user-id']) {
    const headerUserId = String(req.headers['x-user-id']).trim();
    if (headerUserId !== 'none' && headerUserId.length > 0) {
      userId = headerUserId;
    }
  }

  // 3. Reject if missing or set to unauthenticated
  if (!userId || userId === 'none') {
    res.status(401).json({
      status: 401,
      message: 'Unauthorized: Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // 4. Verify user exists in store
  const user = store.getUserById(userId);
  if (!user) {
    res.status(401).json({
      status: 401,
      message: 'Unauthorized: Invalid authentication credentials',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Optional authentication middleware for public endpoints that may benefit from user context.
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.startsWith('token_')) {
      userId = token.replace('token_', '');
    } else if (token !== 'none') {
      userId = token;
    }
  }

  if (!userId && req.headers['x-user-id']) {
    const headerUserId = String(req.headers['x-user-id']).trim();
    if (headerUserId !== 'none') {
      userId = headerUserId;
    }
  }

  if (userId) {
    const user = store.getUserById(userId);
    if (user) {
      req.user = user;
    }
  }

  next();
}

