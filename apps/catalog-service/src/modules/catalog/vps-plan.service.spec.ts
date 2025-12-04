import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VpsPlan } from '@prisma/client';

import {
  PlanNotFoundException,
  BillingPeriodNotAllowedException,
  PriceNotSetException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';

import { VpsPlanService, BillingPeriod } from './vps-plan.service';



describe('VpsPlanService - Billing Periods', () => {
  let service: VpsPlanService;
  let prismaService: PrismaService;

  // Mock plan data
  const mockPlanWithAllPeriods: VpsPlan = {
    id: 'plan-uuid-1',
    name: 'basic-plan',
    displayName: 'Basic Plan',
    description: 'A basic VPS plan',
    cpu: 1,
    memoryMb: 1024,
    diskGb: 25,
    bandwidthTb: 1,
    provider: 'digitalocean',
    providerSizeSlug: 's-1vcpu-1gb',
    isActive: true,
    sortOrder: 0,
    tags: [],
    priceHourly: 100,
    priceDaily: 2000,
    priceMonthly: 50000,
    priceYearly: 500000,
    allowDaily: true,
    allowMonthly: true,
    allowYearly: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlanMonthlyOnly: VpsPlan = {
    id: 'plan-uuid-2',
    name: 'monthly-plan',
    displayName: 'Monthly Plan',
    description: 'A monthly-only VPS plan',
    cpu: 2,
    memoryMb: 2048,
    diskGb: 50,
    bandwidthTb: 2,
    provider: 'digitalocean',
    providerSizeSlug: 's-2vcpu-2gb',
    isActive: true,
    sortOrder: 1,
    tags: [],
    priceHourly: null,
    priceDaily: null,
    priceMonthly: 100000,
    priceYearly: null,
    allowDaily: false,
    allowMonthly: true,
    allowYearly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlanNoPrices: VpsPlan = {
    id: 'plan-uuid-3',
    name: 'no-price-plan',
    displayName: 'No Price Plan',
    description: 'A plan without prices',
    cpu: 1,
    memoryMb: 512,
    diskGb: 10,
    bandwidthTb: 0.5,
    provider: 'digitalocean',
    providerSizeSlug: 's-1vcpu-512mb',
    isActive: true,
    sortOrder: 2,
    tags: [],
    priceHourly: null,
    priceDaily: null,
    priceMonthly: null,
    priceYearly: null,
    allowDaily: false,
    allowMonthly: true,
    allowYearly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      vpsPlan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VpsPlanService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VpsPlanService>(VpsPlanService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getPriceForPeriod', () => {
    it('should return daily price when period is DAILY and allowed', () => {
      const price = service.getPriceForPeriod(mockPlanWithAllPeriods, 'DAILY');
      expect(price).toBe(2000);
    });

    it('should return monthly price when period is MONTHLY and allowed', () => {
      const price = service.getPriceForPeriod(mockPlanWithAllPeriods, 'MONTHLY');
      expect(price).toBe(50000);
    });

    it('should return yearly price when period is YEARLY and allowed', () => {
      const price = service.getPriceForPeriod(mockPlanWithAllPeriods, 'YEARLY');
      expect(price).toBe(500000);
    });

    it('should throw BillingPeriodNotAllowedException when daily is not allowed', () => {
      expect(() => {
        service.getPriceForPeriod(mockPlanMonthlyOnly, 'DAILY');
      }).toThrow(BillingPeriodNotAllowedException);
    });

    it('should throw BillingPeriodNotAllowedException when yearly is not allowed', () => {
      expect(() => {
        service.getPriceForPeriod(mockPlanMonthlyOnly, 'YEARLY');
      }).toThrow(BillingPeriodNotAllowedException);
    });

    it('should throw PriceNotSetException when monthly price is not set', () => {
      expect(() => {
        service.getPriceForPeriod(mockPlanNoPrices, 'MONTHLY');
      }).toThrow(PriceNotSetException);
    });

    it('should throw BadRequestException for invalid billing period', () => {
      expect(() => {
        service.getPriceForPeriod(mockPlanWithAllPeriods, 'INVALID' as BillingPeriod);
      }).toThrow(BadRequestException);
    });
  });

  describe('getAvailablePeriods', () => {
    it('should return all periods for plan with all periods enabled', () => {
      const periods = service.getAvailablePeriods(mockPlanWithAllPeriods);
      expect(periods).toEqual(['DAILY', 'MONTHLY', 'YEARLY']);
    });

    it('should return only MONTHLY for monthly-only plan', () => {
      const periods = service.getAvailablePeriods(mockPlanMonthlyOnly);
      expect(periods).toEqual(['MONTHLY']);
    });

    it('should return empty array when no prices are set', () => {
      const periods = service.getAvailablePeriods(mockPlanNoPrices);
      expect(periods).toEqual([]);
    });

    it('should not include period if allowed but price not set', () => {
      const planWithAllowedButNoPrice: VpsPlan = {
        ...mockPlanNoPrices,
        allowDaily: true,
        allowYearly: true,
      };
      const periods = service.getAvailablePeriods(planWithAllowedButNoPrice);
      expect(periods).toEqual([]);
    });
  });

  describe('buildAvailablePeriods', () => {
    it('should build available periods with pricing info', () => {
      const periods = service.buildAvailablePeriods(mockPlanWithAllPeriods);
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({
        period: 'DAILY',
        price: 2000,
        pricePerMonth: 60000, // 2000 * 30
      });
      expect(periods[1]).toEqual({
        period: 'MONTHLY',
        price: 50000,
        pricePerMonth: 50000,
      });
      expect(periods[2]).toEqual({
        period: 'YEARLY',
        price: 500000,
        pricePerMonth: 41667, // Math.round(500000 / 12)
      });
    });

    it('should return only monthly period for monthly-only plan', () => {
      const periods = service.buildAvailablePeriods(mockPlanMonthlyOnly);
      
      expect(periods).toHaveLength(1);
      expect(periods[0]).toEqual({
        period: 'MONTHLY',
        price: 100000,
        pricePerMonth: 100000,
      });
    });

    it('should return empty array when no periods are available', () => {
      const periods = service.buildAvailablePeriods(mockPlanNoPrices);
      expect(periods).toEqual([]);
    });
  });

  describe('updatePlanPricing', () => {
    it('should update plan pricing successfully', async () => {
      const updateDto = {
        priceMonthly: 75000,
        priceYearly: 750000,
        allowDaily: true,
        priceDaily: 3000,
      };

      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(mockPlanMonthlyOnly);
      jest.spyOn(prismaService.vpsPlan, 'update').mockResolvedValue({
        ...mockPlanMonthlyOnly,
        ...updateDto,
      });

      const result = await service.updatePlanPricing(mockPlanMonthlyOnly.id, updateDto);

      expect(result.data.priceMonthly).toBe(75000);
      expect(result.data.priceYearly).toBe(750000);
      expect(result.data.priceDaily).toBe(3000);
      expect(result.data.allowDaily).toBe(true);
    });

    it('should throw PlanNotFoundException when plan not found', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updatePlanPricing('non-existent-id', { priceMonthly: 50000 })
      ).rejects.toThrow(PlanNotFoundException);
    });

    it('should throw BadRequestException when enabling daily without price', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(mockPlanMonthlyOnly);

      await expect(
        service.updatePlanPricing(mockPlanMonthlyOnly.id, { allowDaily: true })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when enabling yearly without price', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(mockPlanMonthlyOnly);

      await expect(
        service.updatePlanPricing(mockPlanMonthlyOnly.id, { allowYearly: true })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow enabling period when price is provided in same request', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(mockPlanMonthlyOnly);
      jest.spyOn(prismaService.vpsPlan, 'update').mockResolvedValue({
        ...mockPlanMonthlyOnly,
        allowDaily: true,
        priceDaily: 3000,
      });

      const result = await service.updatePlanPricing(mockPlanMonthlyOnly.id, {
        allowDaily: true,
        priceDaily: 3000,
      });

      expect(result.data.allowDaily).toBe(true);
      expect(result.data.priceDaily).toBe(3000);
    });
  });

  describe('findById', () => {
    it('should return plan when found', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(mockPlanWithAllPeriods);

      const plan = await service.findById(mockPlanWithAllPeriods.id);

      expect(plan).toEqual(mockPlanWithAllPeriods);
    });

    it('should throw PlanNotFoundException when plan not found', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findUnique').mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(PlanNotFoundException);
    });
  });

  describe('getPlansWithPeriods', () => {
    it('should return active plans with available periods', async () => {
      const mockPlans = [mockPlanWithAllPeriods, mockPlanMonthlyOnly];
      jest.spyOn(prismaService.vpsPlan, 'findMany').mockResolvedValue(mockPlans);

      const result = await service.getPlansWithPeriods();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].availablePeriods).toHaveLength(3);
      expect(result.data[1].availablePeriods).toHaveLength(1);
    });

    it('should only return active plans', async () => {
      jest.spyOn(prismaService.vpsPlan, 'findMany').mockResolvedValue([]);

      const result = await service.getPlansWithPeriods();

      expect(prismaService.vpsPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result.data).toHaveLength(0);
    });
  });
});
