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
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col gap-3">
      <h3 className="font-bold text-lg text-gray-900">{course.name}</h3>
      <p className="text-sm text-gray-500">{course.semester}</p>
      <div className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full self-start">
        {course.studentCount} 名学生
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => router.push(`/dashboard/courses/${course.id}/attendance`)}
          className="flex-1 min-w-[80px] border border-green-400 text-green-600 py-2 rounded-md hover:bg-green-50 text-sm font-medium"
        >
          考勤总览
        </button>
        <button
          onClick={() => router.push(`/dashboard/courses/${course.id}/history`)}
          className="flex-1 min-w-[80px] border border-gray-400 text-gray-600 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
        >
          历史记录
        </button>
        <button
          onClick={() => onManageStudents(course)}
          className="flex-1 min-w-[80px] border border-blue-500 text-blue-500 py-2 rounded-md hover:bg-blue-50 text-sm font-medium"
        >
          管理学生
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 py-2 rounded-md hover:text-red-700 text-sm font-medium px-2"
        >
          删除
        </button>
      </div>

      {activeSession ? (
        /* Active session exists — show "查看签到码" */
        <button
          onClick={() =>
            router.push(
              `/checkin/${course.id}?session=${activeSession.token}&sessionId=${activeSession.sessionId}&expiresAt=${encodeURIComponent(activeSession.expiresAt)}`,
            )
          }
          className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 text-sm font-medium"
        >
          查看签到码
        </button>
      ) : (
        <>
          {checkinError && (
            <p className="text-xs text-red-500">{checkinError}</p>
          )}
          {/* Duration + Start */}
          {!checkingActive && (
            <div className="flex gap-2 items-center">
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {startingCheckin ? "发起中..." : "发起签到"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
