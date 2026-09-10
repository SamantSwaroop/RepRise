import { describe, it, expect } from 'vitest';
import {
  workoutSetSchema,
  createSetSchema,
  exerciseSchema,
  createExerciseSchema,
  templateSchema,
  createTemplateSchema,
  syncRequestSchema,
  syncMutationSchema,
  updateProfileSchema,
  registerSchema,
  loginSchema,
} from '@reprise/shared';

describe('Shared Schema Validation Tests', () => {
  describe('workoutSetSchema & createSetSchema', () => {
    it('validates a valid standard workout set with decimal weight', () => {
      const now = new Date().toISOString();
      const validSet = {
        id: '11111111-1111-1111-1111-111111111111',
        workoutExerciseId: '22222222-2222-2222-2222-222222222222',
        setNumber: 1,
        type: 'normal',
        weightKg: 82.5,
        reps: 8,
        isCompleted: true,
        createdAt: now,
        updatedAt: now,
      };
      const result = workoutSetSchema.safeParse(validSet);
      expect(result.success).toBe(true);
    });

    it('validates all set types (normal, warmup, drop, failure)', () => {
      const now = new Date().toISOString();
      for (const type of ['normal', 'warmup', 'drop', 'failure']) {
        const result = workoutSetSchema.safeParse({
          id: '11111111-1111-1111-1111-111111111111',
          workoutExerciseId: '22222222-2222-2222-2222-222222222222',
          setNumber: 1,
          type,
          weightKg: 60,
          reps: 10,
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects an invalid set type', () => {
      const now = new Date().toISOString();
      const result = workoutSetSchema.safeParse({
        id: '11111111-1111-1111-1111-111111111111',
        workoutExerciseId: '22222222-2222-2222-2222-222222222222',
        setNumber: 1,
        type: 'invalid_type',
        weightKg: 60,
        reps: 10,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight or reps in createSetSchema', () => {
      const result = createSetSchema.safeParse({
        type: 'normal',
        weightKg: -10,
        reps: -5,
        isCompleted: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('exerciseSchema & createExerciseSchema', () => {
    it('validates a correct exercise object', () => {
      const validExercise = {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'chest',
        equipment: 'dumbbell',
        userId: null,
        defaultSets: 3,
        createdAt: new Date().toISOString(),
      };
      const result = exerciseSchema.safeParse(validExercise);
      expect(result.success).toBe(true);
    });

    it('rejects an exercise with unknown muscle group', () => {
      const invalid = {
        name: 'Mystic Move',
        muscleGroup: 'wings',
        equipment: 'dumbbell',
      };
      const result = createExerciseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('templateSchema & createTemplateSchema', () => {
    it('validates a complete workout template structure', () => {
      const now = new Date().toISOString();
      const validTemplate = {
        id: '44444444-4444-4444-4444-444444444444',
        userId: '55555555-5555-5555-5555-555555555555',
        name: 'Push Day Hypertrophy',
        createdAt: now,
        updatedAt: now,
        exercises: [
          {
            id: '66666666-6666-6666-6666-666666666666',
            templateId: '44444444-4444-4444-4444-444444444444',
            exerciseId: '33333333-3333-3333-3333-333333333333',
            order: 0,
            defaultSets: 4,
            createdAt: now,
          },
        ],
      };
      const result = templateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('rejects an empty template name in createTemplateSchema', () => {
      const result = createTemplateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('sync schemas', () => {
    it('validates syncMutationSchema', () => {
      const mutation = {
        id: '77777777-7777-7777-7777-777777777777',
        entityType: 'workout',
        entityId: '88888888-8888-8888-8888-888888888888',
        operation: 'create',
        payload: { name: 'Leg Day' },
        timestamp: new Date().toISOString(),
      };
      const result = syncMutationSchema.safeParse(mutation);
      expect(result.success).toBe(true);
    });

    it('validates syncRequestSchema with mutations', () => {
      const payload = {
        clientTimestamp: new Date().toISOString(),
        lastSyncAt: null,
        mutations: [
          {
            id: '77777777-7777-7777-7777-777777777777',
            entityType: 'workout',
            entityId: '88888888-8888-8888-8888-888888888888',
            operation: 'create',
            payload: { name: 'Leg Day' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
      const result = syncRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('auth schemas', () => {
    it('rejects short passwords in registerSchema', () => {
      const result = registerSchema.safeParse({
        email: 'athlete@reprise.app',
        password: 'short',
        displayName: 'Sam',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid emails in loginSchema', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('validates updateProfileSchema with nullable avatar', () => {
      const result = updateProfileSchema.safeParse({
        displayName: 'New Name',
        avatarUrl: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
