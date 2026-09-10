import type {
  StreakData,
  MuscleVolumeBreakdown,
  MuscleAnalyticsRange,
  MuscleGroup,
} from '@reprise/shared';
import {
  calculateWeeklyStreaks,
  calculateMuscleIntensity,
  MUSCLE_GROUPS,
} from '@reprise/shared';
import { getDatabase } from './database';

// ─── Streak & Consistency Data ──────────────────────────────────────

export async function getStreakData(
  userId: string,
  weeklyGoal: number = 3,
): Promise<StreakData> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ started_at: string }>(
    `SELECT started_at FROM workouts
     WHERE user_id = ? AND status != 'abandoned'
     ORDER BY started_at ASC`,
    [userId],
  );

  const workoutDates = rows.map((r) => r.started_at);
  const now = new Date();
  const streakCalc = calculateWeeklyStreaks(workoutDates, now);

  // Calculate past 84 days (12 weeks) daily activity map
  const dateCounts: Record<string, number> = {};
  for (const dateStr of workoutDates) {
    const dayKey = dateStr.slice(0, 10); // 'YYYY-MM-DD'
    dateCounts[dayKey] = (dateCounts[dayKey] ?? 0) + 1;
  }

  const recentActiveDays: Array<{ date: string; count: number }> = [];
  // Go back 83 days to today (84 total days = 12 weeks)
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    recentActiveDays.push({
      date: dayKey,
      count: dateCounts[dayKey] ?? 0,
    });
  }

  return {
    currentWeeklyStreak: streakCalc.currentWeeklyStreak,
    longestWeeklyStreak: streakCalc.longestWeeklyStreak,
    thisWeekWorkoutCount: streakCalc.thisWeekWorkoutCount,
    weeklyGoal,
    daysActiveThisWeek: streakCalc.daysActiveThisWeek,
    recentActiveDays,
  };
}

// ─── Muscle Distribution & Volume Breakdown ─────────────────────────

export async function getMuscleDistribution(
  userId: string,
  range: MuscleAnalyticsRange,
  exerciseMap?: Map<string, { muscleGroup: MuscleGroup }>,
): Promise<MuscleVolumeBreakdown[]> {
  const db = await getDatabase();

  let dateFilter = '';
  const queryParams: any[] = [userId];

  if (range !== 'ALL') {
    const days = range === '7D' ? 7 : 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    dateFilter = 'AND w.started_at >= ?';
    queryParams.push(sinceDate.toISOString());
  }

  const rows = await db.getAllAsync<{
    exercise_id: string;
    weight_kg: number;
    reps: number;
    started_at: string;
  }>(
    `SELECT
       we.exercise_id,
       ws.weight_kg,
       ws.reps,
       w.started_at
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     INNER JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ?
       AND w.status != 'abandoned'
       AND ws.is_completed = 1
       AND ws.weight_kg > 0
       AND ws.reps > 0
       ${dateFilter}
     ORDER BY w.started_at DESC`,
    queryParams,
  );

  // Group metrics by muscleGroup
  const statsMap = new Map<
    MuscleGroup,
    { setCount: number; volumeKg: number; lastTrainedDate: string | null }
  >();

  // Initialize for all recognized primary muscle groups
  const primaryGroups: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core'];
  for (const mg of primaryGroups) {
    statsMap.set(mg, { setCount: 0, volumeKg: 0, lastTrainedDate: null });
  }

  let totalVolume = 0;
  let totalSets = 0;

  for (const r of rows) {
    const exInfo = exerciseMap?.get(r.exercise_id);
    const muscle = exInfo?.muscleGroup ?? 'other';
    const volume = r.weight_kg * r.reps;

    totalVolume += volume;
    totalSets += 1;

    let groupStats = statsMap.get(muscle);
    if (!groupStats) {
      groupStats = { setCount: 0, volumeKg: 0, lastTrainedDate: null };
      statsMap.set(muscle, groupStats);
    }

    groupStats.setCount += 1;
    groupStats.volumeKg += volume;
    if (!groupStats.lastTrainedDate) {
      groupStats.lastTrainedDate = r.started_at;
    }
  }

  const breakdown: MuscleVolumeBreakdown[] = [];

  for (const mg of primaryGroups) {
    const stats = statsMap.get(mg)!;
    const percentage =
      totalVolume > 0
        ? Math.round((stats.volumeKg / totalVolume) * 100)
        : totalSets > 0
        ? Math.round((stats.setCount / totalSets) * 100)
        : 0;

    breakdown.push({
      muscleGroup: mg,
      setCount: stats.setCount,
      volumeKg: Math.round(stats.volumeKg),
      percentage,
      lastTrainedDate: stats.lastTrainedDate,
      intensityLevel: calculateMuscleIntensity(percentage),
    });
  }

  // Sort by volume / percentage descending
  return breakdown.sort((a, b) => b.percentage - a.percentage);
}
