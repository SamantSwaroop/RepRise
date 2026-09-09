import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Workout, WorkoutExercise, WorkoutSet, WorkoutStatus, SetType } from '@reprise/shared';
import {
  createWorkout,
  getWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  upsertSet,
  deleteSet,
  getPreviousSetsForExercise,
} from '../db/workoutRepository';
import { useAuthStore } from '../stores/authStore';

const WORKOUTS_KEY = ['workouts'] as const;
const WORKOUT_KEY = (id: string) => ['workout', id] as const;

// ─── Queries ───────────────────────────────────────────────────────

export function useWorkouts() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Omit<Workout, 'exercises'>[]>({
    queryKey: [...WORKOUTS_KEY],
    queryFn: () => getWorkouts(userId!),
    enabled: !!userId,
  });
}

export function useWorkout(id: string) {
  return useQuery<Workout | null>({
    queryKey: WORKOUT_KEY(id),
    queryFn: () => getWorkoutById(id),
    enabled: !!id,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (name?: string) => {
      return createWorkout(userId!, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUTS_KEY });
    },
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      status?: WorkoutStatus;
      notes?: string | null;
      completedAt?: string | null;
    }) => {
      return updateWorkout(id, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKOUTS_KEY });
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY(variables.id) });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteWorkout(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUTS_KEY });
    },
  });
}

export function useAddExerciseToWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      exerciseId,
      order,
      defaultSets,
    }: {
      workoutId: string;
      exerciseId: string;
      order?: number;
      defaultSets?: number;
    }) => {
      return addExerciseToWorkout(workoutId, exerciseId, order, defaultSets);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY(variables.workoutId) });
    },
  });
}

export function useRemoveExerciseFromWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutExerciseId,
      workoutId,
    }: {
      workoutExerciseId: string;
      workoutId: string;
    }) => {
      return removeExerciseFromWorkout(workoutExerciseId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY(variables.workoutId) });
    },
  });
}

export function useUpsertSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      workoutExerciseId,
      ...data
    }: {
      workoutId: string;
      workoutExerciseId: string;
      id?: string;
      type?: SetType;
      weightKg?: number | null;
      reps?: number | null;
      rpe?: number | null;
      isCompleted?: boolean;
    }) => {
      return upsertSet(workoutExerciseId, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY(variables.workoutId) });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setId, workoutId }: { setId: string; workoutId: string }) => {
      return deleteSet(setId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY(variables.workoutId) });
    },
  });
}

// ─── Previous Performance ──────────────────────────────────────────

export function usePreviousSets(exerciseId: string, currentWorkoutId: string) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<WorkoutSet[]>({
    queryKey: ['previousSets', exerciseId, currentWorkoutId],
    queryFn: () => getPreviousSetsForExercise(userId!, exerciseId, currentWorkoutId),
    enabled: !!userId && !!exerciseId && !!currentWorkoutId,
    staleTime: 60_000, // Previous data doesn't change often
  });
}

