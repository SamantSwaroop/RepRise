import type {
  DashboardStats,
  WeeklyVolumePoint,
  ExerciseProgressPoint,
  LoggedExerciseInfo,
  TimeRange,
} from '@reprise/shared';
import { getDatabase } from './database';

// ─── 1RM Calculation (Epley Formula) ─────────────────────────────────

export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  // Standard Epley formula: weight * (1 + reps / 30)
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ─── Date Helpers ───────────────────────────────────────────────────

function getDaysForRange(range: TimeRange): number {
  switch (range) {
    case '1M':
      return 30;
    case '3M':
      return 90;
    case '6M':
      return 180;
    case '1Y':
      return 365;
    case 'ALL':
    default:
      return 9999;
  }
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday is start of week: 1 -> 0, 0 (Sunday) -> 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const db = await getDatabase();

  // Lifetime completed workouts count & duration
  const workoutStats = await db.getFirstAsync<{
    totalWorkouts: number;
    totalSeconds: number | null;
  }>(
    `SELECT
       COUNT(*) as totalWorkouts,
       SUM(CASE 
             WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
             THEN (strftime('%s', completed_at) - strftime('%s', started_at))
             ELSE 0 
           END) as totalSeconds
     FROM workouts
     WHERE user_id = ? AND status = 'completed'`,
    [userId],
  );

  // Lifetime sets & volume
  const setStats = await db.getFirstAsync<{
    totalSets: number;
    totalVolume: number | null;
  }>(
    `SELECT
       COUNT(ws.id) as totalSets,
       SUM(CASE WHEN ws.weight_kg > 0 AND ws.reps > 0 THEN ws.weight_kg * ws.reps ELSE 0 END) as totalVolume
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     INNER JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.status = 'completed' AND ws.is_completed = 1`,
    [userId],
  );

  // Current week vs previous week calculations
  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekISO = thisWeekStart.toISOString();
  const lastWeekISO = lastWeekStart.toISOString();

  // This week's workout count
  const thisWeekWorkoutsRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workouts
     WHERE user_id = ? AND status = 'completed' AND started_at >= ?`,
    [userId, thisWeekISO],
  );

  // This week's volume
  const thisWeekVolumeRow = await db.getFirstAsync<{ volume: number | null }>(
    `SELECT SUM(ws.weight_kg * ws.reps) as volume
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     INNER JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.status = 'completed' AND ws.is_completed = 1
       AND w.started_at >= ?`,
    [userId, thisWeekISO],
  );

  // Last week's volume
  const lastWeekVolumeRow = await db.getFirstAsync<{ volume: number | null }>(
    `SELECT SUM(ws.weight_kg * ws.reps) as volume
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     INNER JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.status = 'completed' AND ws.is_completed = 1
       AND w.started_at >= ? AND w.started_at < ?`,
    [userId, lastWeekISO, thisWeekISO],
  );

  const totalMinutes = Math.round((workoutStats?.totalSeconds ?? 0) / 60);

  return {
    totalWorkouts: workoutStats?.totalWorkouts ?? 0,
    totalVolumeKg: Math.round(setStats?.totalVolume ?? 0),
    totalSets: setStats?.totalSets ?? 0,
    totalDurationMinutes: totalMinutes,
    thisWeekWorkouts: thisWeekWorkoutsRow?.count ?? 0,
    thisWeekVolumeKg: Math.round(thisWeekVolumeRow?.volume ?? 0),
    lastWeekVolumeKg: Math.round(lastWeekVolumeRow?.volume ?? 0),
  };
}

// ─── Weekly Volume Trends ────────────────────────────────────────────

export async function getWeeklyVolumeTrends(
  userId: string,
  weeksCount = 8,
): Promise<WeeklyVolumePoint[]> {
  const db = await getDatabase();
  const points: WeeklyVolumePoint[] = [];

  const now = new Date();
  const currentWeekStart = getStartOfWeek(now);

  for (let i = weeksCount - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const startISO = weekStart.toISOString();
    const endISO = weekEnd.toISOString();

    const weekLabel = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const result = await db.getFirstAsync<{
      workoutCount: number;
      volume: number | null;
    }>(
      `SELECT
         COUNT(DISTINCT w.id) as workoutCount,
         SUM(CASE WHEN ws.weight_kg > 0 AND ws.reps > 0 THEN ws.weight_kg * ws.reps ELSE 0 END) as volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.is_completed = 1
       WHERE w.user_id = ? AND w.status = 'completed'
         AND w.started_at >= ? AND w.started_at < ?`,
      [userId, startISO, endISO],
    );

    points.push({
      weekLabel,
      weekStart: startISO,
      volumeKg: Math.round(result?.volume ?? 0),
      workoutCount: result?.workoutCount ?? 0,
    });
  }

  return points;
}

// ─── Exercise History & Progression ──────────────────────────────────

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  range: TimeRange,
): Promise<ExerciseProgressPoint[]> {
  const db = await getDatabase();
  const days = getDaysForRange(range);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceISO = sinceDate.toISOString();

  // Get distinct completed workouts that included this exercise
  const workouts = await db.getAllAsync<{
    workout_id: string;
    workout_name: string;
    started_at: string;
    workout_exercise_id: string;
  }>(
    `SELECT
       w.id as workout_id,
       w.name as workout_name,
       w.started_at,
       we.id as workout_exercise_id
     FROM workouts w
     INNER JOIN workout_exercises we ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.status = 'completed'
       AND we.exercise_id = ?
       AND w.started_at >= ?
     ORDER BY w.started_at ASC`,
    [userId, exerciseId, sinceISO],
  );

  const points: ExerciseProgressPoint[] = [];

  for (const w of workouts) {
    const sets = await db.getAllAsync<{
      weight_kg: number | null;
      reps: number | null;
    }>(
      `SELECT weight_kg, reps FROM workout_sets
       WHERE workout_exercise_id = ? AND is_completed = 1
       ORDER BY set_number ASC`,
      [w.workout_exercise_id],
    );

    if (sets.length === 0) continue;

    let best1RM = 0;
    let maxWeight = 0;
    let totalVolume = 0;
    let bestReps = 0;
    let bestWeight = 0;

    for (const s of sets) {
      const weight = s.weight_kg ?? 0;
      const reps = s.reps ?? 0;

      if (weight > 0 && reps > 0) {
        totalVolume += weight * reps;
        if (weight > maxWeight) {
          maxWeight = weight;
        }
        const e1rm = calculate1RM(weight, reps);
        if (e1rm > best1RM) {
          best1RM = e1rm;
          bestReps = reps;
          bestWeight = weight;
        }
      }
    }

    points.push({
      date: w.started_at,
      workoutId: w.workout_id,
      workoutName: w.workout_name,
      estimated1RM: best1RM,
      maxWeightKg: maxWeight,
      totalVolumeKg: Math.round(totalVolume),
      bestReps,
      bestWeight,
    });
  }

  return points;
}

// ─── Logged Exercises List ───────────────────────────────────────────

export async function getLoggedExercises(
  userId: string,
  exerciseMap?: Map<string, { name: string; muscleGroup: string }>,
): Promise<LoggedExerciseInfo[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    exercise_id: string;
    logged_set_count: number;
    max_weight: number | null;
    max_reps: number | null;
  }>(
    `SELECT
       we.exercise_id,
       COUNT(ws.id) as logged_set_count,
       MAX(ws.weight_kg) as max_weight,
       MAX(ws.reps) as max_reps
     FROM workout_exercises we
     INNER JOIN workouts w ON we.workout_id = w.id
     INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.is_completed = 1
     WHERE w.user_id = ? AND w.status != 'abandoned'
     GROUP BY we.exercise_id
     ORDER BY logged_set_count DESC`,
    [userId],
  );

  return rows.map((r) => {
    const weight = r.max_weight ?? 0;
    const reps = r.max_reps ?? 0;
    const exInfo = exerciseMap?.get(r.exercise_id);
    return {
      id: r.exercise_id,
      name: exInfo?.name ?? 'Exercise',
      muscleGroup: exInfo?.muscleGroup ?? 'other',
      loggedSetCount: r.logged_set_count,
      best1RM: calculate1RM(weight, reps),
    };
  });
}
