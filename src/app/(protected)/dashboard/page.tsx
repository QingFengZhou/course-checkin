"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CourseWithStudentCount } from "@/lib/course-types";
import CourseCard from "./components/course-card";
import CreateCourseForm from "./components/create-course-form";
import StudentRoster from "./components/student-roster";

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithStudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithStudentCount | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(`Failed to fetch courses: ${res.status}`);
      }
      const json = await res.json();
      setCourses(json.data ?? []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load courses");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCourseCreated = () => {
    setShowCreate(false);
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete course");
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to delete course");
      }
    }
  };

  const handleManageStudents = (course: CourseWithStudentCount) => {
    setSelectedCourse(course);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Ignore logout errors
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Top bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-bold">
              C
            </div>
            <h1 className="text-xl font-bold text-gray-900">CourseCheckIn</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-800">我的课程</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            + 创建课程
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-light border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-400">暂无课程，请创建第一个课程</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={handleDelete}
                onManageStudents={handleManageStudents}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create course modal */}
      {showCreate && (
        <CreateCourseForm
          onSubmit={handleCourseCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Student roster modal */}
      {selectedCourse && (
        <StudentRoster
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
          onClose={() => {
            setSelectedCourse(null);
            fetchCourses();
          }}
        />
      )}
    </main>
  );
}
