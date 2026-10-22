/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigin: string;
  firebase: {
    projectId: string | null;
    clientEmail: string | null;
    privateKey: string | null;
    isConfigured: boolean;
  };
  geminiApiKey: string | null;
}

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || null;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

const isFirebaseConfigured = Boolean(
  firebaseProjectId && firebaseClientEmail && firebasePrivateKey
);

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  firebase: {
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
    isConfigured: isFirebaseConfigured,
  },
  geminiApiKey: process.env.GEMINI_API_KEY || null,
};

