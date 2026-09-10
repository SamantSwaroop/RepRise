import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { WeightUnit, RepRiseBackup } from '@reprise/shared';
import { displayWeight, escapeCSV } from '@reprise/shared';
import { getDatabase } from '../db/database';
import { getWorkouts, getWorkoutById } from '../db/workoutRepository';
import { getTemplates, getTemplateById } from '../db/templateRepository';
import { getOfflineExercises } from '../db/exerciseRepository';
import { useAuthStore } from '../stores/authStore';

// ─── CSV Generator ─────────────────────────────────────────────────

interface CSVRowRaw {
  started_at: string;
  workout_name: string;
  workout_notes: string | null;
  exercise_name: string | null;
  exercise_notes: string | null;
  set_number: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_completed: number;
}

export async function generateWorkoutCSV(userId: string, weightUnit: WeightUnit): Promise<string> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<CSVRowRaw>(
    `SELECT
       w.started_at,
       w.name as workout_name,
       w.notes as workout_notes,
       COALESCE(e.name, 'Unknown Exercise') as exercise_name,
       we.notes as exercise_notes,
       ws.set_number,
       ws.type as set_type,
       ws.weight_kg,
       ws.reps,
       ws.rpe,
       ws.is_completed
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE w.user_id = ?
     ORDER BY w.started_at DESC, we."order" ASC, ws.set_number ASC`,
    [userId],
  );

  const headers = [
    'Date',
    'Workout',
    'Exercise',
    'Set',
    'Type',
    `Weight (${weightUnit})`,
    'Reps',
    'RPE',
    'Completed',
    'Workout Notes',
    'Exercise Notes',
  ];

  const lines: string[] = [headers.map(escapeCSV).join(',')];

  for (const row of rows) {
    const convertedWeight = displayWeight(row.weight_kg, weightUnit);
    const line = [
      escapeCSV(row.started_at),
      escapeCSV(row.workout_name),
      escapeCSV(row.exercise_name),
      escapeCSV(row.set_number),
      escapeCSV(row.set_type),
      escapeCSV(convertedWeight != null ? convertedWeight : ''),
      escapeCSV(row.reps != null ? row.reps : ''),
      escapeCSV(row.rpe != null ? row.rpe : ''),
      escapeCSV(row.is_completed === 1 ? 'true' : 'false'),
      escapeCSV(row.workout_notes || ''),
      escapeCSV(row.exercise_notes || ''),
    ].join(',');
    lines.push(line);
  }

  return lines.join('\n');
}

// ─── JSON Backup Generator ─────────────────────────────────────────

export async function generateBackupJSON(userId: string): Promise<string> {
  const user = useAuthStore.getState().user;

  // 1. Fetch full workouts
  const basicWorkouts = await getWorkouts(userId);
  const fullWorkouts = await Promise.all(
    basicWorkouts.map(async (w) => (await getWorkoutById(w.id))!),
  );

  // 2. Fetch full templates
  const basicTemplates = await getTemplates(userId);
  const fullTemplates = await Promise.all(
    basicTemplates.map(async (t) => (await getTemplateById(t.id))!),
  );

  // 3. Fetch custom and offline exercises
  const exercises = await getOfflineExercises(userId);

  const backupPayload: RepRiseBackup = {
    version: 1,
    appName: 'RepRise',
    exportedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        }
      : null,
    workouts: fullWorkouts.filter(Boolean),
    templates: fullTemplates.filter(Boolean),
    exercises,
  };

  return JSON.stringify(backupPayload, null, 2);
}

// ─── File Exporter & Sharer ─────────────────────────────────────────

export async function exportDataFile(
  content: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  // Web browser download
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Native mobile save / share
  try {
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export ${filename}`,
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
      });
    } else {
      await Share.share({
        title: filename,
        message: content,
      });
    }
  } catch (err: any) {
    console.warn('File share failed, falling back to text share:', err);
    await Share.share({
      title: filename,
      message: content,
    });
  }
}
