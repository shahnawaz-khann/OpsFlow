import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import workItemRoutes from './routes/workItemRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

export function createApp() {
  const app = express();

  // Basic security and parsing middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === config.clientUrl ||
          origin === 'http://localhost:5173' ||
          origin === 'http://127.0.0.1:5173' ||
          origin.endsWith('.vercel.app') ||
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Support both /api/health and /health
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // URL normalization: ensure route matches whether rewritten with or without /api prefix
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
    next();
  });


  // API sub-routes
  app.use('/api/auth', authRoutes);
  app.use('/api/work-items', workItemRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Catch-all 404 for undefined routes
  app.use((req, res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
