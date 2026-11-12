-- CreateTable
CREATE TABLE "DemoReset" (
    "id" TEXT NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoReset_finishedAt_idx" ON "DemoReset"("finishedAt");
