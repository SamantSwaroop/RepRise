import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      service: 'reprise-api',
      timestamp: new Date().toISOString(),
    },
  });
});
