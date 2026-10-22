/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { app } from './app';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production, optionally serve static client bundle from dist
const distPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Client-side fallback for SPA routing (only if not an API request)
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith(config.apiPrefix)) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(config.port, config.host, () => {
  console.log('====================================================');
  console.log(`🚀 SaaSFoundry Backend API Server`);
  console.log(`📡 URL: http://${config.host}:${config.port}${config.apiPrefix}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔒 Persistence: ${config.firebase.isConfigured ? 'Firestore' : 'In-Memory Store'}`);
  console.log(`====================================================`);
  console.log('Available Endpoints:');
  console.log(`  POST   ${config.apiPrefix}/workspaces`);
  console.log(`  GET    ${config.apiPrefix}/workspaces`);
  console.log(`  POST   ${config.apiPrefix}/workspaces/:id/tasks`);
  console.log(`  GET    ${config.apiPrefix}/workspaces/:id/tasks`);
  console.log(`  PATCH  ${config.apiPrefix}/tasks/:id`);
  console.log(`  DELETE ${config.apiPrefix}/tasks/:id`);
  console.log(`  POST   ${config.apiPrefix}/runs/validate`);
  console.log(`  GET    ${config.apiPrefix}/health`);
  console.log('====================================================');
});

export default server;

