/*
  Warnings:

  - Added the required column `current_units` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "current_units" INTEGER NOT NULL;
