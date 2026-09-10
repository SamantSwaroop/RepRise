import type { Workout } from './workout';
import type { Template } from './template';
import type { Exercise } from './exercise';



export interface RepRiseBackup {
  version: number;
  appName: string;
  exportedAt: string;
  user: {
    id: string;
    email?: string;
    displayName?: string;
  } | null;
  workouts: Workout[];
  templates: Template[];
  exercises: Exercise[];
}

export interface WorkoutCSVRow {
  date: string;
  workoutName: string;
  exerciseName: string;
  setNumber: number;
  setType: string;
  weight: number | string;
  weightUnit: string;
  reps: number | string;
  rpe: number | string;
  isCompleted: boolean;
  workoutNotes: string;
  exerciseNotes: string;
}

/**
 * Escapes a value according to RFC-4180 specifications.
 * Encloses the value in quotes and doubles internal quotation marks.
 */
export function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value == null) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}
