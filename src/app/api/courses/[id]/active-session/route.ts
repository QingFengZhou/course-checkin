import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkInSessions } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { eq, and, gt } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.teacherId, session.user.id),
      ),
    )
    .limit(1);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const [activeSession] = await db
    .select()
    .from(checkInSessions)
    .where(
      and(
        eq(checkInSessions.courseId, courseId),
        eq(checkInSessions.status, "active"),
        gt(checkInSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!activeSession) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      sessionId: activeSession.id,
      token: activeSession.token,
      expiresAt: activeSession.expiresAt,
    },
  });
}
