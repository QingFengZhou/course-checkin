---
status: complete
plan: 05-03
phase: 05-history-reporting
wave: 2
commits:
  - 176ecc9 feat(05): attendance overview and student detail pages
---

# 05-03 SUMMARY: Student Attendance Pages

## What Was Built

- **Attendance overview page** — `/dashboard/courses/[courseId]/attendance` shows all students with sortable attendance rates, colored bars, search by name/ID
- **Student attendance detail page** — `/dashboard/courses/[courseId]/attendance/[studentId]` shows student info, attendance summary stats, and timeline of all sessions with present/absent badges
- **"考勤" button** — Added to student roster rows in StudentRoster component

## Key Files Created/Modified

- `src/app/(protected)/dashboard/courses/[courseId]/attendance/page.tsx` (NEW)
- `src/app/(protected)/dashboard/courses/[courseId]/attendance/[studentId]/page.tsx` (NEW)
- `src/app/(protected)/dashboard/components/student-roster.tsx` — Added 考勤 button
