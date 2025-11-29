import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Auth Service Seed Script
 * 
 * Seeds the auth database with:
 * - Default admin user
 * - Default super admin user (for initial setup)
 * 
 * NOTE: This script uses upsert operations to be idempotent.
 * Running it multiple times will not create duplicate records.
 */
async function main() {
  console.log('Seeding auth-service database...');

  const SALT_ROUNDS = 10;

  // =====================================================
  // Admin Users
  // =====================================================

  // Super Admin (for initial production setup)
  // IMPORTANT: Change this password immediately after first login!
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const superAdminHash = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@webrana.cloud' },
    update: {
      fullName: 'Super Admin',
      role: UserRole.super_admin,
      status: UserStatus.active,
    },
    create: {
      email: 'superadmin@webrana.cloud',
      passwordHash: superAdminHash,
      fullName: 'Super Admin',
      role: UserRole.super_admin,
      status: UserStatus.active,
      timezone: 'Asia/Jakarta',
      language: 'id',
    },
  });

  console.log('Created Super Admin:', { id: superAdmin.id, email: superAdmin.email });

  // Regular Admin
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@webrana.cloud' },
    update: {
      fullName: 'Admin',
      role: UserRole.admin,
      status: UserStatus.active,
    },
    create: {
      email: 'admin@webrana.cloud',
      passwordHash: adminHash,
      fullName: 'Admin',
      role: UserRole.admin,
      status: UserStatus.active,
      timezone: 'Asia/Jakarta',
      language: 'id',
    },
  });

  console.log('Created Admin:', { id: admin.id, email: admin.email });

  // =====================================================
  // Demo Customer (for development/testing only)
  // =====================================================
  if (process.env.NODE_ENV !== 'production') {
    const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD || 'Customer123!';
    const customerHash = await bcrypt.hash(customerPassword, SALT_ROUNDS);

    const customer = await prisma.user.upsert({
      where: { email: 'customer@webrana.cloud' },
      update: {
        fullName: 'Demo Customer',
        role: UserRole.customer,
        status: UserStatus.active,
      },
      create: {
        email: 'customer@webrana.cloud',
        passwordHash: customerHash,
        fullName: 'Demo Customer',
        phoneNumber: '+6281234567890',
        role: UserRole.customer,
        status: UserStatus.active,
        timezone: 'Asia/Jakarta',
        language: 'id',
      },
    });

    console.log('Created Demo Customer:', { id: customer.id, email: customer.email });
  }

  console.log('Auth service seeding completed successfully!');
  console.log('');
  console.log('==============================================');
  console.log('IMPORTANT SECURITY NOTICE:');
  console.log('==============================================');
  console.log('Default admin passwords have been set.');
  console.log('Please change these passwords immediately after first login!');
  console.log('');
  console.log('For production, set these environment variables:');
  console.log('  - SUPER_ADMIN_PASSWORD');
  console.log('  - ADMIN_PASSWORD');
  console.log('==============================================');
}

main()
  .catch((e) => {
    console.error('Auth service seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
