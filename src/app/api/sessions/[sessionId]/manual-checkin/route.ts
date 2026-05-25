import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checkInSessions } from "@/db/schema/checkin";
import { courses } from "@/db/schema/courses";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";
import { submitAttendance } from "@/lib/checkin-service";

const manualCheckInSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;

    // Verify session ownership via course join
    const [sessionRow] = await db
      .select({
        id: checkInSessions.id,
        status: checkInSessions.status,
        expiresAt: checkInSessions.expiresAt,
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

    if (!sessionRow) {
      return NextResponse.json(
        { error: "签到记录不存在或无权访问" },
        { status: 403 },
      );
    }

    // Check session is active and not expired
    if (sessionRow.status !== "active" || sessionRow.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "签到已结束" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = manualCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await submitAttendance(sessionId, parsed.data.studentId);

    if ("error" in result && result.error === "already checked in") {
      return NextResponse.json(
        { data: { alreadyCheckedIn: true } },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { data: { success: true } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
