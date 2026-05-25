import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { courses } from "@/db/schema/courses";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth-types";
import CheckInPageClient from "./components/CheckInPageClient";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CheckInPage({ params }: PageProps) {
  const { courseId } = await params;

  // Self-auth: middleware does not cover /checkin route
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  let userId: string;
  try {
    const payload = await verifyToken(sessionCookie);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  // Fetch course and verify ownership
  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      semester: courses.semester,
    })
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.teacherId, userId),
      ),
    )
    .limit(1);

  if (!course) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            404
          </h1>
          <p className="text-gray-500">课程不存在或无权访问</p>
        </div>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </main>
      }
    >
      <CheckInPageClient course={course} />
    </Suspense>
  );
}
