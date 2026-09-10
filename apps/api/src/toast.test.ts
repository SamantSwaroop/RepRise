import { describe, it, expect } from 'vitest';
import {
  toastPayloadSchema,
  toastTypeSchema,
  formatWorkoutCompletedToast,
  formatTemplateSavedToast,
} from '@reprise/shared';

describe('Phase 12: Polish & Toast Notifications', () => {
  describe('Toast Schemas', () => {
    it('validates supported toast types', () => {
      expect(toastTypeSchema.safeParse('success').success).toBe(true);
      expect(toastTypeSchema.safeParse('info').success).toBe(true);
      expect(toastTypeSchema.safeParse('warning').success).toBe(true);
      expect(toastTypeSchema.safeParse('error').success).toBe(true);
      expect(toastTypeSchema.safeParse('unknown').success).toBe(false);
    });

    it('validates toast payload with defaults', () => {
      const result = toastPayloadSchema.safeParse({ message: 'Template saved' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('info');
        expect(result.data.message).toBe('Template saved');
      }
    });

    it('rejects empty messages', () => {
      const result = toastPayloadSchema.safeParse({ message: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('Toast Message Formatters', () => {
    it('formats workout completion toast with PR celebratory copy', () => {
      const withPRs = formatWorkoutCompletedToast('Leg Day', 3);
      expect(withPRs).toContain('3 new PRs set!');
      expect(withPRs).toContain('🏆');

      const singlePR = formatWorkoutCompletedToast('Leg Day', 1);
      expect(singlePR).toContain('1 new PR set!');

      const withoutPRs = formatWorkoutCompletedToast('Morning Workout', 0);
      expect(withoutPRs).toBe('Workout "Morning Workout" completed! Keep up the momentum.');
    });

    it('formats template saved notification', () => {
      const msg = formatTemplateSavedToast('Upper Body Hypertrophy');
      expect(msg).toBe('Template "Upper Body Hypertrophy" saved to library.');
    });
  });
});
