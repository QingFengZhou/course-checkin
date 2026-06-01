"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AttendanceStudent {
  id: string;
  studentId: string;
  name: string;
  presentCount: number;
  absenceCount: number;
  attendanceRate: number;
}

export default function AttendanceOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("attendanceRate");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = `/api/courses/${courseId}/attendance-summary?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=200`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "加载失败");
        return;
      }
      const json = await res.json();
      setStudents(json.data.students ?? []);
      setTotalSessions(json.data.totalSessions ?? 0);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [courseId, sortBy, sortOrder]);

  useEffect(() => {
    // Fetch course name
    fetch(`/api/courses`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const course = json?.data?.courses?.find(
          (c: { id: string; name: string }) => c.id === courseId,
        );
        if (course) setCourseName(course.name);
      })
      .catch(() => {});

    fetchData();
  }, [courseId, fetchData]);

  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "attendanceRate" ? "asc" : "asc");
    }
  };

  const filtered = students.filter(
    (s) =>
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sortArrow = (field: string) => {
    if (sortBy !== field) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            &larr; 返回仪表盘
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {courseName || "课程"} — 考勤总览
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {totalSessions === 0 && !loading ? (
          <div className="rounded-xl p-8 text-center">
            <p className="text-gray-500">
              暂无签到记录，签到后才会有出勤数据
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 text-sm text-blue-500 hover:text-blue-600"
            >
              &larr; 返回仪表盘
            </Link>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索学号或姓名..."
                className="w-full max-w-xs input-base max-w-xs"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                {error}
                <button
                  onClick={fetchData}
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
            ) : (
              <div className="rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th
                        className="text-left px-4 py-3 text-gray-600 font-medium cursor-pointer hover:text-gray-900"
                        onClick={() => toggleSort("studentId")}
                      >
                        学号{sortArrow("studentId")}
                      </th>
                      <th
                        className="text-left px-4 py-3 text-gray-600 font-medium cursor-pointer hover:text-gray-900"
                        onClick={() => toggleSort("name")}
                      >
                        姓名{sortArrow("name")}
                      </th>
                      <th
                        className="text-left px-4 py-3 text-gray-600 font-medium cursor-pointer hover:text-gray-900"
                        onClick={() => toggleSort("attendanceRate")}
                      >
                        出勤率{sortArrow("attendanceRate")}
                      </th>
                      <th className="text-center px-4 py-3 text-gray-600 font-medium">
                        已签 / 缺勤
                      </th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">{s.studentId}</td>
                        <td className="px-4 py-3">{s.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${getRateColor(s.attendanceRate)}`}
                            >
                              {s.attendanceRate}%
                            </span>
                            <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getBarColor(s.attendanceRate)}`}
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-green-600">
                            {s.presentCount}
                          </span>
                          {" / "}
                          <span className="text-red-500">
                            {s.absenceCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/courses/${courseId}/attendance/${s.id}`,
                              )
                            }
                            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <p className="text-center py-8 text-gray-400">
                    {search ? "未找到匹配的学生" : "暂无学生数据"}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
