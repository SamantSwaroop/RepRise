import * as Crypto from 'expo-crypto';
import type { Template, TemplateExercise, Workout } from '@reprise/shared';
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

interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  order: number;
  default_sets: number;
  created_at: string;
}

function mapTemplateRow(row: TemplateRow): Omit<Template, 'exercises'> {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateExerciseRow(row: TemplateExerciseRow): TemplateExercise {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    order: row.order,
    defaultSets: row.default_sets,
    createdAt: row.created_at,
  };
}

// ─── Template CRUD ─────────────────────────────────────────────────

export async function createTemplate(userId: string, name: string): Promise<Template> {
  const db = await getDatabase();
  const id = uuid();
  const now = nowISO();

  await db.runAsync(
    `INSERT INTO templates (id, user_id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, name, now, now],
  );

  const template: Template = {
    id,
    userId,
    name,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  };

  await enqueueSyncMutation(userId, 'template', id, 'create', template);

  return template;
}

export async function getTemplates(userId: string): Promise<(Omit<Template, 'exercises'> & { exerciseCount: number })[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TemplateRow & { exercise_count: number }>(
    `SELECT t.*, COUNT(te.id) as exercise_count
     FROM templates t
     LEFT JOIN template_exercises te ON te.template_id = t.id
     WHERE t.user_id = ?
     GROUP BY t.id
     ORDER BY t.updated_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    ...mapTemplateRow(row),
    exerciseCount: row.exercise_count,
  }));
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<TemplateRow>(
    `SELECT * FROM templates WHERE id = ?`,
    [templateId],
  );

  if (!row) return null;

  const template = mapTemplateRow(row);

  const exerciseRows = await db.getAllAsync<TemplateExerciseRow>(
    `SELECT * FROM template_exercises WHERE template_id = ? ORDER BY "order" ASC`,
    [templateId],
  );

  return {
    ...template,
    exercises: exerciseRows.map(mapTemplateExerciseRow),
  };
}

export async function updateTemplate(
  templateId: string,
  data: { name?: string },
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();

  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM templates WHERE id = ?`,
    [templateId],
  );

  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }

  values.push(templateId);

  await db.runAsync(
    `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'template', templateId, 'update', {
      ...data,
      updatedAt: now,
    });
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM templates WHERE id = ?`,
    [templateId],
  );

  await db.runAsync(`DELETE FROM templates WHERE id = ?`, [templateId]);

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'template', templateId, 'delete');
  }
}

// ─── Template Exercise CRUD ────────────────────────────────────────

export async function addExerciseToTemplate(
  templateId: string,
  exerciseId: string,
  defaultSets: number = 3,
  order?: number,
): Promise<TemplateExercise> {
  const db = await getDatabase();
  const id = uuid();
  const now = nowISO();

  const ownerRow = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM templates WHERE id = ?`,
    [templateId],
  );

  // Auto-determine order if not provided
  let actualOrder = order;
  if (actualOrder === undefined) {
    const result = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM template_exercises WHERE template_id = ?`,
      [templateId],
    );
    actualOrder = result?.cnt ?? 0;
  }

  await db.runAsync(
    `INSERT INTO template_exercises (id, template_id, exercise_id, "order", default_sets, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, templateId, exerciseId, actualOrder, defaultSets, now],
  );

  // Touch the template's updated_at
  await db.runAsync(
    `UPDATE templates SET updated_at = ? WHERE id = ?`,
    [now, templateId],
  );

  const te: TemplateExercise = {
    id,
    templateId,
    exerciseId,
    order: actualOrder,
    defaultSets,
    createdAt: now,
  };

  if (ownerRow?.user_id) {
    await enqueueSyncMutation(ownerRow.user_id, 'template_exercise', id, 'create', te);
    await enqueueSyncMutation(ownerRow.user_id, 'template', templateId, 'update', {
      updatedAt: now,
    });
  }

  return te;
}

export async function removeExerciseFromTemplate(templateExerciseId: string): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string; template_id: string }>(
    `SELECT t.user_id, te.template_id
     FROM templates t
     JOIN template_exercises te ON te.template_id = t.id
     WHERE te.id = ?`,
    [templateExerciseId],
  );

  await db.runAsync(`DELETE FROM template_exercises WHERE id = ?`, [templateExerciseId]);

  if (ownerRow?.template_id) {
    const now = nowISO();
    await db.runAsync(`UPDATE templates SET updated_at = ? WHERE id = ?`, [now, ownerRow.template_id]);
    if (ownerRow.user_id) {
      await enqueueSyncMutation(ownerRow.user_id, 'template_exercise', templateExerciseId, 'delete');
      await enqueueSyncMutation(ownerRow.user_id, 'template', ownerRow.template_id, 'update', {
        updatedAt: now,
      });
    }
  }
}

export async function reorderTemplateExercises(
  templateId: string,
  orderedIds: string[],
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();

  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync(
      `UPDATE template_exercises SET "order" = ? WHERE id = ?`,
      [i, orderedIds[i]],
    );
  }

  await db.runAsync(
    `UPDATE templates SET updated_at = ? WHERE id = ?`,
    [now, templateId],
  );
}

export async function updateTemplateExerciseSets(
  templateExerciseId: string,
  defaultSets: number,
): Promise<void> {
  const db = await getDatabase();
  const ownerRow = await db.getFirstAsync<{ user_id: string; template_id: string }>(
    `SELECT t.user_id, te.template_id
     FROM templates t
     JOIN template_exercises te ON te.template_id = t.id
     WHERE te.id = ?`,
    [templateExerciseId],
  );

  await db.runAsync(
    `UPDATE template_exercises SET default_sets = ? WHERE id = ?`,
    [defaultSets, templateExerciseId],
  );

  if (ownerRow?.template_id) {
    const now = nowISO();
    await db.runAsync(
      `UPDATE templates SET updated_at = ? WHERE id = ?`,
      [now, ownerRow.template_id],
    );
    if (ownerRow.user_id) {
      await enqueueSyncMutation(ownerRow.user_id, 'template_exercise', templateExerciseId, 'update', {
        defaultSets,
      });
      await enqueueSyncMutation(ownerRow.user_id, 'template', ownerRow.template_id, 'update', {
        updatedAt: now,
      });
    }
  }
}

// ─── Save Completed Workout as Template ─────────────────────────────

export async function createTemplateFromWorkout(
  userId: string,
  workout: Workout,
  templateName?: string,
): Promise<Template> {
  const name = templateName || `${workout.name} Template`;
  const template = await createTemplate(userId, name);

  if (workout.exercises && workout.exercises.length > 0) {
    for (let i = 0; i < workout.exercises.length; i++) {
      const we = workout.exercises[i];
      const completedSetsCount = we.sets?.filter((s) => s.isCompleted)?.length || 3;
      await addExerciseToTemplate(template.id, we.exerciseId, completedSetsCount, i);
    }
  }

  return (await getTemplateById(template.id))!;
}

export async function startWorkoutFromTemplate(
  userId: string,
  templateId: string,
): Promise<string> {
  // We import lazily to avoid circular deps
  const { createWorkout, addExerciseToWorkout } = await import('./workoutRepository');

  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const workout = await createWorkout(userId, template.name);

  for (const te of template.exercises) {
    await addExerciseToWorkout(
      workout.id,
      te.exerciseId,
      undefined,
      te.defaultSets,
    );
  }

  return workout.id;
}

// ─── Server Reconciliation ─────────────────────────────────────────

export async function upsertTemplatesFromServer(serverTemplates: Template[]): Promise<void> {
  if (serverTemplates.length === 0) return;
  const db = await getDatabase();

  for (const t of serverTemplates) {
    await db.runAsync(
      `INSERT INTO templates (id, user_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at`,
      [t.id, t.userId, t.name, t.createdAt, t.updatedAt],
    );

    for (const te of t.exercises || []) {
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, "order", default_sets, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           "order" = excluded."order",
           default_sets = excluded.default_sets`,
        [te.id, te.templateId, te.exerciseId, te.order, te.defaultSets, te.createdAt],
      );
    }
  }
}

export async function deleteTemplatesFromServer(deletedIds: string[]): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = deletedIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM templates WHERE id IN (${placeholders})`, deletedIds);
}

export async function deleteTemplateExercisesFromServer(deletedIds: string[]): Promise<void> {
  if (deletedIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = deletedIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM template_exercises WHERE id IN (${placeholders})`, deletedIds);
}
