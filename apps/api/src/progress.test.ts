import { describe, it, expect } from 'vitest';

function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

describe('calculate1RM (Epley formula)', () => {
  it('returns 0 for non-positive inputs', () => {
    expect(calculate1RM(0, 5)).toBe(0);
    expect(calculate1RM(100, 0)).toBe(0);
    expect(calculate1RM(-50, 5)).toBe(0);
  });

  it('returns exact weight for a 1-rep set', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('calculates accurate estimated 1RM for multi-rep sets', () => {
    // 100kg x 10 reps -> 100 * (1 + 10/30) = 133.3 kg
    expect(calculate1RM(100, 10)).toBe(133.3);
    // 60kg x 5 reps -> 60 * (1 + 5/30) = 70 kg
    expect(calculate1RM(60, 5)).toBe(70);
  });
});
