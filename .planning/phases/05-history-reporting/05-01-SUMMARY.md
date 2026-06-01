---
status: complete
plan: 05-01
phase: 05-history-reporting
wave: 1
commits:
  - 298f0d4 feat(05): history API endpoints + course card button
---

# 05-01 SUMMARY: History API Endpoints

## What Was Built

- **GET /api/courses/[courseId]/sessions** — Paginated session list with checkedInCount, totalStudents
- **GET /api/students/[studentId]/attendance** — Per-student attendance timeline with summary stats
- **GET /api/courses/[courseId]/attendance-summary** — All students' attendance stats with sorting
- **Course card** — Added "历史记录" button navigating to history list page

## Key Files Created/Modified

- `src/app/api/courses/[courseId]/sessions/route.ts` (NEW)
- `src/app/api/students/[studentId]/attendance/route.ts` (NEW)
- `src/app/api/courses/[courseId]/attendance-summary/route.ts` (NEW)
- `src/app/(protected)/dashboard/components/course-card.tsx` — Added history button
