import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { courses } from "./courses";
import { students } from "./students";

export const checkInSessions = pgTable(
  "check_in_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => ({
    tokenUnique: uniqueIndex("check_in_sessions_token_unique").on(table.token),
    courseIdIdx: index("check_in_sessions_course_id_idx").on(table.courseId),
  }),
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => checkInSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionStudentUnique: uniqueIndex(
      "attendance_records_session_student_unique",
    ).on(table.sessionId, table.studentId),
  }),
);

export type InsertCheckInSession = typeof checkInSessions.$inferInsert;
export type SelectCheckInSession = typeof checkInSessions.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type SelectAttendanceRecord = typeof attendanceRecords.$inferSelect;
