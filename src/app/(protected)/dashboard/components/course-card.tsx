"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CourseWithStudentCount } from "@/lib/course-types";

interface ActiveSession {
  sessionId: string;
  token: string;
  expiresAt: string;
}

interface CourseCardProps {
  course: CourseWithStudentCount;
  onDelete: (id: string) => Promise<void>;
  onManageStudents: (course: CourseWithStudentCount) => void;
}

export default function CourseCard({ course, onDelete, onManageStudents }: CourseCardProps) {
  const router = useRouter();
  const [startingCheckin, setStartingCheckin] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);

  // Check for active session on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${course.id}/active-session`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.data?.token) {
          setActiveSession({
            sessionId: json.data.sessionId,
            token: json.data.token,
            expiresAt: json.data.expiresAt,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingActive(false);
      });
    return () => { cancelled = true; };
  }, [course.id]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "确定要删除此课程吗？这将同时删除该课程下的所有学生。"
    );
    if (confirmed) {
      await onDelete(course.id);
    }
  };

  const handleStartCheckin = async () => {
    setStartingCheckin(true);
    setCheckinError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, durationMinutes }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setCheckinError(data.error ?? "创建签到失败");
        return;
      }

      const json = await res.json();
      router.push(
        `/checkin/${course.id}?session=${json.data.token}&sessionId=${json.data.sessionId}&expiresAt=${encodeURIComponent(json.data.expiresAt)}`,
      );
    } catch {
      setCheckinError("网络错误，请重试");
    } finally {
      setStartingCheckin(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Course name + badge */}
      <div>
        <h3 className="font-semibold text-gray-900 text-base">{course.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-400">{course.semester}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
            {course.studentCount} 名学生
          </span>
        </div>
      </div>

      {checkinError && (
        <p className="text-xs text-red-500">{checkinError}</p>
      )}

      {/* Buttons row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push(`/dashboard/courses/${course.id}/attendance`)}
          className="flex-1 min-w-[70px] px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:border-green-400 hover:text-green-600 hover:bg-green-50/50 transition-all"
        >
          考勤总览
        </button>
        <button
          onClick={() => router.push(`/dashboard/courses/${course.id}/history`)}
          className="flex-1 min-w-[70px] px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          历史记录
        </button>
        <button
          onClick={() => onManageStudents(course)}
          className="flex-1 min-w-[70px] px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          管理学生
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-2 rounded-lg text-gray-300 hover:text-red-500 transition-colors text-xs"
        >
          删除
        </button>
      </div>

      {/* Active session / Start check-in */}
      {activeSession ? (
        <button
          onClick={() =>
            router.push(
              `/checkin/${course.id}?session=${activeSession.token}&sessionId=${activeSession.sessionId}&expiresAt=${encodeURIComponent(activeSession.expiresAt)}`,
            )
          }
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm"
        >
          查看签到码
        </button>
      ) : (
        !checkingActive && (
          <div className="flex gap-2 items-center">
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="flex-shrink-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value={1}>1 分钟</option>
              <option value={2}>2 分钟</option>
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
            </select>
            <button
              onClick={handleStartCheckin}
              disabled={startingCheckin}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {startingCheckin ? "发起中..." : "发起签到"}
            </button>
          </div>
        )
      )}
    </div>
  );
}
