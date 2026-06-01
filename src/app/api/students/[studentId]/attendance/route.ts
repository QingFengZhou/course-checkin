import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema/students";
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { eq, and, desc, count } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId } = await params;

    // Find student and verify teacher owns the course
    const [student] = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        courseId: students.courseId,
      })
      .from(students)
      .innerJoin(courses, eq(students.courseId, courses.id))
      .where(
        and(
          eq(students.id, studentId),
          eq(courses.teacherId, session.user.id),
        ),
      )
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "学生不存在或无权访问" },
        { status: 404 },
      );
    }

    // Get all sessions for this course (only closed/completed)
    const allSessions = await db
      .select({
        id: checkInSessions.id,
        status: checkInSessions.status,
        createdAt: checkInSessions.createdAt,
        closedAt: checkInSessions.closedAt,
      })
      .from(checkInSessions)
      .where(
        and(
          eq(checkInSessions.courseId, student.courseId),
          eq(checkInSessions.status, "closed"),
        ),
      )
      .orderBy(desc(checkInSessions.createdAt));

    // Get this student's attendance records
    const records = await db
      .select({
        sessionId: attendanceRecords.sessionId,
        checkedAt: attendanceRecords.checkedAt,
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, student.id));

    const presentSessionIds = new Set(records.map((r) => r.sessionId));

    // Build attendance timeline
    const timeline = allSessions.map((s) => ({
      sessionId: s.id,
      sessionDate: s.createdAt,
      status: s.status,
      isPresent: presentSessionIds.has(s.id),
      checkedAt:
        records.find((r) => r.sessionId === s.id)?.checkedAt ?? null,
    }));

    const totalSessions = allSessions.length;
    const presentCount = records.length;
    const absenceCount = totalSessions - presentCount;
    const attendanceRate =
      totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    return NextResponse.json({
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
        },
        summary: {
          totalSessions,
          presentCount,
          absenceCount,
          attendanceRate,
        },
        records: timeline,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
