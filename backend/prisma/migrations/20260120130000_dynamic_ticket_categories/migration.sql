-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_name_key" ON "ticket_categories"("name");

-- Insert default categories
INSERT INTO "ticket_categories" ("id", "name", "description", "createdAt", "updatedAt") VALUES
('cat_auth', 'AUTHENTICATION', 'Authentication and login issues', NOW(), NOW()),
('cat_hw', 'HARDWARE', 'Hardware related problems', NOW(), NOW()),
('cat_sw', 'SOFTWARE', 'Software and application issues', NOW(), NOW()),
('cat_net', 'NETWORK', 'Network connectivity problems', NOW(), NOW()),
('cat_sec', 'SECURITY', 'Security related concerns', NOW(), NOW()),
('cat_db', 'DATABASE', 'Database related issues', NOW(), NOW()),
('cat_maint', 'MAINTENANCE', 'System maintenance requests', NOW(), NOW()),
('cat_setup', 'SETUP', 'Setup and configuration', NOW(), NOW()),
('cat_other', 'OTHER', 'Other miscellaneous issues', NOW(), NOW());

-- Add categoryId column to support_tickets
ALTER TABLE "support_tickets" ADD COLUMN "categoryId" TEXT;

-- Update existing tickets to use the new category system
UPDATE "support_tickets" SET "categoryId" = 
  CASE 
    WHEN "category" = 'AUTHENTICATION' THEN 'cat_auth'
    WHEN "category" = 'HARDWARE' THEN 'cat_hw'
    WHEN "category" = 'SOFTWARE' THEN 'cat_sw'
    WHEN "category" = 'NETWORK' THEN 'cat_net'
    WHEN "category" = 'SECURITY' THEN 'cat_sec'
    WHEN "category" = 'DATABASE' THEN 'cat_db'
    WHEN "category" = 'MAINTENANCE' THEN 'cat_maint'
    WHEN "category" = 'SETUP' THEN 'cat_setup'
    ELSE 'cat_other'
  END;

-- Make categoryId NOT NULL after updating existing records
ALTER TABLE "support_tickets" ALTER COLUMN "categoryId" SET NOT NULL;

-- Drop the old category column
ALTER TABLE "support_tickets" DROP COLUMN "category";

-- Add foreign key constraint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create index on categoryId
CREATE INDEX "support_tickets_categoryId_idx" ON "support_tickets"("categoryId");

-- Drop the old TicketCategory enum
DROP TYPE "TicketCategory";