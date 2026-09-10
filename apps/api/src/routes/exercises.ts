import { Router } from 'express';
import { eq, or, isNull, and, ilike } from 'drizzle-orm';

import { createExerciseSchema, updateExerciseSchema } from '@reprise/shared';
import { db } from '../db/index.js';
import { exercises } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const exercisesRouter = Router();

// All exercise routes require authentication.
exercisesRouter.use(requireAuth);

// ─── GET / — list exercises (global + user's custom) ───────────────

exercisesRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const search = req.query.search as string | undefined;

    const query = db.select().from(exercises);

    const conditions = [
      or(isNull(exercises.userId), eq(exercises.userId, userId)),
    ];

    if (search) {
      conditions.push(ilike(exercises.name, `%${search}%`));
    }

    const results = await query.where(and(...conditions));

    res.json({
      data: results.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('List exercises error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── GET /:id — single exercise ────────────────────────────────────

exercisesRouter.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;

    const [exercise] = await db.select()
      .from(exercises)
      .where(
        and(
          eq(exercises.id, req.params.id),
          or(isNull(exercises.userId), eq(exercises.userId, userId)),
        ),
      )
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: { code: 'not_found', message: 'Exercise not found' } });
      return;
    }

    res.json({
      data: { ...exercise, createdAt: exercise.createdAt.toISOString() },
    });
  } catch (err) {
    console.error('Get exercise error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── POST / — create custom exercise ──────────────────────────────

exercisesRouter.post('/', async (req, res) => {
  try {
    const body = createExerciseSchema.parse(req.body);
    const userId = req.user!.id;

    const [exercise] = await db.insert(exercises).values({
      name: body.name,
      muscleGroup: body.muscleGroup,
      equipment: body.equipment ?? null,
      userId,
      defaultSets: body.defaultSets ?? 3,
    }).returning();

    res.status(201).json({
      data: { ...exercise, createdAt: exercise.createdAt.toISOString() },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Create exercise error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── PUT /:id — update own custom exercise ─────────────────────────

exercisesRouter.put('/:id', async (req, res) => {
  try {
    const body = updateExerciseSchema.parse(req.body);
    const userId = req.user!.id;

    // Only allow updating user's own exercises (not global ones).
    const [existing] = await db.select()
      .from(exercises)
      .where(and(eq(exercises.id, req.params.id), eq(exercises.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: { code: 'not_found', message: 'Exercise not found or cannot be edited' } });
      return;
    }

    const [updated] = await db.update(exercises)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.muscleGroup !== undefined && { muscleGroup: body.muscleGroup }),
        ...(body.equipment !== undefined && { equipment: body.equipment ?? null }),
        ...(body.defaultSets !== undefined && { defaultSets: body.defaultSets }),
      })
      .where(eq(exercises.id, req.params.id))
      .returning();

    res.json({
      data: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      res.status(400).json({ error: { code: 'validation_error', message: err.errors } });
      return;
    }
    console.error('Update exercise error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});

// ─── DELETE /:id — delete own custom exercise ──────────────────────

exercisesRouter.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Only allow deleting user's own exercises (not global ones).
    const [existing] = await db.select()
      .from(exercises)
      .where(and(eq(exercises.id, req.params.id), eq(exercises.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: { code: 'not_found', message: 'Exercise not found or cannot be deleted' } });
      return;
    }

    await db.delete(exercises).where(eq(exercises.id, req.params.id));

    res.json({ data: { message: 'Exercise deleted' } });
  } catch (err) {
    console.error('Delete exercise error:', err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  }
});
