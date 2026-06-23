import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const settings = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  });

  return Response.json({
    settings: settings ?? {
      enabled: true,
      preset: "standard",
      emailEnabled: false,
      mutedCourses: [],
      mutedAssignments: [],
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const body = await request.json();
  const { enabled, preset, emailEnabled, mutedCourses, mutedAssignments } = body;

  const data: Record<string, unknown> = {};
  if (typeof enabled === "boolean") data.enabled = enabled;
  if (typeof preset === "string") data.preset = preset;
  if (typeof emailEnabled === "boolean") data.emailEnabled = emailEnabled;
  if (Array.isArray(mutedCourses)) data.mutedCourses = mutedCourses;
  if (Array.isArray(mutedAssignments)) data.mutedAssignments = mutedAssignments;

  const settings = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return Response.json({ settings });
}
