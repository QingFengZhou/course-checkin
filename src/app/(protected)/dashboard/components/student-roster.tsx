"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  studentId: string;
  name: string;
  courseId: string;
}

interface StudentRosterProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
  activeSessionId?: string;
}

export default function StudentRoster({ courseId, courseName, onClose, activeSessionId }: StudentRosterProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      setStudents(json.data ?? []);
    } catch {
      setError("加载学生列表失败");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const [autoSessionId, setAutoSessionId] = useState<string | null>(null);
  const effectiveSessionId = activeSessionId ?? autoSessionId;

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Auto-detect active session for this course
  useEffect(() => {
    if (activeSessionId) return; // Use explicit prop if provided
    let cancelled = false;
    fetch(`/api/courses/${courseId}/active-session`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (!cancelled && json?.data) {
          setAutoSessionId(json.data.sessionId);
        }
      })
      .catch(() => {}); // Silently ignore - feature degrades gracefully
    return () => { cancelled = true; };
  }, [courseId, activeSessionId]);

  // Reset checked-in state when effectiveSessionId changes
  useEffect(() => {
    setCheckedInIds(new Set());
  }, [effectiveSessionId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "添加失败");
        return;
      }

      setStudentId("");
      setName("");
      fetchStudents();
    } catch {
      setError("连接错误，请重试");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (studentDbId: string) => {
    const confirmed = window.confirm("确定要移除此学生吗？");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/students/${studentDbId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove student");
      fetchStudents();
    } catch {
      setError("移除学生失败");
    }
  };

  const handleManualCheckIn = async (studentDbId: string) => {
    if (!effectiveSessionId) return;

    setCheckingInId(studentDbId);
    setError("");

    try {
      const res = await fetch(`/api/sessions/${effectiveSessionId}/manual-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentDbId }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "签到失败");
        return;
      }

      setCheckedInIds((prev) => new Set(prev).add(studentDbId));
    } catch {
      setError("网络错误，请重试");
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {courseName}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="mb-5 flex gap-2">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="学号"
            className="input-base flex-1"
            required
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名"
            className="input-base flex-1"
            required
          />
          <button
            type="submit"
            disabled={adding}
            className="btn btn-primary"
          >
            {adding ? "添加中..." : "添加"}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Student list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : students.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">暂无学生，请添加</p>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  {effectiveSessionId && (
                    <th className="text-center">签到</th>
                  )}
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isCheckedIn = checkedInIds.has(s.id);
                  const isCheckingIn = checkingInId === s.id;

                  return (
                    <tr key={s.id}>
                      <td className="text-gray-700">{s.studentId}</td>
                      <td className="text-gray-700">{s.name}</td>
                      {effectiveSessionId && (
                        <td className="text-center">
                          {isCheckedIn ? (
                            <span className="badge badge-success">已签到</span>
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(s.id)}
                              disabled={isCheckingIn}
                              className="btn text-xs px-3 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              {isCheckingIn ? "签到中..." : "签到"}
                            </button>
                          )}
                        </td>
                      )}
                      <td className="text-right">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/courses/${courseId}/attendance/${s.id}`,
                            )
                          }
                          className="text-xs text-gray-400 hover:text-blue-600 transition-colors mr-3"
                        >
                          考勤
                        </button>
                        <button
                          onClick={() => handleRemove(s.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
