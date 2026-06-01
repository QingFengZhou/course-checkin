"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCheckinSession } from "@/lib/use-checkin-session";
import type { AttendanceUpdatePayload } from "@/lib/ws-types";

interface Course {
  id: string;
  name: string;
  semester: string;
}

interface SessionInfo {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  closedAt: string | null;
}

interface CheckInPageClientProps {
  course: Course;
}

export default function CheckInPageClient({ course }: CheckInPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [checkedInStudents, setCheckedInStudents] = useState<
    { id: string; studentId: string; name: string; checkedAt: string }[]
  >([]);
  const [absentStudents, setAbsentStudents] = useState<
    { id: string; studentId: string; name: string }[]
  >([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const stopTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchCount = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) {
        setCheckedInCount(json.data.checkedInCount);
        setTotalStudents(json.data.totalStudents);
        setCheckedInStudents(json.data.checkedInStudents ?? []);
        setAbsentStudents(json.data.absentStudents ?? []);
        if (json.data.session.status !== "active") {
          setSessionEnded(true);
          stopTimers();
        }
      }
    } catch {
      // Polling errors are non-fatal; retry on next interval
    }
  }, [stopTimers]);

  const startCountdown = useCallback((sessionInfo: SessionInfo) => {
    const calculateRemaining = () => {
      const now = Date.now();
      const expires = new Date(sessionInfo.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      return remaining;
    };

    const remaining = calculateRemaining();
    setTimeLeft(remaining);

    if (remaining <= 0) {
      setSessionEnded(true);
      return;
    }

    intervalRef.current = setInterval(() => {
      const r = calculateRemaining();
      setTimeLeft(r);
      if (r <= 0) {
        setSessionEnded(true);
        stopTimers();
      }
    }, 1000);

    pollRef.current = setInterval(() => {
      fetchCount(sessionInfo.id);
    }, 5000);

    // Initial fetch
    fetchCount(sessionInfo.id);
  }, [fetchCount, stopTimers]);

  const handleStartSession = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, durationMinutes }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "创建签到失败，请重试");
        return;
      }

      const json = await res.json();
      const sessionInfo: SessionInfo = {
        id: json.data.sessionId,
        token: json.data.token,
        status: "active",
        expiresAt: json.data.expiresAt,
        closedAt: null,
      };

      setSession(sessionInfo);
      startCountdown(sessionInfo);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    const confirmed = window.confirm(
      "确定要结束本次签到吗？已签到的记录将保留。",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        setError("结束签到失败");
        return;
      }
      setSessionEnded(true);
      stopTimers();
    } catch {
      setError("网络错误，请重试");
    }
  };

  // Initialize from URL search params (pre-created session from course card)
  useEffect(() => {
    if (initialized) return;

    const token = searchParams.get("session");
    const sid = searchParams.get("sessionId");
    const expires = searchParams.get("expiresAt");

    if (token && sid && expires) {
      const sessionInfo: SessionInfo = {
        id: sid,
        token,
        status: "active",
        expiresAt: decodeURIComponent(expires),
        closedAt: null,
      };
      setSession(sessionInfo);
      startCountdown(sessionInfo);
    }

    setInitialized(true);
  }, [searchParams, initialized, startCountdown]);

  // WebSocket hook: real-time updates (always called — React rules of hooks)
  const effectiveSessionId = session?.id ?? null;
  const sessionActive = !!(session && !sessionEnded);
  const [lastWsStatus, setLastWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  const handleWsAttendanceUpdate = useCallback((payload: AttendanceUpdatePayload) => {
    setCheckedInCount(payload.checkedInCount);
    setTotalStudents(payload.totalStudents);
    if (payload.newCheckIn) {
      // Highlight the newly checked-in student
      setHighlightId(payload.newCheckIn.studentId);
      setTimeout(() => setHighlightId(null), 3000);
    }
  }, []);

  const handleWsSessionEnded = useCallback(() => {
    setSessionEnded(true);
    stopTimers();
  }, [stopTimers]);

  const { connectionStatus } = useCheckinSession({
    sessionId: effectiveSessionId || "",
    onAttendanceUpdate: handleWsAttendanceUpdate,
    onSessionEnded: handleWsSessionEnded,
  });

  // Track WS status and manage polling fallback
  useEffect(() => {
    setLastWsStatus(connectionStatus);
    if (connectionStatus === "connected" && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [connectionStatus, sessionActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, [stopTimers]);

  const baseUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
      : process.env.NEXT_PUBLIC_BASE_URL || "";
  const qrUrl =
    session && !sessionEnded
      ? `${baseUrl}/checkin?session=${session.token}`
      : "";

  // State 3: Expired or teacher-ended
  if (sessionEnded) {
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
            <h1 className="text-2xl font-semibold text-gray-900">签到管理</h1>
            <div className="w-20" />
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-500 mb-4">签到已结束</p>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 text-sm font-medium"
            >
              返回仪表盘
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
          <h1 className="text-2xl font-semibold text-gray-900">签到管理</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Course info + status bar */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            课程: <span className="text-gray-900 font-medium">{course.name}</span>
            {session && !sessionEnded && timeLeft !== null && (
              <>
                <span className="mx-2 text-gray-300">|</span>
                状态:
                <span className="ml-1 inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  进行中
                </span>
                <span className="ml-2 text-gray-500">
                  剩余 {formatTime(timeLeft)}
                </span>
              </>
            )}
            {sessionEnded && (
              <>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-red-500">已结束</span>
              </>
            )}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* State 1: Pre-session */}
        {!session && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {course.name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{course.semester}</p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <label className="text-sm text-gray-600">签到时长:</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 分钟</option>
                <option value={2}>2 分钟</option>
                <option value={5}>5 分钟</option>
                <option value={10}>10 分钟</option>
                <option value={15}>15 分钟</option>
                <option value={30}>30 分钟</option>
              </select>
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="bg-blue-500 text-white px-8 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? "发起中..." : "发起签到"}
            </button>
          </div>
        )}

        {/* State 2: Active session */}
        {session && !sessionEnded && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* QR Code */}
              <div className="flex-shrink-0 bg-white p-4 border border-gray-200 rounded-lg">
                <QRCodeSVG value={qrUrl} size={300} level="L" />
                <p className="text-xs text-gray-400 mt-2 text-center break-all max-w-[300px]">
                  {qrUrl}
                </p>
              </div>

              {/* Real-time Dashboard */}
              <div className="flex-1 min-w-0">
                {/* Attendance Rate */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">签到率</p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold ${
                        totalStudents === 0
                          ? "text-gray-400"
                          : checkedInCount / totalStudents >= 0.8
                            ? "text-green-600"
                            : checkedInCount / totalStudents >= 0.5
                              ? "text-yellow-600"
                              : "text-red-600"
                      }`}
                    >
                      {totalStudents > 0
                        ? `${Math.round((checkedInCount / totalStudents) * 100)}%`
                        : "0%"}
                    </span>
                    <span className="text-lg text-gray-700">
                      已签到 {checkedInCount} / {totalStudents} 人
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        totalStudents === 0
                          ? "bg-gray-300"
                          : checkedInCount / totalStudents >= 0.8
                            ? "bg-green-500"
                            : checkedInCount / totalStudents >= 0.5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{
                        width: `${
                          totalStudents > 0
                            ? (checkedInCount / totalStudents) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {checkedInCount === 0 && totalStudents > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      等待学生签到...
                    </p>
                  )}
                </div>

                {/* Student Lists */}
                {totalStudents > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Checked-in list */}
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">
                        已签到 ({checkedInStudents.length})
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-green-200 rounded-md bg-green-50">
                        {checkedInStudents.length === 0 ? (
                          <p className="text-xs text-gray-400 p-3">暂无</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-green-200">
                                <th className="text-left p-2 text-green-700 font-medium">
                                  学号
                                </th>
                                <th className="text-left p-2 text-green-700 font-medium">
                                  姓名
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {checkedInStudents.map((s) => (
                                <tr
                                  key={s.id}
                                  className={`border-b border-green-100 transition-all duration-700 ${
                                    highlightId === s.studentId
                                      ? "bg-green-200 animate-pulse"
                                      : ""
                                  }`}
                                >
                                  <td className="p-2">{s.studentId}</td>
                                  <td className="p-2">{s.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Absent list */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        未签到 ({absentStudents.length})
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-gray-50">
                        {absentStudents.length === 0 ? (
                          <p className="text-xs text-green-600 p-3">全部已签到</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left p-2 text-gray-500 font-medium">
                                  学号
                                </th>
                                <th className="text-left p-2 text-gray-500 font-medium">
                                  姓名
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {absentStudents.map((s) => (
                                <tr
                                  key={s.id}
                                  className="border-b border-gray-100"
                                >
                                  <td className="p-2 text-gray-500">
                                    {s.studentId}
                                  </td>
                                  <td className="p-2 text-gray-500">
                                    {s.name}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* End button */}
            <div className="mt-6 text-center">
              <button
                onClick={handleEndSession}
                className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 text-sm font-medium"
              >
                结束签到
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
