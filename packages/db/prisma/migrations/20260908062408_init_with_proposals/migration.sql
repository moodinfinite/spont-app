-- CreateEnum
CREATE TYPE "ProposalOrigin" AS ENUM ('SUGGESTED', 'INVITED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('OPEN', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParticipantResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "preferredHangoutMinutes" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "origin" "ProposalOrigin" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'OPEN',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalParticipant" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "ParticipantResponse" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "calendarEventId" TEXT,

    CONSTRAINT "ProposalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proposal_startsAt_idx" ON "Proposal"("startsAt");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "ProposalParticipant_userId_response_idx" ON "ProposalParticipant"("userId", "response");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalParticipant_proposalId_userId_key" ON "ProposalParticipant"("proposalId", "userId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalParticipant" ADD CONSTRAINT "ProposalParticipant_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalParticipant" ADD CONSTRAINT "ProposalParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
