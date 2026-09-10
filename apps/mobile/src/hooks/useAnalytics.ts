import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  StreakData,
  MuscleVolumeBreakdown,
  MuscleAnalyticsRange,
  MuscleGroup,
} from '@reprise/shared';
import { getStreakData, getMuscleDistribution } from '../db/analyticsRepository';
import { useAuthStore } from '../stores/authStore';
import { useExercises } from './useExercises';

export const ANALYTICS_KEYS = {
  streak: (goal: number) => ['analytics', 'streak', goal] as const,
  muscleDistribution: (range: MuscleAnalyticsRange) =>
    ['analytics', 'muscleDistribution', range] as const,
};

export function useStreakData(weeklyGoal: number = 3) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<StreakData>({
    queryKey: ANALYTICS_KEYS.streak(weeklyGoal),
    queryFn: () => getStreakData(userId!, weeklyGoal),
    enabled: !!userId,
  });
}

export function useMuscleDistribution(range: MuscleAnalyticsRange = '30D') {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: allExercises } = useExercises();

  const exerciseMap = useMemo(() => {
    const map = new Map<string, { muscleGroup: MuscleGroup }>();
    for (const e of allExercises ?? []) {
      map.set(e.id, { muscleGroup: e.muscleGroup });
    }
    return map;
  }, [allExercises]);

  return useQuery<MuscleVolumeBreakdown[]>({
    queryKey: [...ANALYTICS_KEYS.muscleDistribution(range), allExercises?.length ?? 0],
    queryFn: () => getMuscleDistribution(userId!, range, exerciseMap),
    enabled: !!userId,
  });
}
