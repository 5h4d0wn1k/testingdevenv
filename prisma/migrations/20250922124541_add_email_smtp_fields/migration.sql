-- CreateEnum
CREATE TYPE "public"."ProductStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'OUT_OF_STOCK');

-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "fromName" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPassword" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpSecure" BOOLEAN DEFAULT false,
ADD COLUMN     "smtpUser" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "flagLogs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "status" "public"."ProductStatus" NOT NULL DEFAULT 'ACTIVE';
