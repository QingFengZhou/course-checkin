"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface AttendanceRecord {
  sessionId: string;
  sessionDate: string;
  status: string;
  isPresent: boolean;
  checkedAt: string | null;
}

interface StudentAttendanceData {
  student: {
    id: string;
    studentId: string;
    name: string;
  };
  summary: {
    totalSessions: number;
    presentCount: number;
    absenceCount: number;
    attendanceRate: number;
  };
  records: AttendanceRecord[];
}

export default function StudentAttendancePage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const courseId = params.id as string;

  const [data, setData] = useState<StudentAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${studentId}/attendance`, {
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "加载失败");
        return;
      }
      const json = await res.json();
      setData(json.data);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

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

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
            <button
              onClick={fetchData}
              className="ml-2 underline hover:no-underline"
            >
              重试
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { student, summary, records } = data;
  const presentRecords = records.filter((r) => r.isPresent);
  const absentRecords = records.filter((r) => !r.isPresent);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/dashboard/courses/${courseId}/attendance`}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            &larr; 返回考勤总览
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {student.name} — 考勤记录
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Student info + summary */}
        <div className="rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">学号</p>
              <p className="text-sm text-gray-900 font-medium">
                {student.studentId}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">姓名</p>
              <p className="text-sm text-gray-900 font-medium">{student.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">已签到</p>
              <p className="text-sm text-green-600 font-medium">
                {summary.presentCount} 次
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">缺勤</p>
              <p className="text-sm text-red-500 font-medium">
                {summary.absenceCount} 次
              </p>
            </div>
          </div>

          {/* Attendance rate */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-1">出勤率</p>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${getRateColor(summary.attendanceRate)}`}
              >
                {summary.attendanceRate}%
              </span>
              <span className="text-sm text-gray-500">
                ({summary.presentCount}/{summary.totalSessions})
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div
                className={`h-3 rounded-full ${getBarColor(summary.attendanceRate)}`}
                style={{ width: `${summary.attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl p-6">
          <p className="text-sm font-medium text-gray-700 mb-4">
            签到记录 ({records.length})
          </p>

          {records.length === 0 ? (
            <p className="text-center py-8 text-gray-400">暂无签到记录</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">
                      签到日期
                    </th>
                    <th className="text-left py-2 text-gray-500 font-medium">
                      签到时间
                    </th>
                    <th className="text-center py-2 text-gray-500 font-medium">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Present records first */}
                  {presentRecords.map((r) => (
                    <tr
                      key={r.sessionId}
                      className="border-b border-gray-100"
                    >
                      <td className="py-2">{formatDate(r.sessionDate)}</td>
                      <td className="py-2">
                        {r.checkedAt
                          ? new Date(r.checkedAt).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="py-2 text-center">
                        <span className="inline-flex items-center bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          已签到
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Absent records */}
                  {absentRecords.map((r) => (
                    <tr
                      key={r.sessionId}
                      className="border-b border-gray-100"
                    >
                      <td className="py-2 text-gray-500">
                        {formatDate(r.sessionDate)}
                      </td>
                      <td className="py-2 text-gray-400">-</td>
                      <td className="py-2 text-center">
                        <span className="inline-flex items-center bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          缺勤
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data.records.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            该学生暂无签到记录
          </div>
        )}
      </div>
    </main>
  );
}
