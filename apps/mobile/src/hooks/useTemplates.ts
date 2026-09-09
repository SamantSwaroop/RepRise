import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Template, TemplateExercise, Workout } from '@reprise/shared';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  reorderTemplateExercises,
  updateTemplateExerciseSets,
  createTemplateFromWorkout,
  startWorkoutFromTemplate,
} from '../db/templateRepository';
import { useAuthStore } from '../stores/authStore';

const TEMPLATES_KEY = ['templates'] as const;
const TEMPLATE_KEY = (id: string) => ['template', id] as const;
const WORKOUTS_KEY = ['workouts'] as const;

// ─── Queries ───────────────────────────────────────────────────────

export function useTemplates() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [...TEMPLATES_KEY],
    queryFn: () => getTemplates(userId!),
    enabled: !!userId,
  });
}

export function useTemplate(id: string) {
  return useQuery<Template | null>({
    queryKey: TEMPLATE_KEY(id),
    queryFn: () => getTemplateById(id),
    enabled: !!id,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (name: string) => {
      return createTemplate(userId!, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string }) => {
      return updateTemplate(id, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY(variables.id) });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useAddExerciseToTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      exerciseId,
      defaultSets,
      order,
    }: {
      templateId: string;
      exerciseId: string;
      defaultSets?: number;
      order?: number;
    }) => {
      return addExerciseToTemplate(templateId, exerciseId, defaultSets, order);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY(variables.templateId) });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useRemoveExerciseFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateExerciseId,
      templateId,
    }: {
      templateExerciseId: string;
      templateId: string;
    }) => {
      return removeExerciseFromTemplate(templateExerciseId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY(variables.templateId) });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useReorderTemplateExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      orderedIds,
    }: {
      templateId: string;
      orderedIds: string[];
    }) => {
      return reorderTemplateExercises(templateId, orderedIds);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY(variables.templateId) });
    },
  });
}

export function useUpdateTemplateExerciseSets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateExerciseId,
      templateId,
      defaultSets,
    }: {
      templateExerciseId: string;
      templateId: string;
      defaultSets: number;
    }) => {
      return updateTemplateExerciseSets(templateExerciseId, defaultSets);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY(variables.templateId) });
    },
  });
}

export function useCreateTemplateFromWorkout() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      workout,
      name,
    }: {
      workout: Workout;
      name: string;
    }) => {
      return createTemplateFromWorkout(userId!, workout, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useStartWorkoutFromTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (templateId: string) => {
      return startWorkoutFromTemplate(userId!, templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUTS_KEY });
    },
  });
}
