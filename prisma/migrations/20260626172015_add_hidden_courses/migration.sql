-- AlterTable
ALTER TABLE "NotificationSetting" ADD COLUMN     "hiddenCourses" TEXT[] DEFAULT ARRAY[]::TEXT[];
