-- AlterTable
ALTER TABLE "barcode_checkouts" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
