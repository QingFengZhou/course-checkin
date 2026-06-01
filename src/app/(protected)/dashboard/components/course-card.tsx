"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseWithStudentCount } from "@/lib/course-types";

interface CourseCardProps {
  course: CourseWithStudentCount;
  onDelete: (id: string) => Promise<void>;
  onManageStudents: (course: CourseWithStudentCount) => void;
}

export default function CourseCard({ course, onDelete, onManageStudents }: CourseCardProps) {
  const router = useRouter();
  const [startingCheckin, setStartingCheckin] = useState(false);
  const [checkinError, setCheckinError] = useState("");

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
        body: JSON.stringify({ courseId: course.id }),
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

      {checkinError && (
        <p className="text-xs text-red-500">{checkinError}</p>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onManageStudents(course)}
          className="flex-1 border border-blue-500 text-blue-500 py-2 rounded-md hover:bg-blue-50 text-sm font-medium"
        >
          管理学生
        </button>
        <button
          onClick={handleDelete}
          className="px-4 text-red-500 py-2 rounded-md hover:text-red-700 text-sm font-medium"
        >
          删除
        </button>
      </div>

      <button
        onClick={handleStartCheckin}
        disabled={startingCheckin}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {startingCheckin ? "发起中..." : "发起签到"}
      </button>
    </div>
  );
}
