/*
  Warnings:

  - The values [IN_PROGRESS,POSTPONED] on the enum `MeetingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endTime` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the `meeting_tasks` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MeetingStatus_new" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."meetings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "meetings" ALTER COLUMN "status" TYPE "MeetingStatus_new" USING ("status"::text::"MeetingStatus_new");
ALTER TYPE "MeetingStatus" RENAME TO "MeetingStatus_old";
ALTER TYPE "MeetingStatus_new" RENAME TO "MeetingStatus";
DROP TYPE "public"."MeetingStatus_old";
ALTER TABLE "meetings" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- DropForeignKey
ALTER TABLE "meeting_tasks" DROP CONSTRAINT "meeting_tasks_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "meeting_tasks" DROP CONSTRAINT "meeting_tasks_meetingId_fkey";

-- AlterTable
ALTER TABLE "allocations" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "endTime",
DROP COLUMN "location";

-- DropTable
DROP TABLE "meeting_tasks";
