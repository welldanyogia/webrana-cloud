import { PrismaClient, OrderStatus, PlanDuration, ItemType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding order-service database...');

  // Clean existing data
  await prisma.statusHistory.deleteMany();
  await prisma.provisioningTask.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // Sample user IDs (these would come from auth-service in production)
  const sampleUserId1 = '11111111-1111-1111-1111-111111111111';
  const sampleUserId2 = '22222222-2222-2222-2222-222222222222';

  // Sample plan/image IDs (these would come from catalog-service in production)
  const samplePlanId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const samplePlanId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const sampleImageId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      userId: sampleUserId1,
      planId: samplePlanId1,
      planName: 'VPS Basic',
      imageId: sampleImageId1,
      imageName: 'Ubuntu 22.04 LTS',
      duration: PlanDuration.MONTHLY,
      basePrice: 150000,
      promoDiscount: 15000,
      couponCode: null,
      couponDiscount: 0,
      finalPrice: 135000,
      currency: 'IDR',
      status: OrderStatus.ACTIVE,
      paidAt: new Date(),
      items: {
        create: [
          {
            itemType: ItemType.PLAN,
            referenceId: samplePlanId1,
            description: 'VPS Basic - 1 vCPU, 1GB RAM, 25GB SSD',
            unitPrice: 150000,
            quantity: 1,
            totalPrice: 150000,
          },
        ],
      },
      provisioningTask: {
        create: {
          status: 'SUCCESS',
          doRegion: 'sgp1',
          doSize: 's-1vcpu-1gb',
          doImage: 'ubuntu-22-04-x64',
          dropletId: '123456789',
          dropletName: 'vps-order1',
          ipv4Public: '128.199.123.45',
          ipv4Private: '10.130.0.2',
          dropletStatus: 'active',
          dropletTags: ['webrana', 'production'],
          dropletCreatedAt: new Date(),
          startedAt: new Date(Date.now() - 60000),
          completedAt: new Date(),
        },
      },
      statusHistory: {
        create: [
          {
            previousStatus: '',
            newStatus: OrderStatus.PENDING_PAYMENT,
            actor: 'system',
            reason: 'Order created',
          },
          {
            previousStatus: OrderStatus.PENDING_PAYMENT,
            newStatus: OrderStatus.PAID,
            actor: 'admin:admin-user-id',
            reason: 'Payment verified manually',
          },
          {
            previousStatus: OrderStatus.PAID,
            newStatus: OrderStatus.PROVISIONING,
            actor: 'system',
            reason: 'Provisioning started',
          },
          {
            previousStatus: OrderStatus.PROVISIONING,
            newStatus: OrderStatus.ACTIVE,
            actor: 'system',
            reason: 'Droplet provisioned successfully',
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: sampleUserId1,
      planId: samplePlanId2,
      planName: 'VPS Pro',
      imageId: sampleImageId1,
      imageName: 'Ubuntu 22.04 LTS',
      duration: PlanDuration.MONTHLY,
      basePrice: 300000,
      promoDiscount: 0,
      couponCode: 'HEMAT20',
      couponDiscount: 60000,
      finalPrice: 240000,
      currency: 'IDR',
      status: OrderStatus.PENDING_PAYMENT,
      items: {
        create: [
          {
            itemType: ItemType.PLAN,
            referenceId: samplePlanId2,
            description: 'VPS Pro - 2 vCPU, 4GB RAM, 80GB SSD',
            unitPrice: 300000,
            quantity: 1,
            totalPrice: 300000,
          },
        ],
      },
      statusHistory: {
        create: [
          {
            previousStatus: '',
            newStatus: OrderStatus.PENDING_PAYMENT,
            actor: 'system',
            reason: 'Order created',
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      userId: sampleUserId2,
      planId: samplePlanId1,
      planName: 'VPS Basic',
      imageId: sampleImageId1,
      imageName: 'Ubuntu 22.04 LTS',
      duration: PlanDuration.ANNUAL,
      basePrice: 1500000,
      promoDiscount: 150000,
      couponCode: null,
      couponDiscount: 0,
      finalPrice: 1350000,
      currency: 'IDR',
      status: OrderStatus.FAILED,
      paidAt: new Date(),
      items: {
        create: [
          {
            itemType: ItemType.PLAN,
            referenceId: samplePlanId1,
            description: 'VPS Basic - 1 vCPU, 1GB RAM, 25GB SSD (Annual)',
            unitPrice: 1500000,
            quantity: 1,
            totalPrice: 1500000,
          },
        ],
      },
      provisioningTask: {
        create: {
          status: 'FAILED',
          doRegion: 'sgp1',
          doSize: 's-1vcpu-1gb',
          doImage: 'ubuntu-22-04-x64',
          errorCode: 'PROVISIONING_TIMEOUT',
          errorMessage: 'Droplet did not become active within 5 minutes',
          attempts: 60,
          startedAt: new Date(Date.now() - 300000),
          completedAt: new Date(),
        },
      },
      statusHistory: {
        create: [
          {
            previousStatus: '',
            newStatus: OrderStatus.PENDING_PAYMENT,
            actor: 'system',
            reason: 'Order created',
          },
          {
            previousStatus: OrderStatus.PENDING_PAYMENT,
            newStatus: OrderStatus.PAID,
            actor: 'admin:admin-user-id',
            reason: 'Payment verified manually',
          },
          {
            previousStatus: OrderStatus.PAID,
            newStatus: OrderStatus.PROVISIONING,
            actor: 'system',
            reason: 'Provisioning started',
          },
          {
            previousStatus: OrderStatus.PROVISIONING,
            newStatus: OrderStatus.FAILED,
            actor: 'system',
            reason: 'Provisioning failed: timeout',
          },
        ],
      },
    },
  });

  console.log('Seed completed!');
  console.log(`Created orders: ${order1.id}, ${order2.id}, ${order3.id}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
