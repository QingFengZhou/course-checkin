"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const studentName = searchParams.get("name");
  const courseName = searchParams.get("course");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4,12 10,18 20,6" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-4">签到成功！</h1>

        {studentName ? (
          <>
            <p className="text-lg text-gray-900 mb-1">{studentName}</p>
            <p className="text-sm text-gray-500">
              {courseName || "课程签到"}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">课程签到</p>
        )}

        <p className="text-xs text-gray-400 mt-8">页面可关闭</p>
      </div>
    </main>
  );
}
