import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveSession } from "@/lib/checkin-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const session = await getActiveSession(token);

    if (!session) {
      return NextResponse.json(
        { error: "签到已结束或无效" },
        { status: 404 },
      );
    }

    const [course] = await db
      .select({ name: courses.name })
      .from(courses)
      .where(eq(courses.id, session.courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: "签到已结束或无效" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        data: {
          courseId: session.courseId,
          courseName: course.name,
          expiresAt: session.expiresAt,
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
