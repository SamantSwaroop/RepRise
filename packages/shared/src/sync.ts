import { z } from 'zod';
import { exerciseSchema, type Exercise } from './exercise';
import { workoutSchema, type Workout } from './workout';
import { templateSchema, type Template } from './template';



// ─── Sync Entity & Operation Types ─────────────────────────────────

export const syncEntityTypeSchema = z.enum([
  'workout',
  'workout_exercise',
  'workout_set',
  'template',
  'template_exercise',
  'exercise',
]);

export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;

export const syncOperationSchema = z.enum(['create', 'update', 'delete']);
export type SyncOperation = z.infer<typeof syncOperationSchema>;

// ─── Sync Mutation (Outbox item) ───────────────────────────────────

export const syncMutationSchema = z.object({
  id: z.string().uuid(),
  entityType: syncEntityTypeSchema,
  entityId: z.string(),
  operation: syncOperationSchema,
  payload: z.any().optional(),
  timestamp: z.string(),
});

export type SyncMutation = z.infer<typeof syncMutationSchema>;

// ─── Sync Request & Response Schemas ───────────────────────────────

export const syncRequestSchema = z.object({
  clientTimestamp: z.string(),
  lastSyncAt: z.string().nullable().optional(),
  mutations: z.array(syncMutationSchema).default([]),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

export const syncDeletedItemSchema = z.object({
  entityType: syncEntityTypeSchema,
  id: z.string(),
  deletedAt: z.string(),
});

export type SyncDeletedItem = z.infer<typeof syncDeletedItemSchema>;

export interface SyncChanges {
  exercises: Exercise[];
  workouts: Workout[];
  templates: Template[];
  deletedIds: SyncDeletedItem[];
}

export interface SyncResponse {
  serverTimestamp: string;
  processedMutationIds: string[];
  failedMutations?: { id: string; error: string }[];
  changes: SyncChanges;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
