import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth-types";
import { verifyToken } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (sessionCookie) {
    try {
      await verifyToken(sessionCookie.value);
      redirect("/dashboard");
    } catch {
      redirect("/login");
    }
  }

  redirect("/login");
}
