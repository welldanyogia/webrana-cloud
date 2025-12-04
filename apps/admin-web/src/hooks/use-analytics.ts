'use client';

import { useQuery } from '@tanstack/react-query';

import { analyticsService } from '@/services/analytics.service';

export function useAnalytics(days: number = 30) {
  const dailyStatsQuery = useQuery({
    queryKey: ['analytics', 'daily', days],
    queryFn: () => analyticsService.getDailyStats(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const planDistributionQuery = useQuery({
    queryKey: ['analytics', 'plans'],
    queryFn: () => analyticsService.getPlanDistribution(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    dailyStats: dailyStatsQuery.data || [],
    dailyStatsLoading: dailyStatsQuery.isLoading,
    planDistribution: planDistributionQuery.data || [],
    planDistributionLoading: planDistributionQuery.isLoading,
  };
}
