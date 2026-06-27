-- AlterTable
ALTER TABLE "NotificationSetting" ADD COLUMN     "acknowledgedCourses" TEXT[] DEFAULT ARRAY[]::TEXT[];
