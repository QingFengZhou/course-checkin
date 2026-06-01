"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckinLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session");

  const [courseName, setCourseName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  useEffect(() => {
    if (!session) {
      setFetchError("无效的签到链接");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSession() {
      try {
        const res = await fetch(`/api/checkin/${session}`);
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setFetchError("签到已结束，请联系老师");
          setLoading(false);
          return;
        }

        setCourseName(data.data.courseName);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setFetchError("网络错误，请重试");
          setLoading(false);
        }
      }
    }

    fetchSession();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setError("");

    if (!studentId.trim() || !name.trim()) {
      setFormError("请填写学号和姓名");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/checkin/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: session,
          studentId: studentId.trim(),
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.data?.alreadyCheckedIn) {
          setAlreadyCheckedIn(true);
        } else if (data.data?.studentName) {
          const studentNameEnc = encodeURIComponent(data.data.studentName);
          const courseNameEnc = encodeURIComponent(courseName);
          router.push(
            `/checkin/success?name=${studentNameEnc}&course=${courseNameEnc}`,
          );
        }
      } else {
        if (data.error && data.error.includes("签到已结束")) {
          setError("签到已结束，无法签到");
        } else if (data.error && data.error.includes("未找到")) {
          setError("学号或姓名不匹配，请确认后重试");
          setName("");
        } else {
          setError(data.error || "提交失败，请重试");
        }
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </main>
    );
  }

  // Fetch error (session invalid/expired)
  if (fetchError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-sm text-center">
          <p className="text-gray-500 text-sm">{fetchError}</p>
        </div>
      </main>
    );
  }

  // Already checked in
  if (alreadyCheckedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl leading-none">&#10003;</span>
          </div>
          <p className="text-gray-700 text-sm">你已签到，无需重复提交</p>
        </div>
      </main>
    );
  }

  // Form
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-1 text-gray-900">
          {courseName}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          请在下方输入信息完成签到
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="studentId"
              className="block text-xs text-gray-700 mb-1"
            >
              学号
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 input-base"
              placeholder="请输入学号"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-xs text-gray-700 mb-1"
            >
              姓名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 input-base"
              placeholder="请输入姓名"
              required
            />
          </div>

          {formError && (
            <div className="mb-4 text-red-500 text-sm">{formError}</div>
          )}
          {error && (
            <div className="mb-4 text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          >
            {submitting ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                提交中...
              </>
            ) : (
              "签到"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
