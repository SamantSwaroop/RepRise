import { z } from 'zod';
import { exerciseSchema } from './exercise';



// ─── Template Exercise Schema & Types ───────────────────────────────

export const templateExerciseSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  order: z.number().int().nonnegative(),
  defaultSets: z.number().int().min(1).max(20).default(3),
  exercise: exerciseSchema.optional(),
  createdAt: z.string().datetime(),
});

export type TemplateExercise = z.infer<typeof templateExerciseSchema>;

export const createTemplateExerciseSchema = z.object({
  exerciseId: z.string().uuid('Invalid exercise ID'),
  order: z.number().int().nonnegative().optional(),
  defaultSets: z.number().int().min(1).max(20).optional().default(3),
});

export type CreateTemplateExerciseInput = z.infer<typeof createTemplateExerciseSchema>;

// ─── Template Schema & Types ────────────────────────────────────────

export const templateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  exercises: z.array(templateExerciseSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Template = z.infer<typeof templateSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
