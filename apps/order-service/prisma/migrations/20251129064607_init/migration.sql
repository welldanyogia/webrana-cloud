-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROVISIONING', 'ACTIVE', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PlanDuration" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PLAN', 'IMAGE', 'ADDON');

-- CreateEnum
CREATE TYPE "ProvisioningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_name" VARCHAR(255) NOT NULL,
    "image_id" TEXT NOT NULL,
    "image_name" VARCHAR(255) NOT NULL,
    "duration" "PlanDuration" NOT NULL,
    "base_price" INTEGER NOT NULL,
    "promo_discount" INTEGER NOT NULL DEFAULT 0,
    "coupon_code" VARCHAR(50),
    "coupon_discount" INTEGER NOT NULL DEFAULT 0,
    "final_price" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'IDR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_price" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_tasks" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "ProvisioningStatus" NOT NULL DEFAULT 'PENDING',
    "do_region" VARCHAR(50),
    "do_size" VARCHAR(100),
    "do_image" VARCHAR(100),
    "droplet_id" VARCHAR(50),
    "droplet_name" VARCHAR(255),
    "ipv4_public" VARCHAR(45),
    "ipv4_private" VARCHAR(45),
    "droplet_status" VARCHAR(50),
    "droplet_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "droplet_created_at" TIMESTAMPTZ,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "provisioning_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "previous_status" VARCHAR(50) NOT NULL,
    "new_status" VARCHAR(50) NOT NULL,
    "actor" VARCHAR(255) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_tasks_order_id_key" ON "provisioning_tasks"("order_id");

-- CreateIndex
CREATE INDEX "provisioning_tasks_status_idx" ON "provisioning_tasks"("status");

-- CreateIndex
CREATE INDEX "provisioning_tasks_droplet_id_idx" ON "provisioning_tasks"("droplet_id");

-- CreateIndex
CREATE INDEX "status_history_order_id_idx" ON "status_history"("order_id");

-- CreateIndex
CREATE INDEX "status_history_created_at_idx" ON "status_history"("created_at");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_tasks" ADD CONSTRAINT "provisioning_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
