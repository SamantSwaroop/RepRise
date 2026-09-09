import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';

import {
  createWorkoutSchema,
  updateWorkoutSchema,
  addWorkoutExerciseSchema,
  createSetSchema,
  updateSetSchema,
  generateDefaultWorkoutName,
} from '@reprise/shared';
import { db } from '../db/index.js';
import { workouts, workoutExercises, workoutSets, exercises } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const workoutsRouter = Router();

// All workout routes require authentication.
workoutsRouter.use(requireAuth);

// ─── Helpers ───────────────────────────────────────────────────────

function ts(d: Date) {
  return d.toISOString();
}

async function loadFullWorkout(workoutId: string) {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId)).limit(1);
  if (!workout) return null;

  const wExercises = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.order);

  const exerciseIds = wExercises.map((we) => we.exerciseId);

  const exerciseRows =
    exerciseIds.length > 0
      ? await db.select().from(exercises).where(
          // Use in-style lookup
          eq(exercises.id, exerciseIds[0]) // will be replaced below
        )
      : [];

  // Fetch all exercises referenced
  const allExercises =
    exerciseIds.length > 0
      ? await db.select().from(exercises)
      : [];
  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));

  const weSets = await Promise.all(
    wExercises.map(async (we) => {
      const sets = await db
        .select()
        .from(workoutSets)
        .where(eq(workoutSets.workoutExerciseId, we.id))
        .orderBy(workoutSets.setNumber);

      const exercise = exerciseMap.get(we.exerciseId);

      return {
        id: we.id,
        workoutId: we.workoutId,
        exerciseId: we.exerciseId,
        order: we.order,
        notes: we.notes,
        exercise: exercise
          ? { ...exercise, createdAt: ts(exercise.createdAt) }
          : undefined,
        sets: sets.map((s) => ({
          id: s.id,
          workoutExerciseId: s.workoutExerciseId,
          setNumber: s.setNumber,
          type: s.type,
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe,
          isCompleted: s.isCompleted,
          createdAt: ts(s.createdAt),
          updatedAt: ts(s.updatedAt),
        })),
        createdAt: ts(we.createdAt),
      };
    }),
  );

  return {
    id: workout.id,
    userId: workout.userId,
    name: workout.name,
    status: workout.status,
    startedAt: ts(workout.startedAt),
    completedAt: workout.completedAt ? ts(workout.completedAt) : null,
    notes: workout.notes,
    exercises: weSets,
    createdAt: ts(workout.createdAt),
    updatedAt: ts(workout.updatedAt),
  };
}

// ─── POST / — create workout ──────────────────────────────────────

workoutsRouter.post('/', async (req, res) => {
  try {
    const body = createWorkoutSchema.parse(req.body);
    const userId = req.user!.id;

    const [workout] = await db
      .insert(workouts)
      .values({
        userId,
        name: body.name || generateDefaultWorkoutName(),
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      data: {
        ...workout,
        startedAt: ts(workout.startedAt),
        completedAt: null,
        exercises: [],
        createdAt: ts(workout.createdAt),
        updatedAt: ts(workout.updatedAt),
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Create workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── GET / — list workouts ────────────────────────────────────────

workoutsRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const results = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.startedAt));

    res.json({
      data: results.map((w) => ({
        ...w,
        startedAt: ts(w.startedAt),
        completedAt: w.completedAt ? ts(w.completedAt) : null,
        createdAt: ts(w.createdAt),
        updatedAt: ts(w.updatedAt),
      })),
    });
  } catch (err) {
    console.error('List workouts error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── GET /:id — single workout with exercises + sets ──────────────

workoutsRouter.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const workout = await loadFullWorkout(req.params.id);

    if (!workout || workout.userId !== userId) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    res.json({ data: workout });
  } catch (err) {
    console.error('Get workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── PATCH /:id — update workout ──────────────────────────────────

workoutsRouter.patch('/:id', async (req, res) => {
  try {
    const body = updateWorkoutSchema.parse(req.body);
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    const [updated] = await db
      .update(workouts)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.completedAt !== undefined && {
          completedAt: body.completedAt ? new Date(body.completedAt) : null,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(workouts.id, req.params.id))
      .returning();

    res.json({
      data: {
        ...updated,
        startedAt: ts(updated.startedAt),
        completedAt: updated.completedAt ? ts(updated.completedAt) : null,
        createdAt: ts(updated.createdAt),
        updatedAt: ts(updated.updatedAt),
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Update workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── DELETE /:id — delete workout ─────────────────────────────────

workoutsRouter.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    await db.delete(workouts).where(eq(workouts.id, req.params.id));

    res.json({ data: { message: 'Workout deleted' } });
  } catch (err) {
    console.error('Delete workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST /:id/exercises — add exercise to workout ────────────────

workoutsRouter.post('/:id/exercises', async (req, res) => {
  try {
    const body = addWorkoutExerciseSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify workout ownership
    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, userId)))
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    // Determine order if not provided
    let order = body.order;
    if (order === undefined) {
      const existing = await db
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, req.params.id));
      order = existing.length;
    }

    const [we] = await db
      .insert(workoutExercises)
      .values({
        workoutId: req.params.id,
        exerciseId: body.exerciseId,
        order,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      data: {
        ...we,
        sets: [],
        createdAt: ts(we.createdAt),
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Add exercise to workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── DELETE /:wid/exercises/:eid — remove exercise from workout ───

workoutsRouter.delete('/:wid/exercises/:eid', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Verify workout ownership
    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, req.params.wid), eq(workouts.userId, userId)))
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    await db.delete(workoutExercises).where(eq(workoutExercises.id, req.params.eid));

    res.json({ data: { message: 'Exercise removed from workout' } });
  } catch (err) {
    console.error('Remove exercise from workout error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST /:wid/exercises/:eid/sets — add set ─────────────────────

workoutsRouter.post('/:wid/exercises/:eid/sets', async (req, res) => {
  try {
    const body = createSetSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify workout ownership
    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, req.params.wid), eq(workouts.userId, userId)))
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: { code: 'not_found', message: 'Workout not found' } });
      return;
    }

    // Determine set number
    const existingSets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseId, req.params.eid));
    const setNumber = existingSets.length + 1;

    const [set] = await db
      .insert(workoutSets)
      .values({
        workoutExerciseId: req.params.eid,
        setNumber,
        type: body.type ?? 'normal',
        weightKg: body.weightKg ?? null,
        reps: body.reps ?? null,
        rpe: body.rpe ?? null,
        isCompleted: body.isCompleted ?? false,
      })
      .returning();

    res.status(201).json({
      data: {
        ...set,
        createdAt: ts(set.createdAt),
        updatedAt: ts(set.updatedAt),
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Add set error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── PUT /:wid/exercises/:eid/sets/:sid — update set ──────────────

workoutsRouter.put('/:wid/exercises/:eid/sets/:sid', async (req, res) => {
  try {
    const body = updateSetSchema.parse(req.body);

    const [updated] = await db
      .update(workoutSets)
      .set({
        ...(body.type !== undefined && { type: body.type }),
        ...(body.weightKg !== undefined && { weightKg: body.weightKg }),
        ...(body.reps !== undefined && { reps: body.reps }),
        ...(body.rpe !== undefined && { rpe: body.rpe }),
        ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
        updatedAt: new Date(),
      })
      .where(eq(workoutSets.id, req.params.sid))
      .returning();

    if (!updated) {
      res.status(404).json({ error: { code: 'not_found', message: 'Set not found' } });
      return;
    }

    res.json({
      data: {
        ...updated,
        createdAt: ts(updated.createdAt),
        updatedAt: ts(updated.updatedAt),
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Update set error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── DELETE /:wid/exercises/:eid/sets/:sid — delete set ───────────

workoutsRouter.delete('/:wid/exercises/:eid/sets/:sid', async (req, res) => {
  try {
    await db.delete(workoutSets).where(eq(workoutSets.id, req.params.sid));
    res.json({ data: { message: 'Set deleted' } });
  } catch (err) {
    console.error('Delete set error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});
