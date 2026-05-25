import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, students } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";
import { createCourseSchema } from "@/lib/zod-schemas";

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({
      id: courses.id,
      name: courses.name,
      semester: courses.semester,
      teacherId: courses.teacherId,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      studentCount: count(students.id),
    })
    .from(courses)
    .leftJoin(students, eq(courses.id, students.courseId))
    .where(eq(courses.teacherId, session.user.id))
    .groupBy(courses.id);

  return NextResponse.json({ data: result });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const [course] = await db
      .insert(courses)
      .values({
        name: parsed.data.name,
        semester: parsed.data.semester,
        teacherId: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: { id: course.id, name: course.name, semester: course.semester } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
