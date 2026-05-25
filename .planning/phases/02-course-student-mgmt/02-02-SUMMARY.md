---
phase: "02-course-student-mgmt"
plan: "02"
subsystem: "api"
tags: ["rest-api", "courses", "students", "crud"]
dependency_graph:
  requires: ["02-01"]
  provides: ["course-crud", "student-enrollment"]
  affects: ["ui-course-mgmt"]
tech_stack:
  added: []
  patterns: ["Next.js App Router routes", "Drizzle ORM queries", "Zod validation", "JWT auth guards"]
key_files:
  created:
    - "src/app/api/courses/route.ts"
    - "src/app/api/courses/[id]/route.ts"
    - "src/app/api/courses/[id]/students/route.ts"
    - "src/app/api/courses/[id]/students/[studentId]/route.ts"
  modified: []
decisions:
  - "Used leftJoin+groupBy for student count in GET /api/courses instead of N+1 queries"
  - "Combined GET + DELETE in courses/[id]/route.ts following Next.js colocation pattern"
  - "Added `|| !session.user` guard for TypeScript null narrowing (session.user typed as nullable)"
  - "Fixed Zod v4 API: .issues instead of .errors on ZodError"
metrics:
  duration: "~15min"
  completed: "2026-05-26"
  tasks_completed: 3
  files_created: 4
---

# Phase 02 Plan 02: Course + Student REST APIs Summary

## One-liner

Course CRUD and student enrollment REST APIs with JWT auth guards, Zod validation, and teacher ownership enforcement.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Course list + create API (GET + POST /api/courses) | af34e8c + f029c99 | `src/app/api/courses/route.ts` |
| 2 | Course detail + delete API with ownership check | 4452d97 + f029c99 | `src/app/api/courses/[id]/route.ts` |
| 3 | Student enrollment API (enroll, list, remove) | 746899d + f029c99 | `src/app/api/courses/[id]/students/route.ts`, `src/app/api/courses/[id]/students/[studentId]/route.ts` |

## API Endpoints Created

### Courses

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| GET | `/api/courses` | Required | Returns teacher's courses with student count |
| POST | `/api/courses` | Required | Creates course (teacherId from JWT, Zod validation) |
| GET | `/api/courses/[id]` | Required | Returns course detail with ownership check |
| DELETE | `/api/courses/[id]` | Required | Deletes course + cascades students (ownership verified) |

### Students

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| GET | `/api/courses/[id]/students` | Required | Returns student roster (ownership verified) |
| POST | `/api/courses/[id]/students` | Required | Enrolls student (Zod validation, 409 on duplicate) |
| DELETE | `/api/courses/[id]/students/[studentId]` | Required | Removes student enrollment (ownership verified) |

## Security Implementation

- **Auth gates**: Every handler calls `getAuthSession(request)`, returns 401 if not authenticated
- **Ownership enforcement**: All course/student operations verify `teacherId === session.user.id`
- **teacherId from JWT**: Never accepted from request body -- derived from session only
- **Zod validation**: POST endpoints validate request bodies, return 400 with clear error messages
- **Unique constraint**: Student enrollment returns 409 on duplicate studentId within a course

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 API mismatch**
- **Found during:** TypeScript verification (tsc --noEmit)
- **Issue:** Plan code used `parsed.error.errors[0].message` but Zod v4 (4.4.3) uses `.issues`
- **Fix:** Changed to `parsed.error.issues[0].message` in all 4 route files
- **Files modified:** All 4 route files
- **Commit:** f029c99

**2. [Rule 1 - Bug] TypeScript null assertion on session.user**
- **Found during:** TypeScript verification (tsc --noEmit)
- **Issue:** After `!session.isAuthenticated` guard, `session.user` still typed as possibly null
- **Fix:** Changed guard to `!session.isAuthenticated || !session.user` for proper narrowing
- **Files modified:** All 4 route files
- **Commit:** f029c99

## Known Stubs

None -- all endpoints are fully wired with database queries.

## Threat Flags

None beyond what's in the plan's threat model. All routes implement the mitigations specified in T-02-06 through T-02-10.

## Self-Check: PASSED

- All 4 route files exist and verified
- All commits present in git log
- Zero TypeScript errors in created/modified files
- Pre-existing errors (login, setup, auth.ts) are not caused by this plan
