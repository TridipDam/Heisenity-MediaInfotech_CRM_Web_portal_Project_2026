-- AlterTable
ALTER TABLE `tenders` ADD COLUMN `totalEMDForfeited` DECIMAL(15, 2) NULL,
    ADD COLUMN `totalEMDInvested` DECIMAL(15, 2) NULL,
    ADD COLUMN `totalEMDRefunded` DECIMAL(15, 2) NULL;
