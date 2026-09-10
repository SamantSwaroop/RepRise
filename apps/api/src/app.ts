import cors from 'cors';
import express from 'express';

import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { workoutsRouter } from './routes/workouts.js';
import { syncRouter } from './routes/sync.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/exercises', exercisesRouter);
  app.use('/api/v1/workouts', workoutsRouter);
  app.use('/api/v1/sync', syncRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
  });

  return app;
}

