import { PrismaClient, PlanDuration, DiscountType, ImageCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding catalog-service database...');

  // =====================================================
  // VPS Images (OS)
  // =====================================================
  const ubuntuImage = await prisma.vpsImage.upsert({
    where: { provider_providerSlug: { provider: 'digitalocean', providerSlug: 'ubuntu-22-04-x64' } },
    update: {
      displayName: 'Ubuntu 22.04 LTS',
      description: 'Ubuntu 22.04 LTS x64',
      isActive: true,
    },
    create: {
      provider: 'digitalocean',
      providerSlug: 'ubuntu-22-04-x64',
      displayName: 'Ubuntu 22.04 LTS',
      description: 'Ubuntu 22.04 LTS x64',
      category: ImageCategory.OS,
      version: '22.04',
      isActive: true,
      sortOrder: 1,
    },
  });

  const ubuntu24Image = await prisma.vpsImage.upsert({
    where: { provider_providerSlug: { provider: 'digitalocean', providerSlug: 'ubuntu-24-04-x64' } },
    update: {
      displayName: 'Ubuntu 24.04 LTS',
      description: 'Ubuntu 24.04 LTS x64',
      isActive: true,
    },
    create: {
      provider: 'digitalocean',
      providerSlug: 'ubuntu-24-04-x64',
      displayName: 'Ubuntu 24.04 LTS',
      description: 'Ubuntu 24.04 LTS x64',
      category: ImageCategory.OS,
      version: '24.04',
      isActive: true,
      sortOrder: 2,
    },
  });

  const debianImage = await prisma.vpsImage.upsert({
    where: { provider_providerSlug: { provider: 'digitalocean', providerSlug: 'debian-12-x64' } },
    update: {
      displayName: 'Debian 12',
      description: 'Debian 12 x64',
      isActive: true,
    },
    create: {
      provider: 'digitalocean',
      providerSlug: 'debian-12-x64',
      displayName: 'Debian 12',
      description: 'Debian 12 x64',
      category: ImageCategory.OS,
      version: '12',
      isActive: true,
      sortOrder: 3,
    },
  });

  const centosImage = await prisma.vpsImage.upsert({
    where: { provider_providerSlug: { provider: 'digitalocean', providerSlug: 'centos-stream-9-x64' } },
    update: {
      displayName: 'CentOS Stream 9',
      description: 'CentOS Stream 9 x64',
      isActive: true,
    },
    create: {
      provider: 'digitalocean',
      providerSlug: 'centos-stream-9-x64',
      displayName: 'CentOS Stream 9',
      description: 'CentOS Stream 9 x64',
      category: ImageCategory.OS,
      version: '9',
      isActive: true,
      sortOrder: 4,
    },
  });

  console.log('Created VPS Images:', { ubuntuImage, ubuntu24Image, debianImage, centosImage });

  // Create VPS Plans
  const basicPlan = await prisma.vpsPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'basic',
      displayName: 'Basic VPS',
      description: 'Entry-level VPS for small projects',
      cpu: 1,
      memoryMb: 1024,
      diskGb: 25,
      bandwidthTb: 1,
      provider: 'digitalocean',
      providerSizeSlug: 's-1vcpu-1gb',
      isActive: true,
      sortOrder: 1,
      tags: ['starter', 'budget'],
    },
  });

  const standardPlan = await prisma.vpsPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'standard',
      displayName: 'Standard VPS',
      description: 'Balanced VPS for most workloads',
      cpu: 2,
      memoryMb: 2048,
      diskGb: 50,
      bandwidthTb: 2,
      provider: 'digitalocean',
      providerSizeSlug: 's-2vcpu-2gb',
      isActive: true,
      sortOrder: 2,
      tags: ['popular', 'recommended'],
    },
  });

  const proPlan = await prisma.vpsPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'pro',
      displayName: 'Pro VPS',
      description: 'High-performance VPS for demanding applications',
      cpu: 4,
      memoryMb: 8192,
      diskGb: 160,
      bandwidthTb: 5,
      provider: 'digitalocean',
      providerSizeSlug: 's-4vcpu-8gb',
      isActive: true,
      sortOrder: 3,
      tags: ['performance', 'business'],
    },
  });

  console.log('Created VPS Plans:', { basicPlan, standardPlan, proPlan });

  // Create Plan Pricings
  const pricings = await Promise.all([
    // Basic Plan Pricing
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: basicPlan.id, duration: PlanDuration.MONTHLY } },
      update: {},
      create: {
        planId: basicPlan.id,
        duration: PlanDuration.MONTHLY,
        price: 50000,
        cost: 30000,
        isActive: true,
      },
    }),
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: basicPlan.id, duration: PlanDuration.YEARLY } },
      update: {},
      create: {
        planId: basicPlan.id,
        duration: PlanDuration.YEARLY,
        price: 500000,
        cost: 300000,
        isActive: true,
      },
    }),
    // Standard Plan Pricing
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: standardPlan.id, duration: PlanDuration.MONTHLY } },
      update: {},
      create: {
        planId: standardPlan.id,
        duration: PlanDuration.MONTHLY,
        price: 100000,
        cost: 60000,
        isActive: true,
      },
    }),
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: standardPlan.id, duration: PlanDuration.YEARLY } },
      update: {},
      create: {
        planId: standardPlan.id,
        duration: PlanDuration.YEARLY,
        price: 1000000,
        cost: 600000,
        isActive: true,
      },
    }),
    // Pro Plan Pricing
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: proPlan.id, duration: PlanDuration.MONTHLY } },
      update: {},
      create: {
        planId: proPlan.id,
        duration: PlanDuration.MONTHLY,
        price: 400000,
        cost: 250000,
        isActive: true,
      },
    }),
    prisma.planPricing.upsert({
      where: { planId_duration: { planId: proPlan.id, duration: PlanDuration.YEARLY } },
      update: {},
      create: {
        planId: proPlan.id,
        duration: PlanDuration.YEARLY,
        price: 4000000,
        cost: 2500000,
        isActive: true,
      },
    }),
  ]);

  console.log('Created Plan Pricings:', pricings.length);

  // Create active promo for Standard Plan
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const promo = await prisma.planPromo.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      planId: standardPlan.id,
      name: 'Launch Discount',
      discountType: DiscountType.PERCENT,
      discountValue: 20,
      startDate: now,
      endDate: endDate,
      isActive: true,
    },
  });

  console.log('Created Promo:', promo);

  // Link images to plans (all images available for all plans)
  const allImages = [ubuntuImage, ubuntu24Image, debianImage, centosImage];
  const allPlans = [basicPlan, standardPlan, proPlan];
  
  const planImageMappings = await Promise.all(
    allPlans.flatMap(plan =>
      allImages.map(image =>
        prisma.vpsPlanImage.upsert({
          where: { planId_imageId: { planId: plan.id, imageId: image.id } },
          update: {},
          create: { planId: plan.id, imageId: image.id },
        })
      )
    )
  );

  console.log('Created Plan-Image mappings:', planImageMappings.length);

  // Create sample Coupon
  const couponEndDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      description: 'Get 10% off on your first order',
      discountType: DiscountType.PERCENT,
      discountValue: 10,
      minOrderAmount: 50000,
      maxDiscountAmount: 100000,
      maxTotalRedemptions: 1000,
      maxRedemptionsPerUser: 1,
      startAt: now,
      endAt: couponEndDate,
      isActive: true,
    },
  });

  console.log('Created Coupon:', coupon);

  // Create a fixed discount coupon
  const fixedCoupon = await prisma.coupon.upsert({
    where: { code: 'FLAT25K' },
    update: {},
    create: {
      code: 'FLAT25K',
      name: 'Flat 25K Discount',
      description: 'Get Rp 25,000 off on orders above Rp 100,000',
      discountType: DiscountType.FIXED,
      discountValue: 25000,
      minOrderAmount: 100000,
      maxTotalRedemptions: 500,
      maxRedemptionsPerUser: 2,
      startAt: now,
      endAt: couponEndDate,
      isActive: true,
    },
  });

  console.log('Created Fixed Coupon:', fixedCoupon);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
