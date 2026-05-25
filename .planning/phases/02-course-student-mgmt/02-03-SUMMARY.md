---
phase: "02-course-student-mgmt"
plan: "03"
subsystem: "dashboard-ui"
tags: ["dashboard", "course-management", "student-roster", "ui"]
created: "2026-05-26"

dependency_graph:
  requires:
    - "02-01 (course + student DB schemas)"
    - "02-02 (course + student REST APIs)"
  provides:
    - "Dashboard page with course card grid"
    - "Course card component with delete + manage students"
    - "Create course form modal"
    - "Student roster panel with add/remove"
  affects:
    - "src/app/(protected)/dashboard/page.tsx (replaced)"

tech_stack:
  added:
    - "No new packages — uses existing React, Next.js, Tailwind"
  patterns:
    - "Client components with fetch + credentials: include"
    - "Modal overlays with fixed positioning"
    - "window.confirm for destructive actions"

key_files:
  created:
    - "src/app/(protected)/dashboard/components/course-card.tsx"
    - "src/app/(protected)/dashboard/components/create-course-form.tsx"
    - "src/app/(protected)/dashboard/components/student-roster.tsx"
  modified:
    - "src/app/(protected)/dashboard/page.tsx (full rewrite)"

decisions:
  - "Used client component for dashboard (plan <behavior> specified 'use client')"
  - "Used window.confirm for delete confirmations (per CONTEXT.md Claude's Discretion, D-2.03)"
  - "Optimistic UI: delete removes from local state immediately after API confirms"
  - "Chinese UI labels throughout per plan <behavior> section"

metrics:
  duration: "~15min"
  completed_date: "2026-05-26"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 02 Plan 03: Dashboard UI Summary

**One-liner:** Full dashboard UI with course card grid, create form modal, delete confirmation, and student roster panel with add/remove — all client-side with authenticated fetches.

## Tasks Completed

### Task 1: Dashboard page + course card + create form

**Commits:** `3d89d4a`

**Files:**
- `src/app/(protected)/dashboard/page.tsx` — Full rewrite as `"use client"` component
- `src/app/(protected)/dashboard/components/course-card.tsx` — New file
- `src/app/(protected)/dashboard/components/create-course-form.tsx` — New file

**What was built:**
- Dashboard page with top bar (CourseCheckIn title + logout button), responsive card grid (1/2/3 cols), create button
- CourseCard: displays course name, semester, student count badge, "管理学生" (blue outline) and "删除" (red text) buttons
- CreateCourseForm: modal with name + semester inputs, POSTs to `/api/courses`, calls parent callback on success
- Delete uses `window.confirm` with cascade warning, removes from local state on success
- All fetches use `credentials: "include"` for auth cookie
- Loading spinner, error display, empty state all handled

### Task 2: Student roster panel

**Commits:** `7389c60`

**Files:**
- `src/app/(protected)/dashboard/components/student-roster.tsx` — New file

**What was built:**
- Modal panel with header (course name + close button), add form, student table
- Add form: student ID + name inputs side-by-side, POSTs to `/api/courses/[id]/students`
- Remove: `window.confirm` then DELETE to `/api/courses/[id]/students/[studentId]`
- Auto-refreshes after add/remove via re-fetch
- Loading state, empty state ("暂无学生，请添加"), error display
- Table layout: 学号, 姓名, 操作 columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 `.errors` -> `.issues` API**
- **Found during:** Build verification
- **Issue:** `src/app/api/auth/login/route.ts` and `src/app/api/setup/route.ts` used `.errors` which doesn't exist in Zod v4
- **Fix:** Changed to `.issues` (correct Zod v4 API)
- **Files modified:** `src/app/api/auth/login/route.ts`, `src/app/api/setup/route.ts`
- **Commit:** `11daf88`

**2. [Rule 1 - Bug] Fixed JWT type assertion overlap**
- **Found during:** Build verification
- **Issue:** `src/lib/auth.ts` direct cast from `JWTPayload` to `JwtPayload` fails TypeScript strict check
- **Fix:** Cast via `unknown` intermediate (`payload as unknown as JwtPayload`)
- **Files modified:** `src/lib/auth.ts`
- **Commit:** `11daf88`

## Known Stubs

None — all UI components are fully wired to real API endpoints.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: XSS via user input | student-roster.tsx | Student name and studentId rendered directly from API — relies on API sanitization (already enforced by Zod in T-02-10) |

## Verification

- `npx tsc --noEmit` — passes for all new files
- `npm run build` — compiles successfully with all routes
- Dashboard renders at `/dashboard` with responsive card grid
- All success criteria met

## Self-Check: PASSED
