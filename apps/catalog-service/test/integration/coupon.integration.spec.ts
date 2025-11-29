import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DiscountType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  startDatabase,
  stopDatabase,
  cleanDatabase,
  getPrismaClient,
  isDockerAvailable,
} from '../helpers/test-database';
import {
  createTestPlan,
  createTestCoupon,
  addCouponPlanRestriction,
  addCouponUserRestriction,
  createCouponRedemption,
} from '../helpers/test-fixtures';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { CouponModule } from '../../src/modules/coupon/coupon.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Coupon Integration Tests', () => {
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
        CouponModule,
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

  describe('POST /api/v1/coupons/validate', () => {
    it('should validate coupon successfully', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestCoupon(prisma, {
        code: 'VALID10',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'VALID10',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.discountAmount).toBe(10000);
      expect(response.body.data.finalPrice).toBe(90000);
      expect(response.body.data.coupon.code).toBe('VALID10');
    });

    it('should return NOT_FOUND for non-existent coupon', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'NOTEXIST',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('NOT_FOUND');
    });

    it('should return EXPIRED for expired coupon', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 5);

      await createTestCoupon(prisma, {
        code: 'EXPIRED',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        startAt: pastDate,
        endAt: endDate,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'EXPIRED',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('EXPIRED');
    });

    it('should return BEFORE_START for coupon not yet started', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await createTestCoupon(prisma, {
        code: 'FUTURE',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        startAt: futureDate,
        endAt: endDate,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'FUTURE',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('BEFORE_START');
    });

    it('should return LIMIT_GLOBAL_REACHED when max redemptions reached', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const coupon = await createTestCoupon(prisma, {
        code: 'LIMITED',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        maxTotalRedemptions: 2,
        isActive: true,
      });

      await createCouponRedemption(prisma, coupon.id, uuidv4(), 10000);
      await createCouponRedemption(prisma, coupon.id, uuidv4(), 10000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'LIMITED',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('LIMIT_GLOBAL_REACHED');
    });

    it('should return LIMIT_PER_USER_REACHED when user limit reached', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const userId = uuidv4();

      const coupon = await createTestCoupon(prisma, {
        code: 'USERLIMIT',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        maxRedemptionsPerUser: 1,
        isActive: true,
      });

      await createCouponRedemption(prisma, coupon.id, userId, 10000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'USERLIMIT',
          userId: userId,
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('LIMIT_PER_USER_REACHED');
    });

    it('should return PLAN_NOT_ALLOWED when plan is restricted', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const allowedPlan = await createTestPlan(prisma, { isActive: true });
      const restrictedPlan = await createTestPlan(prisma, { isActive: true });

      const coupon = await createTestCoupon(prisma, {
        code: 'PLANONLY',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        isActive: true,
      });

      await addCouponPlanRestriction(prisma, coupon.id, allowedPlan.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'PLANONLY',
          planId: restrictedPlan.id,
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('PLAN_NOT_ALLOWED');
    });

    it('should return USER_NOT_ALLOWED when user is restricted', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const allowedUserId = uuidv4();
      const restrictedUserId = uuidv4();

      const coupon = await createTestCoupon(prisma, {
        code: 'USERONLY',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        isActive: true,
      });

      await addCouponUserRestriction(prisma, coupon.id, allowedUserId);

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'USERONLY',
          userId: restrictedUserId,
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('USER_NOT_ALLOWED');
    });

    it('should validate fixed discount correctly', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestCoupon(prisma, {
        code: 'FIXED25K',
        discountType: DiscountType.FIXED,
        discountValue: 25000,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'FIXED25K',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.discountAmount).toBe(25000);
      expect(response.body.data.finalPrice).toBe(75000);
    });

    it('should respect maxDiscountAmount for percent coupon', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestCoupon(prisma, {
        code: 'MAXCAP',
        discountType: DiscountType.PERCENT,
        discountValue: 50,
        maxDiscountAmount: 20000,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'MAXCAP',
          amount: 100000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.discountAmount).toBe(20000);
      expect(response.body.data.finalPrice).toBe(80000);
    });

    it('should return MIN_AMOUNT_NOT_MET when order below minimum', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      await createTestCoupon(prisma, {
        code: 'MINORDER',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        minOrderAmount: 100000,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'MINORDER',
          amount: 50000,
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.reason).toBe('MIN_AMOUNT_NOT_MET');
    });
  });
});
