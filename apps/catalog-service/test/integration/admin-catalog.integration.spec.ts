import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanDuration, DiscountType } from '@prisma/client';
import request from 'supertest';

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { CatalogModule } from '../../src/modules/catalog/catalog.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
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
  createTestImage,
} from '../helpers/test-fixtures';

describe('Admin Catalog Integration Tests', () => {
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

  describe('CRUD Plans', () => {
    it('should create a plan with pricing', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/catalog/plans')
        .send({
          name: 'new-plan',
          displayName: 'New Plan',
          description: 'A new test plan',
          cpu: 2,
          memoryMb: 2048,
          diskGb: 50,
          bandwidthTb: 2,
          provider: 'digitalocean',
          providerSizeSlug: 's-2vcpu-2gb',
          isActive: true,
          pricings: [
            { duration: 'MONTHLY', price: 100000, cost: 60000 },
            { duration: 'YEARLY', price: 1000000, cost: 600000 },
          ],
        })
        .expect(201);

      expect(response.body.data.name).toBe('new-plan');
      expect(response.body.data.pricings).toHaveLength(2);
    });

    it('should get all plans (admin)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestPlan(prisma, { name: 'plan-1', isActive: true });
      await createTestPlan(prisma, { name: 'plan-2', isActive: false });

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/catalog/plans')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should update a plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, {
        name: 'original-plan',
        displayName: 'Original',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/plans/${plan.id}`)
        .send({
          displayName: 'Updated Plan',
          isActive: false,
        })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Plan');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should delete a plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'to-delete' });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/catalog/plans/${plan.id}`)
        .expect(200);

      const deleted = await prisma.vpsPlan.findUnique({ where: { id: plan.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Plan Pricing Management', () => {
    it('should add pricing to a plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'pricing-test' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/catalog/plans/${plan.id}/pricings`)
        .send({
          duration: 'MONTHLY',
          price: 150000,
          cost: 90000,
        })
        .expect(201);

      expect(response.body.data.price).toBe(150000);
      expect(response.body.data.duration).toBe('MONTHLY');
    });

    it('should update pricing', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'update-pricing' });
      const pricing = await createTestPricing(prisma, {
        planId: plan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/plans/${plan.id}/pricings/${pricing.id}`)
        .send({ price: 120000 })
        .expect(200);

      expect(response.body.data.price).toBe(120000);
    });

    it('should delete pricing', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'delete-pricing' });
      const pricing = await createTestPricing(prisma, {
        planId: plan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/catalog/plans/${plan.id}/pricings/${pricing.id}`)
        .expect(200);

      const deleted = await prisma.planPricing.findUnique({
        where: { id: pricing.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('Plan-Image Mapping', () => {
    it('should link image to plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'link-image-test' });
      const image = await createTestImage(prisma, { providerSlug: 'test-os' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/catalog/plans/${plan.id}/images`)
        .send({ imageId: image.id })
        .expect(201);

      expect(response.body.data.image.id).toBe(image.id);
    });

    it('should unlink image from plan', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const plan = await createTestPlan(prisma, { name: 'unlink-image-test' });
      const image = await createTestImage(prisma, { providerSlug: 'unlink-os' });

      await prisma.vpsPlanImage.create({
        data: { planId: plan.id, imageId: image.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/catalog/plans/${plan.id}/images/${image.id}`)
        .expect(200);

      const mapping = await prisma.vpsPlanImage.findUnique({
        where: { planId_imageId: { planId: plan.id, imageId: image.id } },
      });
      expect(mapping).toBeNull();
    });
  });

  describe('CRUD Images', () => {
    it('should create an image', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/catalog/images')
        .send({
          provider: 'digitalocean',
          providerSlug: 'new-ubuntu',
          displayName: 'New Ubuntu',
          category: 'OS',
          version: '24.04',
        })
        .expect(201);

      expect(response.body.data.displayName).toBe('New Ubuntu');
      expect(response.body.data.providerSlug).toBe('new-ubuntu');
    });

    it('should update an image', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const image = await createTestImage(prisma, {
        providerSlug: 'update-test',
        displayName: 'Original Name',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/images/${image.id}`)
        .send({ displayName: 'Updated Name' })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Name');
    });

    it('should delete an image', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const image = await createTestImage(prisma, { providerSlug: 'delete-test' });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/catalog/images/${image.id}`)
        .expect(200);

      const deleted = await prisma.vpsImage.findUnique({ where: { id: image.id } });
      expect(deleted).toBeNull();
    });
  });
});
