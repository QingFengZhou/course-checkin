"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SessionDetail {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  closedAt: string | null;
}

interface StudentInfo {
  id: string;
  studentId: string;
  name: string;
}

interface CheckedInStudent extends StudentInfo {
  checkedAt: string;
}

interface SessionData {
  session: SessionDetail;
  checkedInCount: number;
  totalStudents: number;
  checkedInStudents: CheckedInStudent[];
  absentStudents: StudentInfo[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const courseId = params.id as string;

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
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
  }, [sessionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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
              onClick={fetchDetail}
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

  const rate =
    data.totalStudents > 0
      ? Math.round((data.checkedInCount / data.totalStudents) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/dashboard/courses/${courseId}/history`}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            &larr; 返回历史记录
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">签到详情</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Session Info */}
        <div className="rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">签到时间</p>
              <p className="text-sm text-gray-900">
                {formatDate(data.session.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">状态</p>
              <p className="mt-1">
                {data.session.status === "active" ? (
                  <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    进行中
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    已结束
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-500 mb-2">签到率</p>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold ${getRateColor(rate)}`}>
              {rate}%
            </span>
            <span className="text-gray-600">
              {data.checkedInCount} / {data.totalStudents} 人
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-3">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${getBarColor(rate)}`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        {/* Student Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checked-in */}
          <div className="rounded-xl p-4">
            <p className="text-sm font-medium text-green-700 mb-3">
              已签到 ({data.checkedInStudents.length})
            </p>
            {data.checkedInStudents.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">暂无</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-2 text-green-700">学号</th>
                      <th className="text-left py-2 text-green-700">姓名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.checkedInStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-green-100"
                      >
                        <td className="py-2">{s.studentId}</td>
                        <td className="py-2">{s.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Absent */}
          <div className="rounded-xl p-4">
            <p className="text-sm font-medium text-gray-500 mb-3">
              未签到 ({data.absentStudents.length})
            </p>
            {data.absentStudents.length === 0 ? (
              <p className="text-xs text-green-600 py-4 text-center">
                全部已签到
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500">学号</th>
                      <th className="text-left py-2 text-gray-500">姓名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.absentStudents.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">{s.studentId}</td>
                        <td className="py-2 text-gray-500">{s.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
