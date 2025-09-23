-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "analyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facebookPixelId" TEXT,
ADD COLUMN     "googleAnalyticsId" TEXT;
