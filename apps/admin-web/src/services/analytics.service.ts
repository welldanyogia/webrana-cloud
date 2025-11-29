/**
 * Analytics Service
 * Provides data for analytics charts. Currently uses mock data.
 * TODO: Connect to backend API when available.
 */

export interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
}

export interface PlanDistribution {
  planName: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  growthRate: number; // percentage compared to previous period
}

/**
 * Generate mock daily stats for the specified number of days
 */
function generateMockDailyStats(days: number): DailyStats[] {
  const stats: DailyStats[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic mock data with some variance
    const baseOrders = 5 + Math.floor(Math.random() * 10);
    const weekendMultiplier = [0, 6].includes(date.getDay()) ? 0.7 : 1;
    const orders = Math.max(1, Math.floor(baseOrders * weekendMultiplier));

    // Average order value between 150k - 500k IDR
    const avgOrderValue = 150000 + Math.random() * 350000;
    const revenue = Math.floor(orders * avgOrderValue);

    stats.push({
      date: date.toISOString().split('T')[0],
      orders,
      revenue,
    });
  }

  return stats;
}

/**
 * Generate mock plan distribution data
 */
function generateMockPlanDistribution(): PlanDistribution[] {
  const plans = [
    { planName: 'VPS Basic', count: 45 },
    { planName: 'VPS Standard', count: 30 },
    { planName: 'VPS Pro', count: 15 },
    { planName: 'VPS Enterprise', count: 8 },
    { planName: 'VPS Ultimate', count: 2 },
  ];

  const total = plans.reduce((sum, p) => sum + p.count, 0);

  return plans.map((plan) => ({
    ...plan,
    percentage: Math.round((plan.count / total) * 100 * 10) / 10,
  }));
}

/**
 * Calculate summary statistics from daily stats
 */
function calculateSummary(stats: DailyStats[]): AnalyticsSummary {
  const totalOrders = stats.reduce((sum, s) => sum + s.orders, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
  const averageOrderValue = totalOrders > 0 ? Math.floor(totalRevenue / totalOrders) : 0;

  // Mock growth rate (comparing to hypothetical previous period)
  const growthRate = -5 + Math.random() * 25; // -5% to +20%

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue,
    growthRate: Math.round(growthRate * 10) / 10,
  };
}

/**
 * Get daily statistics for the specified number of days
 * @param days Number of days to fetch (default: 30)
 */
export async function getDailyStats(days: number = 30): Promise<DailyStats[]> {
  // TODO: Replace with actual API call
  // const response = await localApiClient.get(`/api/admin/analytics/daily?days=${days}`);
  // return response.data.data;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return generateMockDailyStats(days);
}

/**
 * Get plan distribution statistics
 */
export async function getPlanDistribution(): Promise<PlanDistribution[]> {
  // TODO: Replace with actual API call
  // const response = await localApiClient.get('/api/admin/analytics/plans');
  // return response.data.data;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return generateMockPlanDistribution();
}

/**
 * Get analytics summary
 * @param days Number of days to calculate summary for
 */
export async function getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
  const stats = await getDailyStats(days);
  return calculateSummary(stats);
}

export const analyticsService = {
  getDailyStats,
  getPlanDistribution,
  getAnalyticsSummary,
};

export default analyticsService;
