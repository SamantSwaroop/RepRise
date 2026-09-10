import type {
  ExerciseBaseline,
  DetectedPR,
  AllTimeExerciseRecord,
  PRType,
} from '@reprise/shared';
import { calculate1RM, detectPRsForSet } from '@reprise/shared';
import { getDatabase } from './database';

export { calculate1RM, detectPRsForSet };

// ─── Exercise Baselines (Prior to Current Workout) ───────────────────

export async function getExerciseBaselines(
  userId: string,
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Record<string, ExerciseBaseline>> {
  if (exerciseIds.length === 0) return {};

  const db = await getDatabase();
  const placeholders = exerciseIds.map(() => '?').join(',');

  const queryParams: any[] = [userId];
  let excludeClause = '';
  if (excludeWorkoutId) {
    excludeClause = 'AND w.id != ?';
    queryParams.push(excludeWorkoutId);
  }
  queryParams.push(...exerciseIds);

  const rows = await db.getAllAsync<{
    exercise_id: string;
    max_weight: number | null;
    max_1rm: number | null;
    completed_sets_count: number;
  }>(
    `SELECT
       we.exercise_id,
       MAX(ws.weight_kg) as max_weight,
       MAX(ws.weight_kg * (1.0 + ws.reps / 30.0)) as max_1rm,
       COUNT(ws.id) as completed_sets_count
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     INNER JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = ?
       AND w.status != 'abandoned'
       ${excludeClause}
       AND we.exercise_id IN (${placeholders})
       AND ws.is_completed = 1
       AND ws.weight_kg > 0
       AND ws.reps > 0
     GROUP BY we.exercise_id`,
    queryParams,
  );

  const baselines: Record<string, ExerciseBaseline> = {};

  // Initialize defaults for all requested exerciseIds
  for (const id of exerciseIds) {
    baselines[id] = {
      exerciseId: id,
      maxWeightKg: 0,
      max1RM: 0,
      hasPriorHistory: false,
    };
  }

  // Populate from query results
  for (const r of rows) {
    if (r.completed_sets_count > 0) {
      baselines[r.exercise_id] = {
        exerciseId: r.exercise_id,
        maxWeightKg: r.max_weight ?? 0,
        max1RM: r.max_1rm ? Math.round(r.max_1rm * 10) / 10 : 0,
        hasPriorHistory: true,
      };
    }
  }

  return baselines;
}

// ─── Workout PR Summary ─────────────────────────────────────────────

/**
 * Returns all PRs (1RM or Heaviest Weight) achieved in a specific workout
 * compared to the user's prior history before this workout.
 */
export async function getWorkoutPRs(
  workoutId: string,
  userId: string,
  exerciseMap?: Map<string, string>,
): Promise<DetectedPR[]> {
  const db = await getDatabase();

  // Load the workout's exercises and sets
  const exercises = await db.getAllAsync<{
    we_id: string;
    exercise_id: string;
  }>(
    `SELECT
       we.id as we_id,
       we.exercise_id
     FROM workout_exercises we
     WHERE we.workout_id = ?
     ORDER BY we."order" ASC`,
    [workoutId],
  );

  if (exercises.length === 0) return [];

  const exerciseIds = exercises.map((e) => e.exercise_id);
  const baselines = await getExerciseBaselines(userId, exerciseIds, workoutId);

  const detectedPRs: DetectedPR[] = [];

  for (const ex of exercises) {
    const baseline = baselines[ex.exercise_id];
    if (!baseline || !baseline.hasPriorHistory) {
      // No prior history to beat
      continue;
    }

    const sets = await db.getAllAsync<{
      id: string;
      set_number: number;
      weight_kg: number | null;
      reps: number | null;
      is_completed: number;
    }>(
      `SELECT id, set_number, weight_kg, reps, is_completed
       FROM workout_sets
       WHERE workout_exercise_id = ? AND is_completed = 1
       ORDER BY set_number ASC`,
      [ex.we_id],
    );

    let bestWeightInWorkout = baseline.maxWeightKg;
    let best1RMInWorkout = baseline.max1RM;

    let bestWeightSet: { id: string; setNumber: number; weight: number; reps: number } | null = null;
    let best1RMSet: { id: string; setNumber: number; weight: number; reps: number; e1rm: number } | null = null;

    for (const s of sets) {
      const weight = s.weight_kg ?? 0;
      const reps = s.reps ?? 0;
      if (weight <= 0 || reps <= 0) continue;

      // Check Heaviest Weight
      if (weight > bestWeightInWorkout) {
        bestWeightInWorkout = weight;
        bestWeightSet = {
          id: s.id,
          setNumber: s.set_number,
          weight,
          reps,
        };
      }

      // Check Est. 1RM
      const e1rm = calculate1RM(weight, reps);
      if (e1rm > best1RMInWorkout) {
        best1RMInWorkout = e1rm;
        best1RMSet = {
          id: s.id,
          setNumber: s.set_number,
          weight,
          reps,
          e1rm,
        };
      }
    }

    const exerciseName = exerciseMap?.get(ex.exercise_id) ?? 'Exercise';

    // If Heaviest Weight PR was broken
    if (bestWeightSet && bestWeightInWorkout > baseline.maxWeightKg) {
      const improvement = Math.round((bestWeightInWorkout - baseline.maxWeightKg) * 10) / 10;
      detectedPRs.push({
        type: 'weight',
        exerciseId: ex.exercise_id,
        exerciseName,
        setId: bestWeightSet.id,
        setNumber: bestWeightSet.setNumber,
        value: bestWeightInWorkout,
        previousValue: baseline.maxWeightKg,
        improvement,
        weightKg: bestWeightSet.weight,
        reps: bestWeightSet.reps,
      });
    }

    // If Est. 1RM PR was broken
    if (best1RMSet && best1RMInWorkout > baseline.max1RM) {
      const improvement = Math.round((best1RMInWorkout - baseline.max1RM) * 10) / 10;
      detectedPRs.push({
        type: '1rm',
        exerciseId: ex.exercise_id,
        exerciseName,
        setId: best1RMSet.id,
        setNumber: best1RMSet.setNumber,
        value: best1RMInWorkout,
        previousValue: baseline.max1RM,
        improvement,
        weightKg: best1RMSet.weight,
        reps: best1RMSet.reps,
      });
    }
  }

  return detectedPRs;
}

// ─── Workout History PR Counts ──────────────────────────────────────

/**
 * Returns a mapping of workoutId -> count of PRs achieved in that workout.
 */
export async function getWorkoutPRCounts(userId: string): Promise<Record<string, number>> {
  const db = await getDatabase();

  // Get all completed workouts in chronological order
  const workouts = await db.getAllAsync<{ id: string; started_at: string }>(
    `SELECT id, started_at FROM workouts
     WHERE user_id = ? AND status = 'completed'
     ORDER BY started_at ASC`,
    [userId],
  );

  const prCounts: Record<string, number> = {};
  if (workouts.length === 0) return prCounts;

  // Running record map: exerciseId -> { maxWeight, max1RM }
  const runningRecords: Record<string, { maxWeight: number; max1RM: number }> = {};

  for (const w of workouts) {
    const sets = await db.getAllAsync<{
      exercise_id: string;
      weight_kg: number | null;
      reps: number | null;
    }>(
      `SELECT we.exercise_id, ws.weight_kg, ws.reps
       FROM workout_sets ws
       INNER JOIN workout_exercises we ON we.id = ws.workout_exercise_id
       WHERE we.workout_id = ? AND ws.is_completed = 1
       ORDER BY ws.set_number ASC`,
      [w.id],
    );

    let prCount = 0;
    const exerciseBestsInWorkout: Record<string, { maxWeight: number; max1RM: number }> = {};

    for (const s of sets) {
      const weight = s.weight_kg ?? 0;
      const reps = s.reps ?? 0;
      if (weight <= 0 || reps <= 0) continue;

      if (!exerciseBestsInWorkout[s.exercise_id]) {
        exerciseBestsInWorkout[s.exercise_id] = { maxWeight: 0, max1RM: 0 };
      }
      const e1rm = calculate1RM(weight, reps);
      if (weight > exerciseBestsInWorkout[s.exercise_id].maxWeight) {
        exerciseBestsInWorkout[s.exercise_id].maxWeight = weight;
      }
      if (e1rm > exerciseBestsInWorkout[s.exercise_id].max1RM) {
        exerciseBestsInWorkout[s.exercise_id].max1RM = e1rm;
      }
    }

    for (const [exId, bests] of Object.entries(exerciseBestsInWorkout)) {
      const prior = runningRecords[exId];
      if (prior) {
        // Exercise had prior history; check if broken
        if (bests.maxWeight > prior.maxWeight) {
          prCount++;
          prior.maxWeight = bests.maxWeight;
        }
        if (bests.max1RM > prior.max1RM) {
          prCount++;
          prior.max1RM = bests.max1RM;
        }
      } else {
        // First time logging this exercise, establish baseline without counting as broken PR
        runningRecords[exId] = {
          maxWeight: bests.maxWeight,
          max1RM: bests.max1RM,
        };
      }
    }

    if (prCount > 0) {
      prCounts[w.id] = prCount;
    }
  }

  return prCounts;
}

// ─── All-Time Personal Records Showcase ──────────────────────────────

/**
 * Returns all-time personal records for all exercises completed by the user.
 */
export async function getAllTimePersonalRecords(
  userId: string,
  exerciseMap?: Map<string, { name: string; muscleGroup: string }>,
): Promise<AllTimeExerciseRecord[]> {
  const db = await getDatabase();

  const exercises = await db.getAllAsync<{
    exercise_id: string;
  }>(
    `SELECT DISTINCT
       we.exercise_id
     FROM workout_exercises we
     INNER JOIN workouts w ON we.workout_id = w.id
     INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.is_completed = 1
     WHERE w.user_id = ? AND w.status != 'abandoned'
       AND ws.weight_kg > 0 AND ws.reps > 0`,
    [userId],
  );

  const records: AllTimeExerciseRecord[] = [];

  for (const ex of exercises) {
    const sets = await db.getAllAsync<{
      weight_kg: number;
      reps: number;
      started_at: string;
    }>(
      `SELECT ws.weight_kg, ws.reps, w.started_at
       FROM workout_sets ws
       INNER JOIN workout_exercises we ON we.id = ws.workout_exercise_id
       INNER JOIN workouts w ON we.workout_id = w.id
       WHERE w.user_id = ? AND w.status != 'abandoned'
         AND we.exercise_id = ? AND ws.is_completed = 1
         AND ws.weight_kg > 0 AND ws.reps > 0
       ORDER BY w.started_at ASC`,
      [userId, ex.exercise_id],
    );

    if (sets.length === 0) continue;

    let bestWeightKg = 0;
    let bestWeightReps = 0;
    let bestWeightDate = sets[0].started_at;

    let best1RM = 0;
    let best1RMWeight = 0;
    let best1RMReps = 0;
    let best1RMDate = sets[0].started_at;

    for (const s of sets) {
      if (s.weight_kg > bestWeightKg) {
        bestWeightKg = s.weight_kg;
        bestWeightReps = s.reps;
        bestWeightDate = s.started_at;
      }
      const e1rm = calculate1RM(s.weight_kg, s.reps);
      if (e1rm > best1RM) {
        best1RM = e1rm;
        best1RMWeight = s.weight_kg;
        best1RMReps = s.reps;
        best1RMDate = s.started_at;
      }
    }

    const exInfo = exerciseMap?.get(ex.exercise_id);

    records.push({
      exerciseId: ex.exercise_id,
      exerciseName: exInfo?.name ?? 'Exercise',
      muscleGroup: exInfo?.muscleGroup ?? 'other',
      bestWeightKg,
      bestWeightReps,
      bestWeightDate,
      best1RM,
      best1RMWeight,
      best1RMReps,
      best1RMDate,
    });
  }

  // Sort by highest 1RM descending
  return records.sort((a, b) => b.best1RM - a.best1RM);
}
