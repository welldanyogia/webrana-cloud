import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PlanDuration, DiscountType } from '@prisma/client';
import {
  startDatabase,
  stopDatabase,
  cleanDatabase,
  getPrismaClient,
  isDockerAvailable,
} from '../helpers/test-database';
import {
  createTestPlan,
  createTestPricing,
  createTestPromo,
  createTestImage,
  linkImageToPlan,
} from '../helpers/test-fixtures';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { CatalogModule } from '../../src/modules/catalog/catalog.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Catalog Integration Tests', () => {
  let app: INestApplication;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      return;
    }

    await startDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        CatalogModule,
      ],
      providers: [
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaClient())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();
  }, 180000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dockerAvailable) {
      await stopDatabase();
    }
  });

  beforeEach(async () => {
    if (!dockerAvailable) return;
    await cleanDatabase();
  });

  describe('GET /api/v1/catalog/plans', () => {
    it('should return only active plans', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const activePlan = await createTestPlan(prisma, {
        name: 'active-plan',
        displayName: 'Active Plan',
        isActive: true,
      });
      await createTestPricing(prisma, {
        planId: activePlan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
      });

      const inactivePlan = await createTestPlan(prisma, {
        name: 'inactive-plan',
        displayName: 'Inactive Plan',
        isActive: false,
      });
      await createTestPricing(prisma, {
        planId: inactivePlan.id,
        duration: PlanDuration.MONTHLY,
        price: 50000,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/plans')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('active-plan');
    });

    it('should calculate promo correctly', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const plan = await createTestPlan(prisma, {
        name: 'promo-plan',
        displayName: 'Promo Plan',
        isActive: true,
      });

      await createTestPricing(prisma, {
        planId: plan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
      });

      await createTestPromo(prisma, {
        planId: plan.id,
        name: 'Test Promo',
        discountType: DiscountType.PERCENT,
        discountValue: 20,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/plans')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const planData = response.body.data[0];
      expect(planData.pricings[0].price).toBe(100000);
      expect(planData.pricings[0].priceAfterPromo).toBe(80000);
      expect(planData.pricings[0].activePromo).toBeDefined();
      expect(planData.pricings[0].activePromo.discountValue).toBe(20);
    });

    it('should not include expired promo', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const plan = await createTestPlan(prisma, {
        name: 'expired-promo-plan',
        isActive: true,
      });

      await createTestPricing(prisma, {
        planId: plan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 5);

      await createTestPromo(prisma, {
        planId: plan.id,
        name: 'Expired Promo',
        discountType: DiscountType.PERCENT,
        discountValue: 20,
        startDate: pastDate,
        endDate: endDate,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/plans')
        .expect(200);

      expect(response.body.data[0].pricings[0].priceAfterPromo).toBeNull();
      expect(response.body.data[0].pricings[0].activePromo).toBeNull();
    });
  });

  describe('GET /api/v1/catalog/images', () => {
    it('should return all active images without planId', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestImage(prisma, {
        providerSlug: 'ubuntu-22-04',
        displayName: 'Ubuntu 22.04',
        isActive: true,
      });

      await createTestImage(prisma, {
        providerSlug: 'debian-12',
        displayName: 'Debian 12',
        isActive: true,
      });

      await createTestImage(prisma, {
        providerSlug: 'centos-inactive',
        displayName: 'CentOS (Inactive)',
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/images')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should return only linked images with planId', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const plan = await createTestPlan(prisma, { isActive: true });

      const linkedImage = await createTestImage(prisma, {
        providerSlug: 'linked-image',
        displayName: 'Linked Image',
        isActive: true,
      });

      const unlinkedImage = await createTestImage(prisma, {
        providerSlug: 'unlinked-image',
        displayName: 'Unlinked Image',
        isActive: true,
      });

      await linkImageToPlan(prisma, plan.id, linkedImage.id);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/catalog/images?planId=${plan.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].providerSlug).toBe('linked-image');
    });
  });

  describe('GET /api/v1/catalog/plans/:id', () => {
    it('should return plan by id', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const plan = await createTestPlan(prisma, {
        name: 'specific-plan',
        displayName: 'Specific Plan',
        isActive: true,
      });

      await createTestPricing(prisma, {
        planId: plan.id,
        duration: PlanDuration.MONTHLY,
        price: 150000,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/catalog/plans/${plan.id}`)
        .expect(200);

      expect(response.body.data.name).toBe('specific-plan');
      expect(response.body.data.pricings).toHaveLength(1);
    });

    it('should return 404 for non-existent plan', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/plans/00000000-0000-0000-0000-000000000099')
        .expect(404);

      expect(response.body.error.code).toBe('PLAN_NOT_FOUND');
    });

    it('should return 404 for inactive plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const plan = await createTestPlan(prisma, {
        name: 'inactive-plan',
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/catalog/plans/${plan.id}`)
        .expect(404);

      expect(response.body.error.code).toBe('PLAN_NOT_FOUND');
    });
  });
});
