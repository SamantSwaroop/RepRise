import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, real, boolean } from 'drizzle-orm/pg-core';

// ─── Enums ─────────────────────────────────────────────────────────

export const muscleGroupEnum = pgEnum('muscle_group', [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'cardio', 'other',
]);

export const equipmentEnum = pgEnum('equipment', [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'band', 'other',
]);

export const workoutStatusEnum = pgEnum('workout_status', [
  'in_progress', 'completed', 'abandoned',
]);

export const setTypeEnum = pgEnum('set_type', [
  'normal', 'warmup', 'drop', 'failure',
]);

// ─── Users ─────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Refresh Tokens ────────────────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Exercises ─────────────────────────────────────────────────────

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  muscleGroup: muscleGroupEnum('muscle_group').notNull(),
  equipment: equipmentEnum('equipment'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  defaultSets: integer('default_sets').default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workouts ──────────────────────────────────────────────────────

export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  status: workoutStatusEnum('status').notNull().default('in_progress'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workout Exercises (join table) ────────────────────────────────

export const workoutExercises = pgTable('workout_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workout Sets ──────────────────────────────────────────────────

export const workoutSets = pgTable('workout_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutExerciseId: uuid('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  type: setTypeEnum('type').notNull().default('normal'),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
