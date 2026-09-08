-- AlterTable
ALTER TABLE "CalendarAccount" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
