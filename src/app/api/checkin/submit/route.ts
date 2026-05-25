import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { submitAttendanceSchema } from "@/lib/zod-schemas";
import { getActiveSession, submitAttendance } from "@/lib/checkin-service";

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

    const [student] = await db
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
      return NextResponse.json(
        { error: "未找到该学生，请确认学号和姓名" },
        { status: 400 },
      );
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
