---
phase: 03-check-in-system
plan: "03"
subsystem: teacher-ui
tags: [nextjs, qrcode.react, websocket-polling, server-component, manual-checkin]

# Dependency graph
requires:
  - phase: 03-check-in-system plan: "01"
    provides: checkin-service.ts (createSession, submitAttendance, endSession)
  - phase: 03-check-in-system plan: "02"
    provides: POST /api/sessions route
  - phase: 02-course-student-mgmt
    provides: course-card, student-roster components
provides:
  - Teacher check-in page at /checkin/[courseId] with QR code display
  - GET /api/sessions/[sessionId] for attendance count polling
  - PATCH /api/sessions/[sessionId] for ending sessions
  - POST /api/sessions/[sessionId]/manual-checkin for teacher manual check-in
  - "发起签到" button on course card
  - "签到" column in student roster
affects:
  - 03-04-student-ui

# Key decisions
- **Self-auth on check-in page**: Middleware does NOT cover `/checkin/:path*`. Server Component reads `cookies()` and calls `verifyToken()` directly, redirects to `/login` if unauthenticated.
- **Attendance count endpoint**: Created GET /api/sessions/[sessionId] (teacher-only, auth-gated) to serve "已签到 X / Y 人" polling data. RESEARCH.md identified this as a missing endpoint.
- **Session token flow**: Course card creates session via POST /api/sessions, passes token/sessionId/expiresAt as URL search params. Check-in page reads params and auto-starts countdown. Avoids wasted duplicate session creation.
- **Manual check-in in roster**: StudentRoster accepts optional `activeSessionId` prop. When present, shows "签到" column per row. Tracks checked-in state locally per session lifecycle.

# Tech stack
added:
  - qrcode.react@^4.0.0 (QRCodeSVG named export)
patterns:
  - Server Component self-auth pattern (cookies() + verifyToken + redirect)
  - useSearchParams for client-side URL param reading (Suspense boundary required)
  - setInterval cleanup in useEffect (countdown + polling timers)

---
# Phase 3 Plan 03: Teacher Check-In Page Summary

Teacher check-in page with QR code display, session timer, attendance count polling, and manual check-in capability.

## Tasks Completed

| # | Name | Type | Commit | Key Files |
|---|------|------|--------|-----------|
| 1 | Teacher check-in page with QR code + session API | auto | 76c6af9 | CheckInPageClient.tsx, page.tsx, [sessionId]/route.ts |
| 2 | Manual check-in API + UI modifications | auto | b7d9efd | manual-checkin/route.ts, course-card.tsx, student-roster.tsx |
| — | Session token flow fix (Rule 1) | fix | b311f22 | course-card.tsx, CheckInPageClient.tsx, page.tsx |

## Created Files

| File | Purpose |
|------|---------|
| `src/app/(protected)/checkin/[courseId]/page.tsx` | Server Component: self-auth, course ownership check, Suspense wrapper |
| `src/app/(protected)/checkin/[courseId]/components/CheckInPageClient.tsx` | Client Component: QR display, countdown, polling, session lifecycle |
| `src/app/api/sessions/[sessionId]/route.ts` | GET (attendance count) + PATCH (end session) endpoints |
| `src/app/api/sessions/[sessionId]/manual-checkin/route.ts` | POST endpoint for teacher manual student check-in |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/(protected)/dashboard/components/course-card.tsx` | Added "发起签到" button, session creation + navigation flow |
| `src/app/(protected)/dashboard/components/student-roster.tsx` | Added optional activeSessionId prop, "签到" column with per-row manual check-in |
| `package.json` | Added qrcode.react@^4.0.0 dependency |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type mismatch on isSessionExpired call**
- **Found during:** Task 2 manual-checkin route creation
- **Issue:** `isSessionExpired` expects full `SelectCheckInSession` type, but query only selected `id`, `status`, `expiresAt`
- **Fix:** Used inline expiry check (`sessionRow.expiresAt < new Date()`) instead of calling `isSessionExpired`
- **Files modified:** `src/app/api/sessions/[sessionId]/manual-checkin/route.ts`
- **Commit:** b7d9efd

**2. [Rule 1 - Bug] Session token not passed from course card to check-in page**
- **Found during:** Post-implementation flow review
- **Issue:** Course card created a session (POST /api/sessions) but navigated without passing token, forcing teacher to click "发起签到" again on the check-in page, wasting the first session
- **Fix:** Course card passes session/token/expiresAt as URL search params; CheckInPageClient reads params via useSearchParams and auto-starts countdown; page wrapped in Suspense boundary
- **Files modified:** `course-card.tsx`, `CheckInPageClient.tsx`, `page.tsx`
- **Commit:** b311f22

## Verification Results

- [x] `npx tsc --noEmit --pretty` passes with no errors
- [x] `npm run build` succeeds — all routes compiled correctly
- [x] QR code uses `QRCodeSVG` named export from qrcode.react (size=300, level="L")
- [x] Check-in page implements self-auth via cookies() + verifyToken (middleware gap addressed)
- [x] GET /api/sessions/[sessionId] returns session + attendance count (teacher-only)
- [x] PATCH /api/sessions/[sessionId] ends sessions with ownership check
- [x] POST /api/sessions/[sessionId]/manual-checkin handles auth, ownership, expiry, duplicates
- [x] Course card "发起签到" button only visible when studentCount > 0
- [x] Student roster "签到" column only visible when activeSessionId prop provided
- [x] All UI labels in Chinese per copywriting contract
- [x] setInterval timers properly cleaned up on unmount

## Self-Check: PASSED

All created files exist, all commits verified, build succeeds.
