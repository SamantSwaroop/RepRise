import { describe, it, expect } from 'vitest';
import {
  calculateWeeklyStreaks,
  calculateMuscleIntensity,
  getISOWeekKey,
  getPreviousWeekKey,
} from '@reprise/shared';

describe('Streak & Consistency Calculation', () => {
  it('handles empty workout dates gracefully', () => {
    const res = calculateWeeklyStreaks([]);
    expect(res.currentWeeklyStreak).toBe(0);
    expect(res.longestWeeklyStreak).toBe(0);
    expect(res.thisWeekWorkoutCount).toBe(0);
    expect(res.daysActiveThisWeek).toEqual([false, false, false, false, false, false, false]);
  });

  it('calculates current streak when active in current week', () => {
    const fixedNow = new Date('2026-09-10T12:00:00Z'); // Thursday
    // Workouts in current week (Sep 10) and previous week (Sep 3)
    const dates = [
      '2026-09-03T10:00:00Z',
      '2026-09-10T08:00:00Z',
    ];

    const res = calculateWeeklyStreaks(dates, fixedNow);
    expect(res.currentWeeklyStreak).toBe(2);
    expect(res.longestWeeklyStreak).toBe(2);
    expect(res.thisWeekWorkoutCount).toBe(1);
    // Thursday is index 3 (Monday=0, Tuesday=1, Wednesday=2, Thursday=3)
    expect(res.daysActiveThisWeek[3]).toBe(true);
  });

  it('keeps streak alive if user worked out last week but has not worked out yet this week', () => {
    const fixedNow = new Date('2026-09-08T12:00:00Z'); // Tuesday of a new week
    // Workout last week (Sep 3)
    const dates = ['2026-09-03T10:00:00Z'];

    const res = calculateWeeklyStreaks(dates, fixedNow);
    // Streak is alive because only previous week is completed so far
    expect(res.currentWeeklyStreak).toBe(1);
    expect(res.thisWeekWorkoutCount).toBe(0);
  });

  it('resets current streak to 0 if more than 1 week gap exists', () => {
    const fixedNow = new Date('2026-09-24T12:00:00Z'); // 3 weeks later
    const dates = ['2026-09-03T10:00:00Z'];

    const res = calculateWeeklyStreaks(dates, fixedNow);
    expect(res.currentWeeklyStreak).toBe(0);
    expect(res.longestWeeklyStreak).toBe(1);
  });

  it('calculates previous week key across year boundaries', () => {
    expect(getPreviousWeekKey('2026-W01')).toBe('2025-W52');
    expect(getPreviousWeekKey('2026-W15')).toBe('2026-W14');
  });
});

describe('Muscle Intensity Calculation', () => {
  it('categorizes relative volume percentages correctly', () => {
    expect(calculateMuscleIntensity(0)).toBe('none');
    expect(calculateMuscleIntensity(8)).toBe('light');
    expect(calculateMuscleIntensity(22)).toBe('moderate');
    expect(calculateMuscleIntensity(45)).toBe('high');
  });
});
