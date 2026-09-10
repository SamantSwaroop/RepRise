import { describe, it, expect } from 'vitest';
import { calculate1RM, detectPRsForSet } from '@reprise/shared';
import type { ExerciseBaseline } from '@reprise/shared';

describe('detectPRsForSet', () => {
  const baseline: ExerciseBaseline = {
    exerciseId: 'bench-press-1',
    maxWeightKg: 100,
    max1RM: 110,
    hasPriorHistory: true,
  };

  it('returns empty array when set is not completed', () => {
    const prs = detectPRsForSet(
      { weightKg: 120, reps: 5, isCompleted: false },
      baseline,
    );
    expect(prs).toEqual([]);
  });

  it('returns empty array when there is no prior history (first time exercise)', () => {
    const firstTimeBaseline: ExerciseBaseline = {
      exerciseId: 'squat-1',
      maxWeightKg: 0,
      max1RM: 0,
      hasPriorHistory: false,
    };
    const prs = detectPRsForSet(
      { weightKg: 100, reps: 5, isCompleted: true },
      firstTimeBaseline,
    );
    expect(prs).toEqual([]);
  });

  it('detects Heaviest Weight PR when set weight exceeds previous max', () => {
    // 105kg x 1 rep -> weight is 105 (>100), 1RM is 105 (<110)
    const prs = detectPRsForSet(
      { weightKg: 105, reps: 1, isCompleted: true },
      baseline,
    );
    expect(prs).toEqual(['weight']);
  });

  it('detects Est. 1RM PR when 1RM exceeds previous max1RM', () => {
    // 95kg x 8 reps -> weight is 95 (<100), 1RM = 95 * (1 + 8/30) = 120.3 kg (>110)
    const prs = detectPRsForSet(
      { weightKg: 95, reps: 8, isCompleted: true },
      baseline,
    );
    expect(prs).toEqual(['1rm']);
  });

  it('detects both 1RM and Weight PRs when both are broken', () => {
    // 110kg x 5 reps -> weight is 110 (>100), 1RM = 110 * (1 + 5/30) = 128.3 kg (>110)
    const prs = detectPRsForSet(
      { weightKg: 110, reps: 5, isCompleted: true },
      baseline,
    );
    expect(prs).toContain('weight');
    expect(prs).toContain('1rm');
    expect(prs.length).toBe(2);
  });

  it('returns empty array when set does not break any records', () => {
    // 80kg x 5 reps -> weight is 80 (<100), 1RM = 93.3 kg (<110)
    const prs = detectPRsForSet(
      { weightKg: 80, reps: 5, isCompleted: true },
      baseline,
    );
    expect(prs).toEqual([]);
  });
});
