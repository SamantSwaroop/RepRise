import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────────

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'core',
  'cardio',
  'other',
] as const;

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'band',
  'other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

// ─── Schemas ───────────────────────────────────────────────────────

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT).nullable(),
  userId: z.string().uuid().nullable(), // null = global / seeded exercise
  defaultSets: z.number().int().min(1).max(20).nullable().optional(),
  createdAt: z.string().datetime(),
});

export const createExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(100),
  muscleGroup: z.enum(MUSCLE_GROUPS, {
    errorMap: () => ({ message: 'Select a muscle group' }),
  }),
  equipment: z.enum(EQUIPMENT).nullable().optional(),
  defaultSets: z.number().int().min(1).max(20).nullable().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

// ─── Inferred Types ────────────────────────────────────────────────

export type Exercise = z.infer<typeof exerciseSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
