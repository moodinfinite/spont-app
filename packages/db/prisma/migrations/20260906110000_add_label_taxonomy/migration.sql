-- CreateEnum
CREATE TYPE "MappingSource" AS ENUM ('RULE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('CATEGORY_NAME', 'BUSY_ONLY', 'HIDDEN');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawLabel" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "source" "MappingSource" NOT NULL DEFAULT 'RULE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryVisibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL DEFAULT 'CATEGORY_NAME',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LabelMapping_userId_rawLabel_key" ON "LabelMapping"("userId", "rawLabel");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryVisibility_userId_categoryId_key" ON "CategoryVisibility"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "LabelMapping" ADD CONSTRAINT "LabelMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelMapping" ADD CONSTRAINT "LabelMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryVisibility" ADD CONSTRAINT "CategoryVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryVisibility" ADD CONSTRAINT "CategoryVisibility_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
