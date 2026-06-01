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

  const totalStudents = courses.reduce((sum, c) => sum + c.studentCount, 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">
                C
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                CourseCheckIn
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome + Stats */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            我的课程
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {courses.length > 0
              ? `共 ${courses.length} 门课程，${totalStudents} 名学生`
              : "开始创建你的第一门课程"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !loading && (
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无课程</h3>
            <p className="text-sm text-gray-400 mb-8">点击下方按钮创建你的第一门课程</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              创建课程
            </button>
          </div>
        )}

        {/* Course grid */}
        {courses.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-400">
                共 {courses.length} 门课程
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                创建课程
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course, i) => (
                <div
                  key={course.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CourseCard
                    course={course}
                    onDelete={handleDelete}
                    onManageStudents={handleManageStudents}
                  />
                </div>
              ))}
            </div>
          </>
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

      {/* Entrance animation */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out both;
        }
      `}</style>
    </main>
  );
}
