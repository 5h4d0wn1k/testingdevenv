-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "categoryCommissionRates" JSONB,
ADD COLUMN     "globalCommissionRate" DOUBLE PRECISION;
