import { nanoid } from "nanoid";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import type { SelectCheckInSession } from "@/db/schema/checkin";

/** Session lifetime: 5 minutes (D-3.01) */
const SESSION_DURATION_MS = 5 * 60 * 1000;

/**
 * Create a new check-in session for a course.
 *
 * teacherId is accepted for the API layer to verify ownership before
 * calling this function (ownership check done at API level per D-3.05).
 */
export async function createSession(courseId: string, teacherId: string) {
  const token = nanoid();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(checkInSessions)
    .values({
      courseId,
      token,
      status: "active",
      expiresAt,
    })
    .returning();

  return session;
}

/**
 * Look up an active session by its token.
 * Returns null if the session does not exist or has expired.
 * On expiry, the session is automatically closed via endSession (D-3.01/D-3.04).
 */
export async function getActiveSession(token: string) {
  const [session] = await db
    .select()
    .from(checkInSessions)
    .where(
      and(
        eq(checkInSessions.token, token),
        eq(checkInSessions.status, "active"),
      ),
    );

  if (!session) return null;

  if (isSessionExpired(session)) {
    await endSession(session.id);
    return null;
  }

  return session;
}

/**
 * Submit a student's attendance for a check-in session.
 * Idempotent: DB unique constraint on (session_id, student_id) prevents
 * duplicate check-ins. Returns { error: 'already checked in' } on duplicate.
 */
export async function submitAttendance(sessionId: string, studentId: string) {
  try {
    await db.insert(attendanceRecords).values({
      sessionId,
      studentId,
    });
    return { success: true } as const;
  } catch (error: unknown) {
    if (error !== null && typeof error === "object") {
      const err = error as Record<string, unknown>;
      const cause = err.cause as Record<string, unknown> | undefined;
      // Drizzle wraps postgres errors under .cause
      if (cause && (cause.code === "23505" || cause.code === 23505)) {
        return { error: "already checked in" } as const;
      }
      // Also check top-level (raw postgres-js)
      if (err.code === "23505" || err.code === 23505) {
        return { error: "already checked in" } as const;
      }
      // Fallback: check message for duplicate key pattern
      const msg = String(err.message || "");
      if (msg.includes("duplicate key") || msg.includes("23505")) {
        return { error: "already checked in" } as const;
      }
    }
    throw error;
  }
}

/**
 * Close a check-in session: set status to 'closed' and record closed_at.
 */
export async function endSession(sessionId: string) {
  await db
    .update(checkInSessions)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(checkInSessions.id, sessionId));
}

/**
 * Check whether a session is expired.
 * A session is expired if its expires_at is in the past or its status
 * is no longer 'active'.
 */
export function isSessionExpired(session: SelectCheckInSession): boolean {
  return session.expiresAt < new Date() || session.status !== "active";
}
