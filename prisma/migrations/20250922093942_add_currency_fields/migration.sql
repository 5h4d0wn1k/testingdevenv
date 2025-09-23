-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "baseCurrency" TEXT DEFAULT 'USD',
ADD COLUMN     "exchangeRates" JSONB;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';
