import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  ExerciseBaseline,
  DetectedPR,
  AllTimeExerciseRecord,
} from '@reprise/shared';
import {
  getExerciseBaselines,
  getWorkoutPRs,
  getWorkoutPRCounts,
  getAllTimePersonalRecords,
} from '../db/prRepository';
import { useAuthStore } from '../stores/authStore';
import { useExercises } from './useExercises';

export const PR_KEYS = {
  baselines: (exerciseIds: string[], excludeWorkoutId?: string) =>
    ['prs', 'baselines', exerciseIds.sort().join(','), excludeWorkoutId ?? 'none'] as const,
  workoutPRs: (workoutId: string) => ['prs', 'workout', workoutId] as const,
  prCounts: ['prs', 'counts'] as const,
  allTime: ['prs', 'allTime'] as const,
};

export function useExerciseBaselines(exerciseIds: string[], excludeWorkoutId?: string) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Record<string, ExerciseBaseline>>({
    queryKey: PR_KEYS.baselines(exerciseIds, excludeWorkoutId),
    queryFn: () => getExerciseBaselines(userId!, exerciseIds, excludeWorkoutId),
    enabled: !!userId && exerciseIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
}

export function useWorkoutPRs(workoutId: string | null | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: allExercises } = useExercises();

  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of allExercises ?? []) {
      map.set(e.id, e.name);
    }
    return map;
  }, [allExercises]);

  return useQuery<DetectedPR[]>({
    queryKey: [...PR_KEYS.workoutPRs(workoutId ?? ''), allExercises?.length ?? 0],
    queryFn: () => getWorkoutPRs(workoutId!, userId!, exerciseMap),
    enabled: !!userId && !!workoutId,
  });
}

export function useWorkoutPRCounts() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Record<string, number>>({
    queryKey: PR_KEYS.prCounts,
    queryFn: () => getWorkoutPRCounts(userId!),
    enabled: !!userId,
  });
}

export function useAllTimePersonalRecords() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: allExercises } = useExercises();

  const exerciseMap = useMemo(() => {
    const map = new Map<string, { name: string; muscleGroup: string }>();
    for (const e of allExercises ?? []) {
      map.set(e.id, { name: e.name, muscleGroup: e.muscleGroup });
    }
    return map;
  }, [allExercises]);

  return useQuery<AllTimeExerciseRecord[]>({
    queryKey: [...PR_KEYS.allTime, allExercises?.length ?? 0],
    queryFn: () => getAllTimePersonalRecords(userId!, exerciseMap),
    enabled: !!userId,
  });
}
