import { Router } from 'express';
import { eq, and, gt, or, isNull, sql } from 'drizzle-orm';
import type { SyncRequest, SyncResponse, SyncMutation, SyncDeletedItem } from '@reprise/shared';
import { syncRequestSchema } from '@reprise/shared';
import { db } from '../db/index.js';
import {
  workouts,
  workoutExercises,
  workoutSets,
  templates,
  templateExercises,
  exercises,
  syncTombstones,
} from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const syncRouter = Router();

syncRouter.use(requireAuth);

syncRouter.post('/', async (req, res) => {
  try {
    const parseResult = syncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Invalid sync payload',
          details: parseResult.error.flatten(),
        },
      });
      return;
    }

    const { lastSyncAt, mutations } = parseResult.data;
    const userId = req.user!.id;
    const now = new Date();
    const serverTimestamp = now.toISOString();

    const processedMutationIds: string[] = [];
    const failedMutations: { id: string; error: string }[] = [];

    // ─── 1. PUSH PHASE: Process Mutations ──────────────────────────

    for (const mutation of mutations) {
      try {
        await processSingleMutation(userId, mutation, now);
        processedMutationIds.push(mutation.id);
      } catch (err: any) {
        console.error(`Sync error on mutation ${mutation.id} (${mutation.entityType}:${mutation.operation}):`, err);
        failedMutations.push({
          id: mutation.id,
          error: err?.message || 'Failed to apply mutation',
        });
      }
    }

    // ─── 2. PULL PHASE: Query Server Changes ───────────────────────

    const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;

    // A. Exercises (global + user custom)
    const exercisesQuery = db.select().from(exercises);
    const exerciseConditions = [
      or(isNull(exercises.userId), eq(exercises.userId, userId)),
      isNull(exercises.deletedAt),
    ];
    if (lastSyncDate) {
      exerciseConditions.push(gt(exercises.createdAt, lastSyncDate));
    }
    const changedExercisesRows = await exercisesQuery.where(and(...exerciseConditions));
    const changedExercises = changedExercisesRows.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));

    // B. Workouts
    const workoutConditions = [
      eq(workouts.userId, userId),
      isNull(workouts.deletedAt),
    ];
    if (lastSyncDate) {
      workoutConditions.push(gt(workouts.updatedAt, lastSyncDate));
    }
    const changedWorkoutRows = await db.select().from(workouts).where(and(...workoutConditions));

    const fullWorkouts = await Promise.all(
      changedWorkoutRows.map(async (w) => {
        const weRows = await db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.workoutId, w.id))
          .orderBy(workoutExercises.order);

        const fullExercises = await Promise.all(
          weRows.map(async (we) => {
            const setRows = await db
              .select()
              .from(workoutSets)
              .where(eq(workoutSets.workoutExerciseId, we.id))
              .orderBy(workoutSets.setNumber);

            return {
              id: we.id,
              workoutId: we.workoutId,
              exerciseId: we.exerciseId,
              order: we.order,
              notes: we.notes,
              createdAt: we.createdAt.toISOString(),
              sets: setRows.map((s) => ({
                id: s.id,
                workoutExerciseId: s.workoutExerciseId,
                setNumber: s.setNumber,
                type: s.type,
                weightKg: s.weightKg,
                reps: s.reps,
                rpe: s.rpe,
                isCompleted: s.isCompleted,
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
              })),
            };
          }),
        );

        return {
          id: w.id,
          userId: w.userId,
          name: w.name,
          status: w.status,
          startedAt: w.startedAt.toISOString(),
          completedAt: w.completedAt ? w.completedAt.toISOString() : null,
          notes: w.notes,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
          exercises: fullExercises,
        };
      }),
    );

    // C. Templates
    const templateConditions = [
      eq(templates.userId, userId),
      isNull(templates.deletedAt),
    ];
    if (lastSyncDate) {
      templateConditions.push(gt(templates.updatedAt, lastSyncDate));
    }
    const changedTemplateRows = await db.select().from(templates).where(and(...templateConditions));

    const fullTemplates = await Promise.all(
      changedTemplateRows.map(async (t) => {
        const teRows = await db
          .select()
          .from(templateExercises)
          .where(eq(templateExercises.templateId, t.id))
          .orderBy(templateExercises.order);

        return {
          id: t.id,
          userId: t.userId,
          name: t.name,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          exercises: teRows.map((te) => ({
            id: te.id,
            templateId: te.templateId,
            exerciseId: te.exerciseId,
            order: te.order,
            defaultSets: te.defaultSets,
            createdAt: te.createdAt.toISOString(),
          })),
        };
      }),
    );

    // D. Tombstones (Deleted IDs)
    let deletedItems: SyncDeletedItem[] = [];
    if (lastSyncDate) {
      const tombstoneRows = await db
        .select()
        .from(syncTombstones)
        .where(
          and(
            eq(syncTombstones.userId, userId),
            gt(syncTombstones.deletedAt, lastSyncDate),
          ),
        );

      deletedItems = tombstoneRows.map((row) => ({
        entityType: row.entityType as any,
        id: row.entityId,
        deletedAt: row.deletedAt.toISOString(),
      }));
    }

    const response: SyncResponse = {
      serverTimestamp,
      processedMutationIds,
      failedMutations: failedMutations.length > 0 ? failedMutations : undefined,
      changes: {
        exercises: changedExercises as any,
        workouts: fullWorkouts as any,
        templates: fullTemplates as any,
        deletedIds: deletedItems,
      },
    };

    res.json({ data: response });
  } catch (err) {
    console.error('Batch sync endpoint error:', err);
    res.status(500).json({
      error: {
        code: 'internal',
        message: err instanceof Error ? err.message : 'Internal sync error',
      },
    });
  }
});

// ─── Mutation Processor ────────────────────────────────────────────

async function processSingleMutation(userId: string, mutation: SyncMutation, now: Date) {
  const { entityType, entityId, operation, payload, timestamp } = mutation;
  const mutationDate = new Date(timestamp);

  switch (entityType) {
    case 'workout': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(workouts)
          .where(and(eq(workouts.id, entityId), eq(workouts.userId, userId)))
          .limit(1);

        if (existing.length > 0) {
          // LWW check: only update if mutation is newer than existing record
          if (mutationDate >= existing[0].updatedAt) {
            await db
              .update(workouts)
              .set({
                name: payload?.name ?? existing[0].name,
                status: payload?.status ?? existing[0].status,
                notes: payload?.notes !== undefined ? payload.notes : existing[0].notes,
                completedAt: payload?.completedAt ? new Date(payload.completedAt) : existing[0].completedAt,
                updatedAt: mutationDate,
              })
              .where(eq(workouts.id, entityId));
          }
        } else {
          // Insert
          await db.insert(workouts).values({
            id: entityId,
            userId,
            name: payload?.name || 'Workout',
            status: payload?.status || 'in_progress',
            startedAt: payload?.startedAt ? new Date(payload.startedAt) : mutationDate,
            completedAt: payload?.completedAt ? new Date(payload.completedAt) : null,
            notes: payload?.notes || null,
            createdAt: payload?.createdAt ? new Date(payload.createdAt) : mutationDate,
            updatedAt: payload?.updatedAt ? new Date(payload.updatedAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db
          .update(workouts)
          .set({ deletedAt: now })
          .where(and(eq(workouts.id, entityId), eq(workouts.userId, userId)));

        await db.insert(syncTombstones).values({
          userId,
          entityType: 'workout',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }

    case 'workout_exercise': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.id, entityId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(workoutExercises)
            .set({
              order: payload?.order ?? existing[0].order,
              notes: payload?.notes !== undefined ? payload.notes : existing[0].notes,
            })
            .where(eq(workoutExercises.id, entityId));
        } else if (payload?.workoutId && payload?.exerciseId) {
          await db.insert(workoutExercises).values({
            id: entityId,
            workoutId: payload.workoutId,
            exerciseId: payload.exerciseId,
            order: payload.order ?? 0,
            notes: payload.notes || null,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db.delete(workoutExercises).where(eq(workoutExercises.id, entityId));
        await db.insert(syncTombstones).values({
          userId,
          entityType: 'workout_exercise',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }

    case 'workout_set': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(workoutSets)
          .where(eq(workoutSets.id, entityId))
          .limit(1);

        if (existing.length > 0) {
          if (mutationDate >= existing[0].updatedAt) {
            await db
              .update(workoutSets)
              .set({
                setNumber: payload?.setNumber ?? existing[0].setNumber,
                type: payload?.type ?? existing[0].type,
                weightKg: payload?.weightKg !== undefined ? payload.weightKg : existing[0].weightKg,
                reps: payload?.reps !== undefined ? payload.reps : existing[0].reps,
                rpe: payload?.rpe !== undefined ? payload.rpe : existing[0].rpe,
                isCompleted: payload?.isCompleted !== undefined ? payload.isCompleted : existing[0].isCompleted,
                updatedAt: mutationDate,
              })
              .where(eq(workoutSets.id, entityId));
          }
        } else if (payload?.workoutExerciseId && payload?.setNumber !== undefined) {
          await db.insert(workoutSets).values({
            id: entityId,
            workoutExerciseId: payload.workoutExerciseId,
            setNumber: payload.setNumber,
            type: payload.type ?? 'normal',
            weightKg: payload.weightKg ?? null,
            reps: payload.reps ?? null,
            rpe: payload.rpe ?? null,
            isCompleted: payload.isCompleted ?? false,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : mutationDate,
            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db.delete(workoutSets).where(eq(workoutSets.id, entityId));
        await db.insert(syncTombstones).values({
          userId,
          entityType: 'workout_set',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }

    case 'template': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(templates)
          .where(and(eq(templates.id, entityId), eq(templates.userId, userId)))
          .limit(1);

        if (existing.length > 0) {
          if (mutationDate >= existing[0].updatedAt) {
            await db
              .update(templates)
              .set({
                name: payload?.name ?? existing[0].name,
                updatedAt: mutationDate,
              })
              .where(eq(templates.id, entityId));
          }
        } else {
          await db.insert(templates).values({
            id: entityId,
            userId,
            name: payload?.name || 'Template',
            createdAt: payload?.createdAt ? new Date(payload.createdAt) : mutationDate,
            updatedAt: payload?.updatedAt ? new Date(payload.updatedAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db
          .update(templates)
          .set({ deletedAt: now })
          .where(and(eq(templates.id, entityId), eq(templates.userId, userId)));

        await db.insert(syncTombstones).values({
          userId,
          entityType: 'template',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }

    case 'template_exercise': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(templateExercises)
          .where(eq(templateExercises.id, entityId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(templateExercises)
            .set({
              order: payload?.order ?? existing[0].order,
              defaultSets: payload?.defaultSets ?? existing[0].defaultSets,
            })
            .where(eq(templateExercises.id, entityId));
        } else if (payload?.templateId && payload?.exerciseId) {
          await db.insert(templateExercises).values({
            id: entityId,
            templateId: payload.templateId,
            exerciseId: payload.exerciseId,
            order: payload.order ?? 0,
            defaultSets: payload.defaultSets ?? 3,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db.delete(templateExercises).where(eq(templateExercises.id, entityId));
        await db.insert(syncTombstones).values({
          userId,
          entityType: 'template_exercise',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }

    case 'exercise': {
      if (operation === 'create' || operation === 'update') {
        const existing = await db
          .select()
          .from(exercises)
          .where(and(eq(exercises.id, entityId), eq(exercises.userId, userId)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(exercises)
            .set({
              name: payload?.name ?? existing[0].name,
              muscleGroup: payload?.muscleGroup ?? existing[0].muscleGroup,
              equipment: payload?.equipment ?? existing[0].equipment,
              defaultSets: payload?.defaultSets ?? existing[0].defaultSets,
            })
            .where(eq(exercises.id, entityId));
        } else {
          await db.insert(exercises).values({
            id: entityId,
            userId,
            name: payload?.name || 'Exercise',
            muscleGroup: payload?.muscleGroup || 'other',
            equipment: payload?.equipment || 'other',
            defaultSets: payload?.defaultSets || 3,
            createdAt: payload?.createdAt ? new Date(payload.createdAt) : mutationDate,
          });
        }
      } else if (operation === 'delete') {
        await db
          .update(exercises)
          .set({ deletedAt: now })
          .where(and(eq(exercises.id, entityId), eq(exercises.userId, userId)));

        await db.insert(syncTombstones).values({
          userId,
          entityType: 'exercise',
          entityId,
          deletedAt: now,
        });
      }
      break;
    }
  }
}
