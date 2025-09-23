-- AlterTable
ALTER TABLE "public"."VendorSettings" ADD COLUMN     "defaultShippingMethods" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "operatingHours" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "orderNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payoutNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "returnNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shippingOriginAddress" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "public"."Webhook" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Webhook" ADD CONSTRAINT "Webhook_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
