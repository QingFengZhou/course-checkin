import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const session = await getAuthSession(request);
  if (!session.isAuthenticated || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, studentId } = await params;
  const course = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, session.user.id)))
    .limit(1);

  if (course.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  await db
    .delete(students)
    .where(and(eq(students.courseId, id), eq(students.studentId, studentId)));

  return NextResponse.json({ message: "Student removed" });
}
