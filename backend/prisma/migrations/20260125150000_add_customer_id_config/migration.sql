-- CreateTable
CREATE TABLE "customer_id_configs" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_id_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_id_configs_prefix_key" ON "customer_id_configs"("prefix");