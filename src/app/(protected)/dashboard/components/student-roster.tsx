"use client";

import { useState, useEffect, useCallback } from "react";

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
}

export default function StudentRoster({ courseId, courseName, onClose }: StudentRosterProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

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

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            学生名单 — {courseName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="请输入学号"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入姓名"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Student list */}
        {loading ? (
          <p className="text-gray-500 text-center py-4">加载中...</p>
        ) : students.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无学生，请添加</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600 font-medium">学号</th>
                <th className="text-left py-2 text-gray-600 font-medium">姓名</th>
                <th className="text-right py-2 text-gray-600 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2">{s.studentId}</td>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleRemove(s.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
