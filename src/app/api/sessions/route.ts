import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { checkInSessions } from "@/db/schema/checkin";
import { eq, and, gt } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";
import { createSessionSchema } from "@/lib/zod-schemas";
import { createSession } from "@/lib/checkin-service";

export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, parsed.data.courseId),
          eq(courses.teacherId, session.user.id),
        ),
      )
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: "课程不存在或无权访问" },
        { status: 403 },
      );
    }

    // Check for existing active session — return it instead of creating a new one
    const [existingActive] = await db
      .select()
      .from(checkInSessions)
      .where(
        and(
          eq(checkInSessions.courseId, parsed.data.courseId),
          eq(checkInSessions.status, "active"),
          gt(checkInSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (existingActive) {
      return NextResponse.json({
        data: {
          token: existingActive.token,
          sessionId: existingActive.id,
          expiresAt: existingActive.expiresAt,
        },
      });
    }

    const result = await createSession(
      parsed.data.courseId,
      session.user.id,
      parsed.data.durationMinutes,
    );

    return NextResponse.json(
      {
        data: {
          token: result.token,
          sessionId: result.id,
          expiresAt: result.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
