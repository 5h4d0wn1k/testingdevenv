-- AlterTable
ALTER TABLE "public"."VendorProfile" ADD COLUMN     "accountHolderName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankAddress" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "routingNumber" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
