-- CreateEnum
CREATE TYPE "StaffPortalFeature" AS ENUM ('DASHBOARD', 'PROJECT', 'TASK_MANAGEMENT');

-- CreateTable
CREATE TABLE "staff_feature_access" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "feature" "StaffPortalFeature" NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_feature_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_feature_access_employeeId_idx" ON "staff_feature_access"("employeeId");

-- CreateIndex
CREATE INDEX "staff_feature_access_feature_idx" ON "staff_feature_access"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "staff_feature_access_employeeId_feature_key" ON "staff_feature_access"("employeeId", "feature");

-- AddForeignKey
ALTER TABLE "staff_feature_access" ADD CONSTRAINT "staff_feature_access_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
