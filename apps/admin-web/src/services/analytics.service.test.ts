import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDailyStats,
  getPlanDistribution,
  getAnalyticsSummary,
  analyticsService,
} from './analytics.service';

describe('analytics.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDailyStats', () => {
    it('should return daily stats for default 30 days', async () => {
      const promise = getDailyStats();
      vi.advanceTimersByTime(500); // Advance past the simulated delay
      const result = await promise;

      expect(result).toHaveLength(30);
    });

    it('should return daily stats for custom number of days', async () => {
      const promise = getDailyStats(7);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveLength(7);
    });

    it('should have correct data structure', async () => {
      const promise = getDailyStats(1);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('orders');
      expect(result[0]).toHaveProperty('revenue');
      expect(typeof result[0].date).toBe('string');
      expect(typeof result[0].orders).toBe('number');
      expect(typeof result[0].revenue).toBe('number');
    });

    it('should have valid date format (YYYY-MM-DD)', async () => {
      const promise = getDailyStats(1);
      vi.advanceTimersByTime(500);
      const result = await promise;

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      expect(result[0].date).toMatch(datePattern);
    });

    it('should have non-negative orders count', async () => {
      const promise = getDailyStats(30);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.forEach((stat) => {
        expect(stat.orders).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-negative revenue', async () => {
      const promise = getDailyStats(30);
      vi.advanceTimersByTime(500);
      const result = await promise;

      result.forEach((stat) => {
        expect(stat.revenue).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return dates in chronological order', async () => {
      const promise = getDailyStats(5);
      vi.advanceTimersByTime(500);
      const result = await promise;

      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].date);
        const currDate = new Date(result[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });
  });

  describe('getPlanDistribution', () => {
    it('should return plan distribution array', async () => {
      const promise = getPlanDistribution();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have correct data structure', async () => {
      const promise = getPlanDistribution();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((plan) => {
        expect(plan).toHaveProperty('planName');
        expect(plan).toHaveProperty('count');
        expect(plan).toHaveProperty('percentage');
        expect(typeof plan.planName).toBe('string');
        expect(typeof plan.count).toBe('number');
        expect(typeof plan.percentage).toBe('number');
      });
    });

    it('should have non-negative counts', async () => {
      const promise = getPlanDistribution();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((plan) => {
        expect(plan.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid percentages (0-100)', async () => {
      const promise = getPlanDistribution();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((plan) => {
        expect(plan.percentage).toBeGreaterThanOrEqual(0);
        expect(plan.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should have percentages that sum to approximately 100', async () => {
      const promise = getPlanDistribution();
      vi.advanceTimersByTime(300);
      const result = await promise;

      const totalPercentage = result.reduce((sum, plan) => sum + plan.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary', async () => {
      const promise = getAnalyticsSummary();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('averageOrderValue');
      expect(result).toHaveProperty('growthRate');
    });

    it('should have correct data types', async () => {
      const promise = getAnalyticsSummary();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(typeof result.totalOrders).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.averageOrderValue).toBe('number');
      expect(typeof result.growthRate).toBe('number');
    });

    it('should have non-negative total orders', async () => {
      const promise = getAnalyticsSummary();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.totalOrders).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative total revenue', async () => {
      const promise = getAnalyticsSummary();
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average order value correctly', async () => {
      const promise = getAnalyticsSummary();
      vi.advanceTimersByTime(500);
      const result = await promise;

      if (result.totalOrders > 0) {
        expect(result.averageOrderValue).toBeGreaterThan(0);
      } else {
        expect(result.averageOrderValue).toBe(0);
      }
    });

    it('should accept custom days parameter', async () => {
      const promise = getAnalyticsSummary(7);
      vi.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.totalOrders).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyticsService export', () => {
    it('should export all functions', () => {
      expect(analyticsService.getDailyStats).toBe(getDailyStats);
      expect(analyticsService.getPlanDistribution).toBe(getPlanDistribution);
      expect(analyticsService.getAnalyticsSummary).toBe(getAnalyticsSummary);
    });
  });
});
