import { describe, it, expect } from 'vitest';
import {
  formatTimerSeconds,
  calculateRemainingSeconds,
  adjustTimerDuration,
  DEFAULT_REST_DURATION,
  PRESET_REST_DURATIONS,
} from '@reprise/shared';

describe('Phase 9: Rest Timer & Utilities', () => {
  describe('formatTimerSeconds', () => {
    it('formats zero seconds as 00:00', () => {
      expect(formatTimerSeconds(0)).toBe('00:00');
    });

    it('clamps negative seconds to 00:00', () => {
      expect(formatTimerSeconds(-15)).toBe('00:00');
    });

    it('pads single-digit seconds correctly', () => {
      expect(formatTimerSeconds(5)).toBe('00:05');
      expect(formatTimerSeconds(9)).toBe('00:09');
    });

    it('formats seconds under one minute', () => {
      expect(formatTimerSeconds(45)).toBe('00:45');
      expect(formatTimerSeconds(59)).toBe('00:59');
    });

    it('formats exact minutes', () => {
      expect(formatTimerSeconds(60)).toBe('01:00');
      expect(formatTimerSeconds(120)).toBe('02:00');
      expect(formatTimerSeconds(300)).toBe('05:00');
    });

    it('formats minutes and seconds combined', () => {
      expect(formatTimerSeconds(90)).toBe('01:30');
      expect(formatTimerSeconds(185)).toBe('03:05');
      expect(formatTimerSeconds(635)).toBe('10:35');
    });
  });

  describe('calculateRemainingSeconds', () => {
    it('calculates remaining seconds correctly using targetEndTime', () => {
      const now = 1000000;
      const targetEndTime = now + 45 * 1000; // 45 seconds future
      expect(calculateRemainingSeconds(targetEndTime, now)).toBe(45);
    });

    it('ceils fractional seconds so 44.2s shows as 45s', () => {
      const now = 1000000;
      const targetEndTime = now + 44100; // 44.1s
      expect(calculateRemainingSeconds(targetEndTime, now)).toBe(45);
    });

    it('returns 0 when targetEndTime is in the past', () => {
      const now = 1000000;
      const targetEndTime = now - 5000;
      expect(calculateRemainingSeconds(targetEndTime, now)).toBe(0);
    });

    it('returns 0 when targetEndTime is exactly now', () => {
      const now = 1000000;
      expect(calculateRemainingSeconds(now, now)).toBe(0);
    });
  });

  describe('adjustTimerDuration', () => {
    it('adds delta seconds (+30s) correctly', () => {
      const now = 2000000;
      const currentRemaining = 45;
      const currentDuration = 90;
      const result = adjustTimerDuration(currentRemaining, currentDuration, 30, now);

      expect(result.remaining).toBe(75);
      expect(result.duration).toBe(120);
      expect(result.targetEndTime).toBe(now + 75 * 1000);
    });

    it('subtracts delta seconds (-15s) correctly', () => {
      const now = 2000000;
      const currentRemaining = 45;
      const currentDuration = 90;
      const result = adjustTimerDuration(currentRemaining, currentDuration, -15, now);

      expect(result.remaining).toBe(30);
      expect(result.duration).toBe(75);
      expect(result.targetEndTime).toBe(now + 30 * 1000);
    });

    it('clamps remaining to 0 when subtracting more than remaining', () => {
      const now = 2000000;
      const currentRemaining = 10;
      const currentDuration = 60;
      const result = adjustTimerDuration(currentRemaining, currentDuration, -20, now);

      expect(result.remaining).toBe(0);
      expect(result.targetEndTime).toBe(now);
    });
  });

  describe('constants & presets', () => {
    it('provides standard default rest duration of 90s', () => {
      expect(DEFAULT_REST_DURATION).toBe(90);
    });

    it('provides expected preset list for gym routines', () => {
      expect(PRESET_REST_DURATIONS).toEqual([30, 60, 90, 120, 180, 240, 300]);
    });
  });
});
