---
phase: 03-check-in-system
plan: 02
subsystem: api
tags: [nextjs, api-routes, checkin, sessions, zod, websocket]

# Dependency graph
requires:
  - phase: 03-check-in-system
    provides: "checkin-service.ts (createSession, getActiveSession, submitAttendance, endSession), zod-schemas.ts (createSessionSchema, submitAttendanceSchema), db schema for checkInSessions and attendanceRecords"
provides:
  - "POST /api/sessions — auth-gated session creation with course ownership verification"
  - "POST /api/checkin/submit — public idempotent student check-in with session expiry enforcement"
  - "GET /api/checkin/[token] — public session resolution returning course info for QR landing page"
affects:
  - 03-check-in-system-03 (teacher UI - consumes POST /api/sessions)
  - 03-check-in-system-04 (student UI - consumes POST /api/checkin/submit and GET /api/checkin/[token])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth gate: getAuthSession(request) → 401 if !isAuthenticated || !user"
    - "Zod v4 safeParse with .issues API for validation error details"
    - "Public endpoints (no auth gate) for student-facing check-in routes"
    - "Idempotent POST: duplicate attendance returns 200 (not error) with alreadyCheckedIn flag"
    - "Next.js 16 async params: (await params).token for dynamic route segments"

key-files:
  created:
    - "src/app/api/sessions/route.ts"
    - "src/app/api/checkin/submit/route.ts"
    - "src/app/api/checkin/[token]/route.ts"
  modified:
    - "src/lib/checkin-types.ts"

key-decisions:
  - "Chinese error messages for student/teacher UX (e.g., '签到已结束或无效', '课程不存在或无权访问')"
  - "Submit check-in returns 400 (not 404) for expired/invalid session token — consistent student-facing error signaling"
  - "Student lookup requires both studentId AND name matching courseId — prevents ID guessing (T-03-07 mitigation)"
  - "Idempotency via unique DB constraint + catch at API level — duplicate returns 200 with alreadyCheckedIn flag"

patterns-established:
  - "Auth gate pattern: early return 401 before any business logic"
  - "Zod validation pattern: safeParse → .issues for 400 response"
  - "Ownership verification pattern: WHERE id=X AND teacherId=Y before operation"
  - "Try/catch wrapper pattern: catch returns 500 on unexpected errors (no error details leaked)"

requirements-completed:
  - CHECKIN-01
  - CHECKIN-02
  - CHECKIN-04

# Metrics
duration: 2min
completed: 2026-05-26
---

# Phase 3 Plan 02: API Routes for Check-In System Summary

**Three check-in API routes using Next.js App Router: auth-gated session creation, public idempotent student submission with session expiry, and public token-based session resolution for QR landing pages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-25T17:51:08Z
- **Completed:** 2026-05-25T17:52:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- POST /api/sessions: teacher-only session creation with course ownership verification (CHECKIN-01)
- POST /api/checkin/submit: public idempotent student check-in with session expiry enforcement (CHECKIN-02, CHECKIN-04)
- GET /api/checkin/[token]: public session resolution returning course info for student landing pages
- API response types added to checkin-types.ts for type-safe frontend consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Create POST /api/sessions route** - `96ed9c0` (feat)
2. **Task 2: Create POST /api/checkin/submit route** - `e202fba` (feat)
3. **Task 3: Create GET /api/checkin/[token] route** - `72b445b` (feat)

## Files Created/Modified
- `src/app/api/sessions/route.ts` - POST handler: auth-gated, validates courseId with Zod, verifies teacher ownership, calls createSession, returns token/sessionId/expiresAt
- `src/app/api/checkin/submit/route.ts` - POST handler (public): validates sessionToken/studentId/name, enforces session expiry, matches student to course, idempotent attendance submission
- `src/app/api/checkin/[token]/route.ts` - GET handler (public): resolves session by token from URL path, returns courseId/courseName/expiresAt for QR landing page
- `src/lib/checkin-types.ts` - Extended with ApiSessionResponse, ApiCheckinSubmitResponse, ApiCheckinAlreadyResponse, ApiSessionInfoResponse types

## Decisions Made
- Chinese error messages used throughout for student/teacher UX per project convention
- `submit` endpoint returns 400 (not 404) for expired/missing sessions — consistent with other validation errors from student perspective
- Student lookup enforces triple-match (studentId + name + courseId) as MITIGATION for T-03-07 (spoofing via ID guessing)
- Idempotency handled at API level by checking the return value of submitAttendance rather than catching the DB unique violation directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- API routes ready for teacher UI (03-03) to consume POST /api/sessions for QR code generation
- API routes ready for student UI (03-04) to consume POST /api/checkin/submit and GET /api/checkin/[token]
- No blockers — routes compile cleanly with zero TypeScript errors

---
## Self-Check: PASSED

- All 4 files exist on disk (3 route files + checkin-types.ts)
- All 3 commits found in git log (96ed9c0, e202fba, 72b445b)
- TypeScript compiles with zero errors (`npx tsc --noEmit --pretty`)
- No console.log statements in any new/modified file

---
*Phase: 03-check-in-system*
*Completed: 2026-05-26*
