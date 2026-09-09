import { z } from 'zod';
import { exerciseSchema } from './exercise';

// ─── Enums & Constants ──────────────────────────────────────────────

export const WORKOUT_STATUSES = ['in_progress', 'completed', 'abandoned'] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

// ─── Workout Set Schema & Types ─────────────────────────────────────

export const workoutSetSchema = z.object({
  id: z.string().uuid(),
  workoutExerciseId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  type: z.enum(SET_TYPES).default('normal'),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  isCompleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const createSetSchema = z.object({
  type: z.enum(SET_TYPES).optional().default('normal'),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  isCompleted: z.boolean().optional().default(false),
});

export type CreateSetInput = z.infer<typeof createSetSchema>;

export const updateSetSchema = z.object({
  type: z.enum(SET_TYPES).optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  isCompleted: z.boolean().optional(),
});

export type UpdateSetInput = z.infer<typeof updateSetSchema>;

// ─── Workout Exercise Schema & Types ────────────────────────────────

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  order: z.number().int().nonnegative(),
  notes: z.string().max(1000).nullable().optional(),
  exercise: exerciseSchema.optional(),
  sets: z.array(workoutSetSchema).default([]),
  createdAt: z.string().datetime(),
});

export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const addWorkoutExerciseSchema = z.object({
  exerciseId: z.string().uuid('Invalid exercise ID'),
  order: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export type AddWorkoutExerciseInput = z.infer<typeof addWorkoutExerciseSchema>;

// ─── Workout Schema & Types ─────────────────────────────────────────

export const workoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: z.enum(WORKOUT_STATUSES),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  exercises: z.array(workoutExerciseSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncedAt: z.string().datetime().nullable().optional(),
});

export type Workout = z.infer<typeof workoutSchema>;

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(WORKOUT_STATUSES).optional(),
  completedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Generate a descriptive default workout title based on the time of day.
 */
export function generateDefaultWorkoutName(date: Date = new Date()): string {
  const hour = date.getHours();
  let timeOfDay = 'Morning';
  if (hour >= 12 && hour < 17) {
    timeOfDay = 'Afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'Evening';
  } else if (hour >= 21 || hour < 5) {
    timeOfDay = 'Night';
  }

  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayOfWeek} ${timeOfDay} Workout`;
}

/**
 * Unit conversion helpers.
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}
