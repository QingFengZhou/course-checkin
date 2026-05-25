import { cookies } from "next/headers";

export default function DashboardPage() {
  const cookieStore = cookies();
  const session = cookieStore.get("cc_session");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Welcome to CourseCheckIn</h1>
        <p>{session ? "You are logged in." : "Session not found."}</p>
      </div>
    </main>
  );
}
