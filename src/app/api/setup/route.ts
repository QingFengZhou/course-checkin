import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { setupSchema } from "@/lib/zod-schemas";

export async function POST(request: NextRequest) {
  try {
    const result = await db.select({ count: count() }).from(users);
    if (result[0].count > 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, username, password, displayName } = parsed.data;
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      email,
      username,
      passwordHash,
      displayName,
      role: "teacher",
    });

    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
