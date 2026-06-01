import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { students } from "@/db/schema/students";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: courseId } = await params;

    // Verify ownership
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(eq(courses.id, courseId), eq(courses.teacherId, session.user.id)),
      )
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: "课程不存在或无权访问" },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get total count
    const [totalRow] = await db
      .select({ value: count() })
      .from(checkInSessions)
      .where(eq(checkInSessions.courseId, courseId));

    // Get sessions with attendance counts
    const sessions = await db
      .select({
        id: checkInSessions.id,
        token: checkInSessions.token,
        status: checkInSessions.status,
        expiresAt: checkInSessions.expiresAt,
        createdAt: checkInSessions.createdAt,
        closedAt: checkInSessions.closedAt,
        checkedInCount: sql<number>`
          (SELECT count(*) FROM ${attendanceRecords}
           WHERE ${attendanceRecords.sessionId} = ${checkInSessions.id})
        `,
      })
      .from(checkInSessions)
      .where(eq(checkInSessions.courseId, courseId))
      .orderBy(desc(checkInSessions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total students count for this course
    const [studentsResult] = await db
      .select({ value: count() })
      .from(students)
      .where(eq(students.courseId, courseId));

    return NextResponse.json({
      data: {
        sessions,
        totalStudents: studentsResult?.value ?? 0,
        total: totalRow?.value ?? 0,
        limit,
        offset,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
