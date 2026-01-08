-- AlterTable
ALTER TABLE `attendances` ADD COLUMN `source` ENUM('SELF', 'ADMIN') NOT NULL DEFAULT 'SELF',
    MODIFY `location` TEXT NULL;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleNumber` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NULL,
    `type` ENUM('CAR', 'BIKE', 'TRUCK', 'VAN') NOT NULL DEFAULT 'CAR',
    `status` ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
    `assignedTo` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_vehicleNumber_key`(`vehicleNumber`),
    UNIQUE INDEX `vehicles_assignedTo_key`(`assignedTo`),
    INDEX `vehicles_assignedTo_idx`(`assignedTo`),
    INDEX `vehicles_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `petrol_bills` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `date` DATE NOT NULL,
    `imageUrl` TEXT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `petrol_bills_vehicleId_idx`(`vehicleId`),
    INDEX `petrol_bills_employeeId_idx`(`employeeId`),
    INDEX `petrol_bills_date_idx`(`date`),
    INDEX `petrol_bills_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `basicSalary` DECIMAL(10, 2) NOT NULL,
    `allowances` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deductions` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `overtime` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `netSalary` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'PROCESSED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `processedBy` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payroll_records_employeeId_idx`(`employeeId`),
    INDEX `payroll_records_month_year_idx`(`month`, `year`),
    INDEX `payroll_records_status_idx`(`status`),
    UNIQUE INDEX `payroll_records_employeeId_month_year_key`(`employeeId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `field_engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `petrol_bills` ADD CONSTRAINT `petrol_bills_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `petrol_bills` ADD CONSTRAINT `petrol_bills_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `field_engineers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `field_engineers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
