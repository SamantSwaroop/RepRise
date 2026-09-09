import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthPayload {
  id: string;
  email: string;
}

// Extend Express Request to carry the authenticated user.
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Express middleware that verifies the `Authorization: Bearer <token>` header.
 * On success, attaches `req.user` with `{ id, email }`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Missing or invalid authorization header' } });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid or expired access token' } });
    return;
  }
}
