import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { submitAttendanceSchema } from "@/lib/zod-schemas";
import { getActiveSession, submitAttendance, getSessionStats } from "@/lib/checkin-service";

// Dynamic import for broadcast manager — it may not be available in all environments
async function getBroadcastManager() {
  try {
    const { BroadcastManager } = await import("@/lib/ws-broadcast");
    return BroadcastManager;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submitAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const session = await getActiveSession(parsed.data.sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "签到已结束或无效" },
        { status: 400 },
      );
    }

    // Find or auto-register student in this course
    let [student] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.studentId, parsed.data.studentId),
          eq(students.name, parsed.data.name),
          eq(students.courseId, session.courseId),
        ),
      )
      .limit(1);

    if (!student) {
      // Auto-register student in the course on first check-in
      const [created] = await db
        .insert(students)
        .values({
          studentId: parsed.data.studentId,
          name: parsed.data.name,
          courseId: session.courseId,
        })
        .onConflictDoUpdate({
          target: [students.courseId, students.studentId],
          set: { name: parsed.data.name, updatedAt: new Date() },
        })
        .returning();
      student = created;
    }

    const result = await submitAttendance(session.id, student.id);

    if ("error" in result && result.error === "already checked in") {
      return NextResponse.json(
        {
          data: {
            alreadyCheckedIn: true,
            message: "你已签到，无需重复提交",
          },
        },
        { status: 200 },
      );
    }

    // Fire-and-forget: broadcast attendance update via WebSocket
    // Non-blocking — API response doesn't depend on broadcast
    getBroadcastManager().then((bm) => {
      if (bm) {
        getSessionStats(session.id).then((stats) => {
          bm.broadcastAttendanceUpdate(
            session.id,
            stats.checkedInCount,
            stats.totalStudents,
            { studentId: student.studentId, studentName: student.name },
          );
        });
      }
    }).catch(() => {
      // Broadcast errors are non-fatal
    });

    return NextResponse.json(
      {
        data: {
          studentName: student.name,
          checkedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
