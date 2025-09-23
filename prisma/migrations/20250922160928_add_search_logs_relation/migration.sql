-- CreateTable
CREATE TABLE "public"."SearchLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "correctedQuery" TEXT,
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchLog_query_createdAt_idx" ON "public"."SearchLog"("query", "createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_userId_createdAt_idx" ON "public"."SearchLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SearchLog" ADD CONSTRAINT "SearchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
