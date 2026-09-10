import { useQuery } from '@tanstack/react-query';
import type {
  DashboardStats,
  WeeklyVolumePoint,
  ExerciseProgressPoint,
  LoggedExerciseInfo,
  TimeRange,
} from '@reprise/shared';
import {
  getDashboardStats,
  getWeeklyVolumeTrends,
  getExerciseHistory,
  getLoggedExercises,
} from '../db/progressRepository';
import { useAuthStore } from '../stores/authStore';

export const PROGRESS_KEYS = {
  stats: ['progress', 'stats'] as const,
  weeklyVolume: (weeks: number) => ['progress', 'weeklyVolume', weeks] as const,
  exerciseHistory: (exerciseId: string, range: TimeRange) =>
    ['progress', 'exerciseHistory', exerciseId, range] as const,
  loggedExercises: ['progress', 'loggedExercises'] as const,
};

export function useDashboardStats() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<DashboardStats>({
    queryKey: PROGRESS_KEYS.stats,
    queryFn: () => getDashboardStats(userId!),
    enabled: !!userId,
  });
}

export function useWeeklyVolumeTrends(weeksCount = 8) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<WeeklyVolumePoint[]>({
    queryKey: PROGRESS_KEYS.weeklyVolume(weeksCount),
    queryFn: () => getWeeklyVolumeTrends(userId!, weeksCount),
    enabled: !!userId,
  });
}

export function useExerciseProgress(exerciseId: string | null | undefined, range: TimeRange = '3M') {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<ExerciseProgressPoint[]>({
    queryKey: PROGRESS_KEYS.exerciseHistory(exerciseId ?? '', range),
    queryFn: () => getExerciseHistory(userId!, exerciseId!, range),
    enabled: !!userId && !!exerciseId,
  });
}

import { useMemo } from 'react';
import { useExercises } from './useExercises';

export function useLoggedExercises() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: allExercises } = useExercises();

  const exerciseMap = useMemo(() => {
    const map = new Map<string, { name: string; muscleGroup: string }>();
    for (const e of allExercises ?? []) {
      map.set(e.id, { name: e.name, muscleGroup: e.muscleGroup });
    }
    return map;
  }, [allExercises]);

  return useQuery<LoggedExerciseInfo[]>({
    queryKey: [...PROGRESS_KEYS.loggedExercises, allExercises?.length ?? 0],
    queryFn: () => getLoggedExercises(userId!, exerciseMap),
    enabled: !!userId,
  });
}
