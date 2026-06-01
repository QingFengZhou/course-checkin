"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
        body: JSON.stringify({ courseId: course.id }),
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
            <p className="text-sm text-gray-500 mb-6">{course.semester}</p>
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

              {/* Status panel */}
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">签到统计</p>
                  <p className="text-lg font-semibold text-gray-900">
                    已签到 {checkedInCount} / {totalStudents} 人
                  </p>
                  {checkedInCount === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      等待学生签到...
                    </p>
                  )}
                </div>
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
