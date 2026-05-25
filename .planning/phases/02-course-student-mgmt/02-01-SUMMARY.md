---
phase: "02-course-student-mgmt"
plan: "01"
subsystem: "database"
tags: ["schema", "drizzle", "postgresql", "courses", "students", "zod"]
dependency_graph:
  requires: ["01-foundation-auth (users table)"]
  provides: ["courses table", "students table", "course-types", "zod-schemas"]
  affects: ["02-02 (course CRUD APIs)", "02-03 (student management APIs)"]
tech_stack:
  added: ["drizzle-orm/pg-core", "zod v4"]
  patterns: ["pgTable with FK references", "uniqueIndex for compound constraints", "Zod object schemas"]
key_files:
  created:
    - src/db/schema/courses.ts
    - src/db/schema/students.ts
    - src/lib/course-types.ts
    - drizzle/0001_exotic_blob.sql
    - drizzle/0002_opposite_zarek.sql
  modified:
    - src/db/schema/index.ts
    - src/lib/zod-schemas.ts
decisions:
  - "Used uniqueIndex (not unique constraint) for compound unique on students table — same effect, cleaner Drizzle syntax"
  - "Followed plan's exact schema definitions with index() for teacher_id and course_id lookups"
metrics:
  duration: "~10min"
  completed_date: "2026-05-26"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 02 Plan 01: Course + Student DB Schema Summary

**One-liner:** Database schema for courses (with teacher ownership FK) and student enrollments (with cascade delete and per-course unique student IDs), plus TypeScript types and Zod validation schemas.

## Tasks Completed

| Task | Name | Commit | Files Created/Modified |
|------|------|--------|----------------------|
| 1 | Create courses table schema | 28b1e25 | `src/db/schema/courses.ts`, `src/db/schema/index.ts`, `drizzle/0001_exotic_blob.sql` |
| 2 | Create students table schema | fe84f1f | `src/db/schema/students.ts`, `src/db/schema/index.ts`, `drizzle/0002_opposite_zarek.sql` |
| 3 | Create shared types + Zod schemas | cdf4a81 | `src/lib/course-types.ts`, `src/lib/zod-schemas.ts` |

## Verification Results

- `src/db/schema/courses.ts` — pgTable("courses") with teacher_id FK to users.id (ON DELETE CASCADE)
- `src/db/schema/students.ts` — pgTable("students") with course_id FK to courses.id (ON DELETE CASCADE), unique index on (course_id, student_id)
- `src/db/schema/index.ts` — barrel export includes users, courses, students
- `src/lib/course-types.ts` — exports CreateCourseInput, EnrollStudentInput, CourseWithStudentCount
- `src/lib/zod-schemas.ts` — exports createCourseSchema, enrollStudentSchema (plus existing loginSchema, setupSchema)
- Migrations applied to PostgreSQL: 0001 (courses), 0002 (students)
- TypeScript compilation: zero errors in new files (pre-existing Phase 1 errors in unrelated files)
- DB verified: both tables exist with correct columns, indexes, and FK constraints

## Deviations from Plan

### Pre-existing TypeScript Errors (Out of Scope)

**[Deferred]** Four pre-existing TypeScript errors in Phase 1 files (dashboard/page.tsx, auth routes, auth.ts) — these are unrelated to this plan's changes and were not introduced here. The new files (courses.ts, students.ts, course-types.ts, zod-schemas.ts) compile with zero errors.

### .env File Creation (Rule 3 - Blocking)

**[Rule 3 - Blocking]** No `.env` file existed but was required for `DATABASE_URL` to connect drizzle-kit to PostgreSQL. Created `.env` from `.env.example` with development defaults to unblock migration generation and application.

## Known Stubs

None — this plan only creates schema definitions and types. No UI stubs or placeholder values.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. Schema-level security (FK constraints, cascade deletes) matches the plan's threat model.

## Self-Check: PASSED

All created files verified to exist. All commits verified in git log.
