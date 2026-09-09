import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Exercise, CreateExerciseInput, UpdateExerciseInput } from '@reprise/shared';
import { api } from '../lib/api';

const EXERCISES_KEY = ['exercises'] as const;

export function useExercises(search?: string) {
  return useQuery<Exercise[]>({
    queryKey: [...EXERCISES_KEY, search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api<Exercise[]>(`/exercises${params}`);
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      return api<Exercise>('/exercises', {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateExerciseInput & { id: string }) => {
      return api<Exercise>(`/exercises/${id}`, {
        method: 'PUT',
        body: input as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api(`/exercises/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}
