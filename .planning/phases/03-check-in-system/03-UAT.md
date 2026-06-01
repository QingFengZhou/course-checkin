---
status: complete
phase: 03-check-in-system
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-05-26T00:00:00.000Z
updated: 2026-05-29T00:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Server boots without errors, migrations apply, dashboard loads.
result: pass

### 2. Teacher Starts Check-In from Dashboard
expected: Blue "发起签到" button on course card → navigates to /checkin/[courseId] with QR code, countdown, status bar.
result: pass

### 3. Teacher Views Active QR Code and Session Status
expected: QR code at ~300px, countdown ticking, "已签到 X / Y 人", "结束签到" button.
result: pass

### 4. Teacher Manually Checks In a Student
expected: Student roster shows "签到" column with per-row buttons when active session exists. Click → checkmark + "已签到".
result: pass
notes: Added GET /api/courses/[id]/active-session + StudentRoster auto-detection via useEffect.

### 5. Teacher Ends Session Early
expected: Confirm dialog "确定要结束本次签到吗？已签到的记录将保留。" → QR removed → "签到已结束".
result: pass

### 6. Student Opens Check-In Link (QR Scan Landing)
expected: Course name, student ID + name inputs, "签到" button on mobile-friendly layout.
result: pass

### 7. Student Submits Check-In Successfully
expected: Valid student → redirect to /checkin/success with checkmark, "签到成功!", student name, course name.
result: pass

### 8. Student Encounters Expired or Invalid Session
expected: No session param → "无效的签到链接". Invalid token → "签到已结束，请联系老师".
result: pass

### 9. Duplicate Check-In (Idempotency)
expected: Second submit returns 200 with alreadyCheckedIn:true, "你已签到，无需重复提交".
result: pass
notes: Bug fixed — Drizzle wraps postgres errors under .cause. submitAttendance now checks cause.code.

### 10. Student Submits Wrong Credentials
expected: Non-existent student → "学号或姓名不匹配，请确认后重试", name field cleared, studentId retained.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
gaps: 0

## Gaps

[none — all resolved]
