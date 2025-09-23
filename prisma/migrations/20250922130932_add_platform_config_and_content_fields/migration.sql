-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "homepageBanner" TEXT,
ADD COLUMN     "imageKitPrivateKey" TEXT,
ADD COLUMN     "imageKitPublicKey" TEXT,
ADD COLUMN     "imageKitUrlEndpoint" TEXT,
ADD COLUMN     "paymentMethods" JSONB,
ADD COLUMN     "policyPages" JSONB,
ADD COLUMN     "promotionalBanners" JSONB,
ADD COLUMN     "shippingZones" JSONB,
ADD COLUMN     "stripePublishableKey" TEXT,
ADD COLUMN     "stripeSecretKey" TEXT,
ADD COLUMN     "taxRates" JSONB;
