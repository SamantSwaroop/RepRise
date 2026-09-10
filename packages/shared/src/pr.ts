// ─── Phase 7: Personal Record (PR) Types & Logic ─────────────────────

export type PRType = '1rm' | 'weight';

export interface ExerciseBaseline {
  exerciseId: string;
  maxWeightKg: number;
  max1RM: number;
  hasPriorHistory: boolean;
}

export interface DetectedPR {
  type: PRType;
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setNumber: number;
  value: number;
  previousValue: number | null;
  improvement: number | null;
  weightKg: number;
  reps: number;
}

export interface AllTimeExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  bestWeightKg: number;
  bestWeightReps: number;
  bestWeightDate: string;
  best1RM: number;
  best1RMWeight: number;
  best1RMReps: number;
  best1RMDate: string;
}

/**
 * Standard Epley 1RM formula: weight * (1 + reps / 30) rounded to 1 decimal place.
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Pure function: Detects whether a given completed set breaks the previous baseline.
 * If there is no prior history (e.g. first workout), returns empty array
 * (so first-time exercises don't trigger false celebratory PR popups).
 */
export function detectPRsForSet(
  set: { weightKg?: number | null; reps?: number | null; isCompleted?: boolean },
  baseline?: ExerciseBaseline | null,
): PRType[] {
  if (!set.isCompleted || !set.weightKg || !set.reps) return [];
  if (set.weightKg <= 0 || set.reps <= 0) return [];
  if (!baseline || !baseline.hasPriorHistory) return [];

  const prs: PRType[] = [];

  // Heaviest Weight PR
  if (baseline.maxWeightKg > 0 && set.weightKg > baseline.maxWeightKg) {
    prs.push('weight');
  }

  // Est. 1RM PR
  const current1RM = calculate1RM(set.weightKg, set.reps);
  if (baseline.max1RM > 0 && current1RM > baseline.max1RM) {
    prs.push('1rm');
  }

  return prs;
}
