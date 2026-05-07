-- Add NRIC to User
ALTER TABLE `User` ADD COLUMN `nric` VARCHAR(191) NULL;

-- Unique index (MySQL allows multiple NULLs in a UNIQUE index)
CREATE UNIQUE INDEX `User_nric_key` ON `User`(`nric`);

