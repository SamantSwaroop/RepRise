import { z } from 'zod';

// ─── Progress Metrics & Filters ──────────────────────────────────────

export const progressMetricSchema = z.enum(['1rm', 'max_weight', 'volume']);
export type ProgressMetric = z.infer<typeof progressMetricSchema>;

export const timeRangeSchema = z.enum(['1M', '3M', '6M', '1Y', 'ALL']);
export type TimeRange = z.infer<typeof timeRangeSchema>;

// ─── Dashboard Summary Stats ─────────────────────────────────────────

export const dashboardStatsSchema = z.object({
  totalWorkouts: z.number().int().nonnegative(),
  totalVolumeKg: z.number().nonnegative(),
  totalSets: z.number().int().nonnegative(),
  totalDurationMinutes: z.number().int().nonnegative(),
  thisWeekWorkouts: z.number().int().nonnegative(),
  thisWeekVolumeKg: z.number().nonnegative(),
  lastWeekVolumeKg: z.number().nonnegative(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// ─── Weekly Volume Trend Point ───────────────────────────────────────

export const weeklyVolumePointSchema = z.object({
  weekLabel: z.string(),
  weekStart: z.string(),
  volumeKg: z.number().nonnegative(),
  workoutCount: z.number().int().nonnegative(),
});
export type WeeklyVolumePoint = z.infer<typeof weeklyVolumePointSchema>;

// ─── Exercise Progress Point ─────────────────────────────────────────

export const exerciseProgressPointSchema = z.object({
  date: z.string(),
  workoutId: z.string(),
  workoutName: z.string(),
  estimated1RM: z.number().nonnegative(),
  maxWeightKg: z.number().nonnegative(),
  totalVolumeKg: z.number().nonnegative(),
  bestReps: z.number().int().nonnegative(),
  bestWeight: z.number().nonnegative(),
});
export type ExerciseProgressPoint = z.infer<typeof exerciseProgressPointSchema>;

// ─── Exercise with Logged Stats ──────────────────────────────────────

export const loggedExerciseInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: z.string(),
  loggedSetCount: z.number().int().nonnegative(),
  best1RM: z.number().nonnegative(),
});
export type LoggedExerciseInfo = z.infer<typeof loggedExerciseInfoSchema>;
