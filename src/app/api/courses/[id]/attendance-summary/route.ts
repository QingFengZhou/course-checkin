import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema/students";
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { eq, and, count, sql } from "drizzle-orm";
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
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "attendanceRate";
    const sortOrder = url.searchParams.get("sortOrder") || "asc";

    // Get total COMPLETED session count for this course (exclude active sessions)
    const [totalSessionsRow] = await db
      .select({ value: count() })
      .from(checkInSessions)
      .where(
        and(
          eq(checkInSessions.courseId, courseId),
          eq(checkInSessions.status, "closed"),
        ),
      );

    const totalSessions = totalSessionsRow?.value ?? 0;
    const totalStudents = await db
      .select({ value: count() })
      .from(students)
      .where(eq(students.courseId, courseId));

    // Get all students with attendance counts
    const allStudents = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        presentCount: sql<number>`
          (SELECT count(*) FROM ${attendanceRecords}
           WHERE ${attendanceRecords.studentId} = ${students.id})
        `,
      })
      .from(students)
      .where(eq(students.courseId, courseId))
      .limit(limit)
      .offset(offset);

    const result = allStudents.map((s) => {
      const absenceCount = totalSessions - s.presentCount;
      const attendanceRate =
        totalSessions > 0
          ? Math.round((s.presentCount / totalSessions) * 100)
          : 100;
      return {
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        presentCount: s.presentCount,
        absenceCount,
        attendanceRate,
      };
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "attendanceRate") {
        cmp = a.attendanceRate - b.attendanceRate;
      } else if (sortBy === "studentId") {
        cmp = a.studentId.localeCompare(b.studentId);
      } else if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return NextResponse.json({
      data: {
        students: result,
        total: totalStudents?.[0]?.value ?? 0,
        totalSessions,
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
