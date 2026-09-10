import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Exercise, CreateExerciseInput, UpdateExerciseInput } from '@reprise/shared';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  getOfflineExercises,
  upsertOfflineExercises,
  createOfflineExercise,
  updateOfflineExercise,
  deleteOfflineExercise,
} from '../db/exerciseRepository';

export const EXERCISES_KEY = ['exercises'] as const;

export function useExercises(search?: string) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Exercise[]>({
    queryKey: [...EXERCISES_KEY, userId, search],
    queryFn: async () => {
      // 1. Check local SQLite cache first
      const localExercises = await getOfflineExercises(userId, search);

      if (localExercises.length > 0) {
        return localExercises;
      }

      // 2. If local SQLite is empty (e.g. fresh install), try fetching from API and seed SQLite
      try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const serverExercises = await api<Exercise[]>(`/exercises${params}`);
        if (serverExercises && serverExercises.length > 0) {
          await upsertOfflineExercises(serverExercises);
          return await getOfflineExercises(userId, search);
        }
      } catch {
        // If offline and server fails, return whatever is in local DB (even if empty)
      }

      return localExercises;
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      if (!userId) throw new Error('Must be authenticated to create exercise');
      return createOfflineExercise(userId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateExerciseInput & { id: string }) => {
      if (!userId) throw new Error('Must be authenticated to update exercise');
      return updateOfflineExercise(userId, id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Must be authenticated to delete exercise');
      return deleteOfflineExercise(userId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}
