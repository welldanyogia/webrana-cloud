-- CreateTable
CREATE TABLE "do_accounts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "api_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "droplet_limit" INTEGER NOT NULL DEFAULT 25,
    "droplet_count" INTEGER NOT NULL DEFAULT 0,
    "health_status" VARCHAR(20) NOT NULL DEFAULT 'unknown',
    "last_health_check" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "do_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "do_accounts_is_active_health_status_idx" ON "do_accounts"("is_active", "health_status");

-- AddColumn (if not exists)
ALTER TABLE "provisioning_tasks" ADD COLUMN IF NOT EXISTS "do_account_id" UUID;

-- AddForeignKey
ALTER TABLE "provisioning_tasks" ADD CONSTRAINT "provisioning_tasks_do_account_id_fkey" FOREIGN KEY ("do_account_id") REFERENCES "do_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
