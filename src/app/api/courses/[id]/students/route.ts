import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";
import { enrollStudentSchema } from "@/lib/zod-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, session.user.id)))
    .limit(1);

  if (course.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const studentList = await db
    .select()
    .from(students)
    .where(eq(students.courseId, id));

  return NextResponse.json({ data: studentList });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, session.user.id)))
    .limit(1);

  if (course.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = enrollStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const [student] = await db
      .insert(students)
      .values({
        courseId: id,
        studentId: parsed.data.studentId,
        name: parsed.data.name,
      })
      .returning();

    return NextResponse.json({ data: { id: student.id, studentId: student.studentId, name: student.name } }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Student with this ID already exists in this course" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
