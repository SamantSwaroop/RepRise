import type { MuscleGroup } from './exercise';



export type MuscleAnalyticsRange = '7D' | '30D' | 'ALL';
export type MuscleIntensity = 'none' | 'light' | 'moderate' | 'high';

export interface StreakData {
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  thisWeekWorkoutCount: number;
  weeklyGoal: number;
  /** Array of 7 booleans for Monday through Sunday of current week */
  daysActiveThisWeek: boolean[];
  /** Past 84 days (12 weeks) daily activity map { 'YYYY-MM-DD': workoutCount } */
  recentActiveDays: Array<{ date: string; count: number }>;
}

export interface MuscleVolumeBreakdown {
  muscleGroup: MuscleGroup;
  setCount: number;
  volumeKg: number;
  percentage: number; // 0 to 100
  lastTrainedDate: string | null;
  intensityLevel: MuscleIntensity;
}

/**
 * Calculates intensity category based on the relative % volume share of a muscle group.
 */
export function calculateMuscleIntensity(percentage: number): MuscleIntensity {
  if (percentage <= 0) return 'none';
  if (percentage < 15) return 'light';
  if (percentage < 30) return 'moderate';
  return 'high';
}

/**
 * Helper to get ISO week string "YYYY-Www" for a Date in local time.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Helper to get previous ISO week key given a current ISO week key.
 */
export function getPreviousWeekKey(weekKey: string): string {
  const parts = weekKey.split('-W');
  let year = parseInt(parts[0], 10);
  let week = parseInt(parts[1], 10) - 1;
  if (week < 1) {
    year -= 1;
    week = 52; // standard 52 weeks
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Helper to get next ISO week key given a current ISO week key.
 */
export function getNextWeekKey(weekKey: string): string {
  const parts = weekKey.split('-W');
  let year = parseInt(parts[0], 10);
  let week = parseInt(parts[1], 10) + 1;
  if (week > 52) {
    year += 1;
    week = 1;
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Pure function to calculate current and longest weekly streaks from workout timestamps.
 */
export function calculateWeeklyStreaks(
  workoutDates: string[],
  now: Date = new Date(),
): {
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  thisWeekWorkoutCount: number;
  daysActiveThisWeek: boolean[];
} {
  if (workoutDates.length === 0) {
    return {
      currentWeeklyStreak: 0,
      longestWeeklyStreak: 0,
      thisWeekWorkoutCount: 0,
      daysActiveThisWeek: [false, false, false, false, false, false, false],
    };
  }

  // Monday = 0, Sunday = 6
  const currentDayOfWeek = (now.getDay() + 6) % 7;
  const mondayOfThisWeek = new Date(now);
  mondayOfThisWeek.setDate(now.getDate() - currentDayOfWeek);
  mondayOfThisWeek.setHours(0, 0, 0, 0);

  const daysActiveThisWeek = [false, false, false, false, false, false, false];
  let thisWeekWorkoutCount = 0;

  // Group workouts by ISO week key
  const weekSet = new Set<string>();

  for (const dateStr of workoutDates) {
    const d = new Date(dateStr);
    const weekKey = getISOWeekKey(d);
    weekSet.add(weekKey);

    // Check if this workout is in current week
    const diffDays = Math.floor((d.getTime() - mondayOfThisWeek.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      daysActiveThisWeek[diffDays] = true;
      thisWeekWorkoutCount++;
    }
  }

  // Calculate current weekly streak
  const currentWeekKey = getISOWeekKey(now);
  const prevWeekKey = getPreviousWeekKey(currentWeekKey);

  let currentWeeklyStreak = 0;
  let checkKey: string | null = null;

  if (weekSet.has(currentWeekKey)) {
    // Active this week, streak starts from current week
    checkKey = currentWeekKey;
  } else if (weekSet.has(prevWeekKey)) {
    // Not active yet this week, but was active last week -> streak alive!
    checkKey = prevWeekKey;
  }

  while (checkKey && weekSet.has(checkKey)) {
    currentWeeklyStreak++;
    checkKey = getPreviousWeekKey(checkKey);
  }

  // Calculate longest weekly streak
  const sortedWeeks: string[] = Array.from(weekSet).sort();
  let longestWeeklyStreak = 0;
  let runningStreak = 0;
  let expectedNextWeek: string | null = null;

  for (const w of sortedWeeks) {
    if (!expectedNextWeek || w === expectedNextWeek) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }

    expectedNextWeek = getNextWeekKey(w);

    if (runningStreak > longestWeeklyStreak) {
      longestWeeklyStreak = runningStreak;
    }
  }

  return {
    currentWeeklyStreak,
    longestWeeklyStreak: Math.max(currentWeeklyStreak, longestWeeklyStreak),
    thisWeekWorkoutCount,
    daysActiveThisWeek,
  };
}
