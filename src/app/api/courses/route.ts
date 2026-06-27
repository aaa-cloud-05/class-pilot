import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { getUserCourses } from "@/lib/server/assignments";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const courses = await getUserCourses(session.user.id);
  const ns = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
    select: { hiddenCourses: true },
  });

  return Response.json({ courses, hiddenCourses: ns?.hiddenCourses ?? [] });
}
