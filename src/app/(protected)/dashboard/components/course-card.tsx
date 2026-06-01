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

const COURSE_COLORS = [
  { from: "from-blue-500", to: "to-blue-600", bg: "bg-blue-50", text: "text-blue-600" },
  { from: "from-emerald-500", to: "to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600" },
  { from: "from-violet-500", to: "to-violet-600", bg: "bg-violet-50", text: "text-violet-600" },
  { from: "from-amber-500", to: "to-amber-600", bg: "bg-amber-50", text: "text-amber-600" },
  { from: "from-rose-500", to: "to-rose-600", bg: "bg-rose-50", text: "text-rose-600" },
  { from: "from-cyan-500", to: "to-cyan-600", bg: "bg-cyan-50", text: "text-cyan-600" },
];

function getCourseColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

function getInitials(name: string): string {
  const chars = name.replace(/[a-zA-Z]/g, "").slice(0, 2) || name.slice(0, 2);
  return chars.toUpperCase();
}

export default function CourseCard({ course, onDelete, onManageStudents }: CourseCardProps) {
  const router = useRouter();
  const [startingCheckin, setStartingCheckin] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);

  // Deterministic color based on course id
  useEffect(() => {
    let hash = 0;
    for (let i = 0; i < course.id.length; i++) {
      hash = ((hash << 5) - hash) + course.id.charCodeAt(i);
    }
    setColorIndex(Math.abs(hash) % COURSE_COLORS.length);
  }, [course.id]);

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

  const handleDelete = () => {
    const confirmed = window.confirm("确定要删除此课程吗？这将同时删除该课程下的所有学生。");
    if (confirmed) onDelete(course.id);
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

  const colors = getCourseColor(colorIndex);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden">
      {/* Color accent top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />

      <div className="p-5">
        {/* Course header with icon */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
            {getInitials(course.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {course.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{course.semester}</p>
          </div>
        </div>

        {/* Student count + status */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {course.studentCount} 名学生
          </span>
          {activeSession && (
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              签到中
            </span>
          )}
        </div>

        {checkinError && (
          <p className="text-xs text-red-500 mb-3">{checkinError}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => router.push(`/dashboard/courses/${course.id}/attendance`)}
            className="flex-1 min-w-[60px] px-3 py-2 rounded-xl border border-gray-100 text-gray-400 text-xs font-medium hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all"
          >
            考勤总览
          </button>
          <button
            onClick={() => router.push(`/dashboard/courses/${course.id}/history`)}
            className="flex-1 min-w-[60px] px-3 py-2 rounded-xl border border-gray-100 text-gray-400 text-xs font-medium hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
          >
            历史记录
          </button>
          <button
            onClick={() => onManageStudents(course)}
            className="flex-1 min-w-[60px] px-3 py-2 rounded-xl border border-gray-100 text-gray-400 text-xs font-medium hover:border-violet-200 hover:text-violet-600 hover:bg-violet-50/50 transition-all"
          >
            管理学生
          </button>
          <button
            onClick={handleDelete}
            className="px-2.5 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-red-400 transition-colors"
          >
            删除
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-50 pt-4">
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
              <div className="flex gap-2">
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="flex-shrink-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
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
      </div>
    </div>
  );
}
