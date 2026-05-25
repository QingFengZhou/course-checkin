# Roadmap: CourseCheckIn (课程签到系统)

## Overview

Build a lightweight real-time course attendance check-in system that handles 100-300 concurrent student check-ins without lag. Five phases deliver: teacher authentication, course/student management, QR-based check-in flow, real-time WebSocket dashboard, and attendance history reports. Each phase is a vertical slice — a complete, observable capability.

## Phases

- [x] **Phase 1: Foundation + Auth** - PostgreSQL schema, Drizzle ORM, teacher login with JWT + HTTP-only cookies, base layout (completed 2026-05-25)
- [ ] **Phase 2: Course + Student Management** - Course CRUD, student roster management, enrollment API
- [ ] **Phase 3: Check-In System** - QR code generation, student check-in submission, session lifecycle, manual sign-in
- [ ] **Phase 4: Real-Time Dashboard** - WebSocket server, room-based broadcasting, live attendance rate and student lists
- [ ] **Phase 5: History & Reporting** - Session history records, student attendance history and absence tracking

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Teachers can log in securely and the application has a working database foundation
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. Teacher can log in with email/username and password
  2. Teacher stays logged in when navigating between pages (session persists)
  3. Teacher is redirected to login when accessing protected pages while not authenticated
**Plans**: 1 plan (4 sub-plans, 1 wave)


Plans:
- [ ] 01-PLAN.md -- Project scaffolding + database schema + auth service + login UI (4 sub-plans, 1 wave)

### Phase 2: Course + Student Management
**Goal**: Teachers can create courses and manage student rosters
**Depends on**: Phase 1
**Requirements**: COURSE-01, COURSE-02, COURSE-03, STUDENT-01, STUDENT-02
**Success Criteria** (what must be TRUE):
  1. Teacher can create a new course with name and semester
  2. Teacher sees a list of their courses on the dashboard
  3. Teacher can delete a course and confirm it is removed from the list
  4. Teacher can add a student (student ID + name) to a course and see them in the roster
**Plans**: TBD

Plans:
- [ ] 02-01: Course model and API (create, list, delete with teacher ownership)
- [ ] 02-02: Course management UI (course list page, create form, delete confirmation)
- [ ] 02-03: Student roster model and API (enroll, remove, list students per course)
- [ ] 02-04: Student management UI (add student form, roster view, remove action)
**UI hint**: yes

### Phase 3: Check-In System
**Goal**: Teachers can initiate check-in sessions and students can complete check-in via QR code
**Depends on**: Phase 2
**Requirements**: CHECKIN-01, CHECKIN-02, CHECKIN-03, CHECKIN-04
**Success Criteria** (what must be TRUE):
  1. Teacher can select a course, start a check-in session, and see a QR code on screen
  2. Student can scan the QR code, enter their student ID and name, and submit to complete check-in
  3. Teacher can manually mark a student as present for an active session
  4. Check-in session automatically ends after the configured timeout period
**Plans**: TBD

Plans:
- [ ] 03-01: Check-in session model and service (create, activate, end, timeout)
- [ ] 03-02: QR token generation and check-in submission API (with idempotency)
- [ ] 03-03: Teacher-side check-in page (session start, QR display with qrcode.react, manual sign-in)
- [ ] 03-04: Student-side check-in form (QR landing page, ID + name input, submission confirmation)
**UI hint**: yes

### Phase 4: Real-Time Dashboard
**Goal**: Teachers see live check-in progress as students scan and submit
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Teacher dashboard shows the current check-in rate as a percentage that updates without page refresh
  2. Teacher sees a live list of students who have checked in, updated in real time
  3. Teacher sees a live list of students who have not yet checked in, updated in real time
  4. Teacher sees a count of checked-in vs total students that updates instantly as each student submits
**Plans**: TBD

Plans:
- [ ] 04-01: WebSocket server setup (ws + custom server.ts, connection lifecycle, heartbeat)
- [ ] 04-02: Broadcast manager (session rooms, batched broadcasts, disconnect cleanup)
- [ ] 04-03: Client WebSocket hooks (use-session, use-attendance, reconnect handling)
- [ ] 04-04: Real-time dashboard UI (attendance rate, present/absent lists, virtualized list for 300 students)
**UI hint**: yes

### Phase 5: History & Reporting
**Goal**: Teachers can review past check-in sessions and track individual student attendance history
**Depends on**: Phase 4
**Requirements**: HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. Teacher can select a past check-in session and view the complete attendance record (who was present, who was absent)
  2. Teacher can view a student's attendance history across all sessions, including absence count
**Plans**: TBD

Plans:
- [ ] 05-01: Attendance history queries (API with JOINs, per-session and per-student views)
- [ ] 05-02: Session history page UI (list of past sessions, detail view with present/absent lists)
- [ ] 05-03: Student history page UI (per-student attendance timeline, absence summary)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 2/1 | Complete   | 2026-05-25 |
| 2. Course + Student Management | 0/4 | Not started | - |
| 3. Check-In System | 0/4 | Not started | - |
| 4. Real-Time Dashboard | 0/4 | Not started | - |
| 5. History & Reporting | 0/3 | Not started | - |
