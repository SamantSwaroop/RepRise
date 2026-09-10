import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

describe('API Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    it('returns 200 with service information and timestamp', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('reprise-api');
      expect(typeof res.body.data.timestamp).toBe('string');
    });
  });

  describe('404 Fallback Route', () => {
    it('returns 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('not_found');
    });
  });

  describe('Auth Route Validations', () => {
    it('rejects registration with missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad-email' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects registration with password shorter than 8 chars', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid@example.com',
          password: '123',
          displayName: 'Athlete',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects login with missing password with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects login with non-existent account with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent_random_user_99999@example.com',
          password: 'password123',
        });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('invalid_credentials');
    });

    it('rejects refresh request with missing token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });
  });

  describe('Protected Route Guards', () => {
    it('rejects GET /api/v1/auth/me without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects PATCH /api/v1/auth/me without authorization header with 401', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .send({ displayName: 'New Name' });
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/v1/exercises without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/exercises');
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/v1/workouts without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/workouts');
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/v1/sync/pull without authorization header with 401', async () => {
      const res = await request(app).post('/api/v1/sync/pull').send({});
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/v1/sync/push without authorization header with 401', async () => {
      const res = await request(app).post('/api/v1/sync/push').send({});
      expect(res.status).toBe(401);
    });

    it('rejects invalid/forged bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
    });
  });
});
