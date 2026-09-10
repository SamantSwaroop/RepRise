import { z } from 'zod';

export const toastTypeSchema = z.enum(['success', 'info', 'warning', 'error']);
export type ToastType = z.infer<typeof toastTypeSchema>;

export const toastPayloadSchema = z.object({
  message: z.string().min(1),
  type: toastTypeSchema.default('info'),
  duration: z.number().positive().optional(),
});

export type ToastPayload = z.infer<typeof toastPayloadSchema>;

/**
 * Format celebratory toast message when a workout is completed.
 */
export function formatWorkoutCompletedToast(workoutName: string, prCount: number = 0): string {
  if (prCount > 0) {
    return `Workout completed! 🏆 ${prCount} new ${prCount === 1 ? 'PR' : 'PRs'} set!`;
  }
  return `Workout "${workoutName}" completed! Keep up the momentum.`;
}

/**
 * Format notification toast when a workout template is saved.
 */
export function formatTemplateSavedToast(templateName: string): string {
  return `Template "${templateName}" saved to library.`;
}
