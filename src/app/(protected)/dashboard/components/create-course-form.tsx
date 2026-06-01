"use client";

import { useState } from "react";
import type { CreateCourseInput } from "@/lib/course-types";

interface CreateCourseFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export default function CreateCourseForm({ onSubmit, onCancel }: CreateCourseFormProps) {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: CreateCourseInput = { name, semester };

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "创建失败");
        return;
      }

      onSubmit();
    } catch {
      setError("连接错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">创建课程</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              课程名称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="例如：高等数学"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              学期
            </label>
            <input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="input-base"
              placeholder="例如：2026 春季"
              required
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? "创建中..." : "创建"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-outline flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
