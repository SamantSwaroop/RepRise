import * as Crypto from 'expo-crypto';
import type { Exercise, CreateExerciseInput, UpdateExerciseInput } from '@reprise/shared';
import { getDatabase } from './database';
import { enqueueSyncMutation } from './syncQueue';

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  user_id: string | null;
  default_sets: number;
  created_at: string;
}

function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as any,
    equipment: (row.equipment as any) || null,
    userId: row.user_id,
    defaultSets: row.default_sets,
    createdAt: row.created_at,
  };
}

export async function getOfflineExercises(userId?: string, search?: string): Promise<Exercise[]> {
  const db = await getDatabase();
  let query = `SELECT * FROM exercises WHERE 1=1`;
  const params: any[] = [];

  if (userId) {
    query += ` AND (user_id IS NULL OR user_id = ?)`;
    params.push(userId);
  } else {
    query += ` AND user_id IS NULL`;
  }

  if (search && search.trim().length > 0) {
    query += ` AND name LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  query += ` ORDER BY name ASC`;

  const rows = await db.getAllAsync<ExerciseRow>(query, params);
  return rows.map(mapExerciseRow);
}

export async function upsertOfflineExercises(exercises: Exercise[]): Promise<void> {
  if (exercises.length === 0) return;
  const db = await getDatabase();

  for (const ex of exercises) {
    await db.runAsync(
      `INSERT INTO exercises (id, name, muscle_group, equipment, user_id, default_sets, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         muscle_group = excluded.muscle_group,
         equipment = excluded.equipment,
         user_id = excluded.user_id,
         default_sets = excluded.default_sets`,
      [
        ex.id,
        ex.name,
        ex.muscleGroup,
        ex.equipment ?? null,
        ex.userId ?? null,
        ex.defaultSets ?? 3,
        ex.createdAt,
      ],
    );
  }
}

export async function createOfflineExercise(userId: string, input: CreateExerciseInput): Promise<Exercise> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const exercise: Exercise = {
    id,
    name: input.name,
    muscleGroup: input.muscleGroup,
    equipment: input.equipment ?? null,
    userId,
    defaultSets: input.defaultSets ?? 3,
    createdAt: now,
  };

  await db.runAsync(
    `INSERT INTO exercises (id, name, muscle_group, equipment, user_id, default_sets, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      exercise.id,
      exercise.name,
      exercise.muscleGroup,
      exercise.equipment ?? null,
      exercise.userId ?? null,
      exercise.defaultSets ?? 3,
      exercise.createdAt,
    ],
  );

  await enqueueSyncMutation(userId, 'exercise', id, 'create', exercise);

  return exercise;
}

export async function updateOfflineExercise(
  userId: string,
  id: string,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id = ? AND user_id = ?`,
    [id, userId],
  );

  if (!existing) {
    throw new Error('Exercise not found or cannot edit global exercise');
  }

  const updatedName = input.name ?? existing.name;
  const updatedMuscle = input.muscleGroup ?? existing.muscle_group;
  const updatedEquipment = input.equipment !== undefined ? input.equipment : existing.equipment;
  const updatedSets = input.defaultSets !== undefined ? input.defaultSets : existing.default_sets;

  await db.runAsync(
    `UPDATE exercises SET name = ?, muscle_group = ?, equipment = ?, default_sets = ? WHERE id = ?`,
    [updatedName, updatedMuscle, updatedEquipment ?? null, updatedSets ?? 3, id],
  );

  const updated: Exercise = {
    id,
    name: updatedName,
    muscleGroup: updatedMuscle as any,
    equipment: updatedEquipment as any,
    userId,
    defaultSets: updatedSets,
    createdAt: existing.created_at,
  };

  await enqueueSyncMutation(userId, 'exercise', id, 'update', updated);

  return updated;
}

export async function deleteOfflineExercise(userId: string, id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM exercises WHERE id = ? AND user_id = ?`, [id, userId]);
  await enqueueSyncMutation(userId, 'exercise', id, 'delete');
}

export async function getOfflineExerciseCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM exercises`);
  return row?.cnt ?? 0;
}
