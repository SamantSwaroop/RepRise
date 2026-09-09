import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';

import { registerSchema, loginSchema, refreshSchema } from '@reprise/shared';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { users, refreshTokens } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Helpers ───────────────────────────────────────────────────────

function generateAccessToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

async function persistRefreshToken(userId: string, rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
}

// ─── POST /register ────────────────────────────────────────────────

authRouter.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check for existing user
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: { code: 'email_taken', message: 'An account with this email already exists' } });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const [user] = await db.insert(users).values({
      email: body.email.toLowerCase(),
      passwordHash,
      displayName: body.displayName,
    }).returning({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt });

    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, refreshToken);

    res.status(201).json({
      data: {
        user: { ...user, createdAt: user.createdAt.toISOString() },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST /login ───────────────────────────────────────────────────

authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: { code: 'invalid_credentials', message: 'Invalid email or password' } });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: { code: 'invalid_credentials', message: 'Invalid email or password' } });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, refreshToken);

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt.toISOString(),
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST /refresh ─────────────────────────────────────────────────

authRouter.post('/refresh', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');

    const [stored] = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ error: { code: 'invalid_token', message: 'Invalid or expired refresh token' } });
      return;
    }

    // Revoke the old token (rotation)
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    // Look up the user
    const [user] = await db.select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: { code: 'invalid_token', message: 'User not found' } });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken();
    await persistRefreshToken(user.id, newRefreshToken);

    res.json({
      data: {
        tokens: { accessToken, refreshToken: newRefreshToken },
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Refresh error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST /logout ──────────────────────────────────────────────────

authRouter.post('/logout', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    res.json({ data: { message: 'Logged out' } });
  } catch {
    // Logout should not fail visibly — just acknowledge.
    res.json({ data: { message: 'Logged out' } });
  }
});

// ─── GET /me ───────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: { code: 'not_found', message: 'User not found' } });
      return;
    }

    res.json({
      data: {
        user: { ...user, createdAt: user.createdAt.toISOString() },
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});
