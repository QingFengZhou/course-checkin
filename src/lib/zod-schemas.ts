import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  username: z.string().min(1, "Username is required").optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
  message: "Email or username is required",
});

export const setupSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
});

export const createCourseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  semester: z.string().min(1, "Semester is required"),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  name: z.string().min(1, "Student name is required"),
});

export const createSessionSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  durationMinutes: z.number().int().min(1).max(60).optional().default(5),
});

export const submitAttendanceSchema = z.object({
  sessionToken: z.string().min(1, "Session token is required"),
  studentId: z.string().min(1, "Student ID is required"),
  name: z.string().min(1, "Student name is required"),
});
