-- AlterTable
ALTER TABLE "customer_support_requests" ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "customer_support_requests_categoryId_idx" ON "customer_support_requests"("categoryId");

-- AddForeignKey
ALTER TABLE "customer_support_requests" ADD CONSTRAINT "customer_support_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
