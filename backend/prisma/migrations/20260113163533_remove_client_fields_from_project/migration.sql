/*
  Warnings:

  - You are about to drop the column `clientEmail` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `clientPhone` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `projectManager` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `projects` DROP COLUMN `clientEmail`,
    DROP COLUMN `clientName`,
    DROP COLUMN `clientPhone`,
    DROP COLUMN `projectManager`,
    DROP COLUMN `tags`;
