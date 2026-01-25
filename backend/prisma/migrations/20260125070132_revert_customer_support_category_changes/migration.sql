/*
  Warnings:

  - You are about to drop the column `categoryId` on the `customer_support_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "customer_support_requests" DROP CONSTRAINT "customer_support_requests_categoryId_fkey";

-- DropIndex
DROP INDEX "customer_support_requests_categoryId_idx";

-- AlterTable
ALTER TABLE "customer_support_requests" DROP COLUMN "categoryId";
