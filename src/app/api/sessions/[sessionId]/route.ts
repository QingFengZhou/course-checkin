import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { students } from "@/db/schema/students";
import { eq, and, count } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";
import { endSession } from "@/lib/checkin-service";

/** GET /api/sessions/[sessionId] — teacher-only session status with attendance count */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;

    const [row] = await db
      .select({
        id: checkInSessions.id,
        token: checkInSessions.token,
        status: checkInSessions.status,
        expiresAt: checkInSessions.expiresAt,
        createdAt: checkInSessions.createdAt,
        closedAt: checkInSessions.closedAt,
        courseId: checkInSessions.courseId,
      })
      .from(checkInSessions)
      .innerJoin(courses, eq(checkInSessions.courseId, courses.id))
      .where(
        and(
          eq(checkInSessions.id, sessionId),
          eq(courses.teacherId, session.user.id),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "签到记录不存在或无权访问" },
        { status: 403 },
      );
    }

    const [countRow] = await db
      .select({ value: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId));

    const [totalRow] = await db
      .select({ value: count() })
      .from(students)
      .where(eq(students.courseId, row.courseId));

    return NextResponse.json({
      data: {
        session: {
          id: row.id,
          token: row.token,
          status: row.status,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
          closedAt: row.closedAt,
        },
        checkedInCount: countRow?.value ?? 0,
        totalStudents: totalRow?.value ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** PATCH /api/sessions/[sessionId] — teacher ends a check-in session */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;

    const [row] = await db
      .select({ id: checkInSessions.id })
      .from(checkInSessions)
      .innerJoin(courses, eq(checkInSessions.courseId, courses.id))
      .where(
        and(
          eq(checkInSessions.id, sessionId),
          eq(courses.teacherId, session.user.id),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "签到记录不存在或无权访问" },
        { status: 403 },
      );
    }

    await endSession(sessionId);

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
