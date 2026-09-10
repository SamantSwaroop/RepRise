import * as Crypto from 'expo-crypto';
import type { Workout, WorkoutExercise, WorkoutSet, WorkoutStatus, SetType } from '@reprise/shared';
import { generateDefaultWorkoutName } from '@reprise/shared';
import { getDatabase } from './database';
import { enqueueSyncMutation } from './syncQueue';

// ─── ID generation ─────────────────────────────────────────────────

function uuid(): string {
  return Crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Row → Domain mappers ──────────────────────────────────────────

interface WorkoutRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  order: number;
  notes: string | null;
  created_at: string;
}

interface WorkoutSetRow {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_completed: number; // SQLite boolean: 0 | 1
  created_at: string;
  updated_at: string;
}

function mapWorkoutRow(row: WorkoutRow): Omit<Workout, 'exercises'> {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status as WorkoutStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSetRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    type: row.type as SetType,
    weightKg: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Workout CRUD ──────────────────────────────────────────────────

export async function createWorkout(userId: string, name?: string): Promise<Workout> {
  const db = await getDatabase();
  const id = uuid();
  const now = nowISO();
  const workoutName = name || generateDefaultWorkoutName();

  await db.runAsync(
    `INSERT INTO workouts (id, user_id, name, status, started_at, created_at, updated_at)
     VALUES (?, ?, ?, 'in_progress', ?, ?, ?)`,
    [id, userId, workoutName, now, now, now],
  );

  const workout: Workout = {
    id,
    userId,
    name: workoutName,
    status: 'in_progress',
    startedAt: now,
    completedAt: null,
    notes: null,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  };

  await enqueueSyncMutation(userId, 'workout', id, 'create', workout);

  return workout;
}

export async function getWorkouts(userId: string): Promise<Omit<Workout, 'exercises'>[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE user_id = ? ORDER BY started_at DESC`,
    [userId],
  );
  return rows.map(mapWorkoutRow);
}

export async function getWorkoutById(workoutId: string): Promise<Workout | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE id = ?`,
    [workoutId],
  );

  if (!row) return null;

  const workout = mapWorkoutRow(row);

  // Load exercises
  const exerciseRows = await db.getAllAsync<WorkoutExerciseRow>(
    `SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY "order" ASC`,
    [workoutId],
  );

  const exercises: WorkoutExercise[] = [];

  for (const we of exerciseRows) {
    const setRows = await db.getAllAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC`,
      [we.id],
    );

    exercises.push({
      id: we.id,
      workoutId: we.workout_id,
      exerciseId: we.exercise_id,
      order: we.order,
      notes: we.notes,
      sets: setRows.map(mapSetRow),
      createdAt: we.created_at,
    });
  }

  return { ...workout, exercises };
}

export async function updateWorkout(
  workoutId: string,
  data: {
    name?: string;
    status?: WorkoutStatus;
    notes?: string | null;
    completedAt?: string | null;
  },
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();

  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM workouts WHERE id = ?`,
    [workoutId],
  );

  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }
  if (data.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(data.completedAt);
  }

  values.push(workoutId);

  await db.runAsync(
    `UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout', workoutId, 'update', {
      ...data,
      updatedAt: now,
    });
  }
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM workouts WHERE id = ?`,
    [workoutId],
  );

  // CASCADE will handle child rows due to PRAGMA foreign_keys = ON
  await db.runAsync(`DELETE FROM workouts WHERE id = ?`, [workoutId]);

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout', workoutId, 'delete');
  }
}

// ─── Workout Exercise CRUD ─────────────────────────────────────────

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  order?: number,
  defaultSetsCount: number = 3,
): Promise<WorkoutExercise> {
  const db = await getDatabase();
  const id = uuid();
  const now = nowISO();

  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM workouts WHERE id = ?`,
    [workoutId],
  );

  // Auto-determine order if not provided
  let actualOrder = order;
  if (actualOrder === undefined) {
    const result = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM workout_exercises WHERE workout_id = ?`,
      [workoutId],
    );
    actualOrder = result?.cnt ?? 0;
  }

  await db.runAsync(
    `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, workoutId, exerciseId, actualOrder, now],
  );

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout_exercise', id, 'create', {
      id,
      workoutId,
      exerciseId,
      order: actualOrder,
      notes: null,
      createdAt: now,
    });
  }

  // Pre-populate default sets
  const initialSets: WorkoutSet[] = [];
  const count = Math.max(1, Math.min(defaultSetsCount, 20));
  for (let i = 1; i <= count; i++) {
    const setId = uuid();
    await db.runAsync(
      `INSERT INTO workout_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, rpe, is_completed, created_at, updated_at)
       VALUES (?, ?, ?, 'normal', NULL, NULL, NULL, 0, ?, ?)`,
      [setId, id, i, now, now],
    );
    const setObj: WorkoutSet = {
      id: setId,
      workoutExerciseId: id,
      setNumber: i,
      type: 'normal',
      weightKg: null,
      reps: null,
      rpe: null,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
    initialSets.push(setObj);

    if (ownerRow?.user_id) {
      await enqueueSyncMutation(ownerRow.user_id, 'workout_set', setId, 'create', setObj);
    }
  }

  return {
    id,
    workoutId,
    exerciseId,
    order: actualOrder,
    notes: null,
    sets: initialSets,
    createdAt: now,
  };
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT w.user_id FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id WHERE we.id = ?`,
    [workoutExerciseId],
  );

  await db.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [workoutExerciseId]);

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout_exercise', workoutExerciseId, 'delete');
  }
}

// ─── Set CRUD ──────────────────────────────────────────────────────

export async function upsertSet(
  workoutExerciseId: string,
  data: {
    id?: string;
    type?: SetType;
    weightKg?: number | null;
    reps?: number | null;
    rpe?: number | null;
    isCompleted?: boolean;
  },
): Promise<WorkoutSet> {
  const db = await getDatabase();
  const now = nowISO();

  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT w.user_id FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id WHERE we.id = ?`,
    [workoutExerciseId],
  );

  if (data.id) {
    // Update existing set
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.weightKg !== undefined) { fields.push('weight_kg = ?'); values.push(data.weightKg); }
    if (data.reps !== undefined) { fields.push('reps = ?'); values.push(data.reps); }
    if (data.rpe !== undefined) { fields.push('rpe = ?'); values.push(data.rpe); }
    if (data.isCompleted !== undefined) { fields.push('is_completed = ?'); values.push(data.isCompleted ? 1 : 0); }

    values.push(data.id);
    await db.runAsync(`UPDATE workout_sets SET ${fields.join(', ')} WHERE id = ?`, values);

    const row = await db.getFirstAsync<WorkoutSetRow>(
      `SELECT * FROM workout_sets WHERE id = ?`,
      [data.id],
    );

    const mapped = mapSetRow(row!);
    if (ownerRow?.user_id) {
      await enqueueSyncMutation(ownerRow.user_id, 'workout_set', data.id, 'update', mapped);
    }
    return mapped;
  }

  // Insert new set
  const id = uuid();
  const result = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM workout_sets WHERE workout_exercise_id = ?`,
    [workoutExerciseId],
  );
  const setNumber = (result?.cnt ?? 0) + 1;

  await db.runAsync(
    `INSERT INTO workout_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, rpe, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      workoutExerciseId,
      setNumber,
      data.type ?? 'normal',
      data.weightKg ?? null,
      data.reps ?? null,
      data.rpe ?? null,
      data.isCompleted ? 1 : 0,
      now,
      now,
    ],
  );

  const newSet: WorkoutSet = {
    id,
    workoutExerciseId,
    setNumber,
    type: data.type ?? 'normal',
    weightKg: data.weightKg ?? null,
    reps: data.reps ?? null,
    rpe: data.rpe ?? null,
    isCompleted: data.isCompleted ?? false,
    createdAt: now,
    updatedAt: now,
  };

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout_set', id, 'create', newSet);
  }

  return newSet;
}

export async function deleteSet(setId: string): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT w.user_id FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id JOIN workout_sets ws ON ws.workout_exercise_id = we.id WHERE ws.id = ?`,
    [setId],
  );

  await db.runAsync(`DELETE FROM workout_sets WHERE id = ?`, [setId]);

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'workout_set', setId, 'delete');
  }
}

// ─── Previous Performance ──────────────────────────────────────────

export async function getPreviousSetsForExercise(
  userId: string,
  exerciseId: string,
  currentWorkoutId: string,
): Promise<WorkoutSet[]> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ we_id: string }>(
    `SELECT we.id as we_id
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = ?
       AND we.exercise_id = ?
       AND w.status = 'completed'
       AND w.id != ?
     ORDER BY w.started_at DESC
     LIMIT 1`,
    [userId, exerciseId, currentWorkoutId],
  );

  if (!row) return [];

  const setRows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC`,
    [row.we_id],
  );

  return setRows.map(mapSetRow);
}

// ─── Server Reconciliation ─────────────────────────────────────────

export async function upsertWorkoutsFromServer(serverWorkouts: Workout[]): Promise<void> {
  if (serverWorkouts.length === 0) return;
  const db = await getDatabase();

  for (const w of serverWorkouts) {
    await db.runAsync(
      `INSERT INTO workouts (id, user_id, name, status, started_at, completed_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         started_at = excluded.started_at,
         completed_at = excluded.completed_at,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [
        w.id,
        w.userId,
        w.name,
        w.status,
        w.startedAt,
        w.completedAt ?? null,
        w.notes ?? null,
        w.createdAt,
        w.updatedAt,
      ],
    );

    for (const we of w.exercises || []) {
      await db.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           "order" = excluded."order",
           notes = excluded.notes`,
        [we.id, we.workoutId, we.exerciseId, we.order, we.notes ?? null, we.createdAt],
      );

      for (const s of we.sets || []) {
        await db.runAsync(
          `INSERT INTO workout_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, rpe, is_completed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             set_number = excluded.set_number,
             type = excluded.type,
             weight_kg = excluded.weight_kg,
             reps = excluded.reps,
             rpe = excluded.rpe,
             is_completed = excluded.is_completed,
             updated_at = excluded.updated_at`,
          [
            s.id,
            s.workoutExerciseId,
            s.setNumber,
            s.type,
            s.weightKg ?? null,
            s.reps ?? null,
            s.rpe ?? null,
            s.isCompleted ? 1 : 0,
            s.createdAt,
            s.updatedAt,
          ],
        );
      }
    }
  }
}

export async function deleteWorkoutsFromServer(deletedIds: string[]): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = deletedIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM workouts WHERE id IN (${placeholders})`, deletedIds);
}

export async function deleteWorkoutExercisesFromServer(deletedIds: string[]): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = deletedIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM workout_exercises WHERE id IN (${placeholders})`, deletedIds);
}

export async function deleteSetsFromServer(deletedIds: string[]): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = deletedIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM workout_sets WHERE id IN (${placeholders})`, deletedIds);
}
