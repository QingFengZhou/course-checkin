import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { courses } from "./courses";

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: varchar("student_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  courseIdIdx: index("students_course_id_idx").on(table.courseId),
  courseStudentUnique: uniqueIndex("students_course_student_unique")
    .on(table.courseId, table.studentId),
}));

export type InsertStudent = typeof students.$inferInsert;
export type SelectStudent = typeof students.$inferSelect;
