-- AlterTable
ALTER TABLE "public"."PlatformSettings" ADD COLUMN     "commissionNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newUserNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "systemNotifications" BOOLEAN NOT NULL DEFAULT false;
