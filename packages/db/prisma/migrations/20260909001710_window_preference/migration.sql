-- CreateEnum
CREATE TYPE "WindowPreference" AS ENUM ('SOONEST', 'BEST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "windowPreference" "WindowPreference" NOT NULL DEFAULT 'SOONEST';
