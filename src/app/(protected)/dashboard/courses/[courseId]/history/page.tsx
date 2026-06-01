"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SessionItem {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  closedAt: string | null;
  checkedInCount: number;
}

export default function CourseHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "加载失败");
        return;
      }
      const json = await res.json();
      setSessions(json.data.sessions ?? []);
      setTotalStudents(json.data.totalStudents ?? 0);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    // Get course name from dashboard data
    fetch(`/api/courses`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const course = json?.data?.courses?.find(
          (c: { id: string; name: string }) => c.id === courseId,
        );
        if (course) setCourseName(course.name);
      })
      .catch(() => {});

    fetchSessions();
  }, [courseId, fetchSessions]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
          进行中
        </span>
      );
    }
    return (
      <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
        已结束
      </span>
    );
  };

  const getRateColor = (checkedIn: number, total: number) => {
    if (total === 0) return "text-gray-400";
    const rate = checkedIn / total;
    if (rate >= 0.8) return "text-green-600";
    if (rate >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            &larr; 返回仪表盘
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {courseName || "课程"} — 签到历史
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
            <button
              onClick={fetchSessions}
              className="ml-2 underline hover:no-underline"
            >
              重试
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">暂无签到记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const rate =
                totalStudents > 0
                  ? Math.round((s.checkedInCount / totalStudents) * 100)
                  : 0;
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    router.push(
                      `/dashboard/courses/${courseId}/history/${s.id}`,
                    )
                  }
                  className="w-full bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(s.createdAt)}
                      </p>
                      <div className="mt-1">{getStatusBadge(s.status)}</div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${getRateColor(s.checkedInCount, totalStudents)}`}
                      >
                        {rate}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.checkedInCount}/{totalStudents} 人
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
