# Project Research Summary

**Project:** CourseCheckIn (课程签到系统)
**Domain:** Real-time course attendance check-in system
**Researched:** 2026-05-25
**Confidence:** HIGH

## Executive Summary

CourseCheckIn is a real-time course attendance system targeting 300 concurrent check-ins, built for solo/small-team development. The core value proposition is handling burst traffic (300 students checking in within 30 seconds) without the "laggy" experience that plagues existing systems. Experts build this pattern using a single-process Node.js server with persistent WebSocket connections, PostgreSQL for concurrent write handling via MVCC, and a React-based real-time dashboard.

The recommended approach is a Next.js 16 full-stack app with an embedded `ws` WebSocket server, deployed on Railway or a VPS (not Vercel serverless, which does not support persistent WebSocket connections). PostgreSQL 17 with Drizzle ORM handles the database layer. The frontend uses React 19 with Tailwind CSS, and QR code check-in flows through the student's native phone camera (no scanning library needed on the student side). This all-TypeScript stack minimizes context switching for a solo developer.

The three key risks are: (1) deploying WebSockets to serverless platforms (silent failure) -- mitigated by choosing Railway/VPS before any feature work; (2) the thundering herd of 300 concurrent database writes -- mitigated by in-memory queuing, batch INSERTs, and pre-fetched rosters; and (3) QR code screenshot sharing enabling proxy attendance -- mitigated by 10-second token expiry with server-side regeneration. All three must be addressed in Phase 1, not deferred.

## Key Findings

### Recommended Stack

The entire stack is TypeScript end-to-end, optimized for solo developer productivity and minimal operational complexity while guaranteeing 300-concurrent-user performance.

**Core technologies:**
- **Next.js 16 + React 19**: Full-stack framework (UI + API routes) -- eliminates two-service deployment overhead, App Router with server components reduces client bundle
- **Node.js 22 LTS + ws 8.x**: Runtime + WebSocket library -- handles 300 concurrent connections effortlessly in a single process (~4KB per connection), native TypeScript support
- **PostgreSQL 17 + Drizzle ORM 0.45.x**: Database + ORM -- MVCC handles 300 concurrent writes without blocking; Drizzle is lightweight with full TypeScript inference
- **Zod 4.x**: Runtime type validation -- validate all API request bodies and session tokens at system boundaries
- **qrcode.react 4.x**: QR code generation -- React component for teacher-side QR display, generates SVG/Canvas
- **@tanstack/react-query 5.x**: Server state management -- fetch and cache attendance records, handles refetch on WebSocket reconnect

**Deployment:** Railway or single VPS ($6/month DigitalOcean) for persistent WebSocket support. Vercel serverless is explicitly NOT compatible with `ws` WebSockets.

### Expected Features

**Must have (table stakes):**
- Teacher login/authentication -- basic access control via JWT + HTTP-only cookies
- Course creation and management -- CRUD for courses, teacher owns courses
- Student management -- add students to courses, bulk import expected for large classes
- Dynamic QR code check-in initiation -- QR must be time-limited and refreshable to prevent photo sharing
- Student QR scanning and check-in -- scan QR, enter student ID + name, confirm attendance
- Real-time attendance dashboard -- WebSocket-powered, shows attendance rate, present/absent lists, supports 300 concurrent updates
- Manual check-in (代签) -- fallback for students without phones/cameras
- Check-in session management -- start, end, pause sessions
- Check-in history and status statistics -- per-student and per-course records

**Should have (differentiators):**
- 300-concurrent check-in without lag -- THE core selling point
- Real-time attendance rate visualization -- live chart of attendance over time
- Session countdown timer -- configurable time limit with auto-close
- Absence预警 -- flag students with N consecutive absences
- QR code anti-screenshot (dynamic refresh) -- QR regenerates every N seconds
- IP/UA tracking -- detect multiple check-ins from same device
- Excel import/export -- bulk student list operations

**Defer (v2+):**
- GPS/location verification -- out of scope for v1, privacy concerns
- Admin/academic office roles -- v1 only has teacher + student
- Face recognition check-in -- over-engineered, hardware-dependent
- Complex scheduling system -- not the core value
- LMS integration (Moodle/Canvas) -- validate standalone first
- Point/reward gamification -- adds complexity without solving core problem
- Mobile native app -- web-first, mobile-responsive covers the use case

### Architecture Approach

A single Next.js process with embedded WebSocket server. Business logic is decoupled into a service layer (`lib/services/`) shared between API routes and WebSocket handlers. WebSocket connections are organized by session room using in-memory `Map<sessionId, Set<WebSocket>>` for O(1) subscribe/unsubscribe and O(n) broadcast. All timestamps are server-side UTC. Session state is persisted in PostgreSQL, not in-memory.

**Major components:**
1. **Auth Service** -- Teacher login (JWT + HTTP-only cookie), session validation, role verification
2. **Course Service** -- Course CRUD, teacher-course ownership, student roster management via Drizzle
3. **CheckIn Service** -- Session lifecycle (create/active/end), token generation, student check-in validation
4. **Broadcast Manager** -- WebSocket connection registry, room-based broadcasting per session, heartbeat lifecycle
5. **Page Routes** -- Teacher dashboard, course management UI, student check-in form, history views via Next.js App Router
6. **WebSocket Handler** -- `/ws` endpoint upgrade, message routing, ping/pong keep-alive, disconnect cleanup

**Key patterns:** Room-based WebSocket broadcasting, service layer decoupled from transport, optimistic UI with WebSocket reconciliation, QR code URL with short-lived session token.

### Critical Pitfalls

1. **WebSocket on Vercel serverless = silent failure** -- Vercel Lambda functions are stateless and ephemeral; WebSockets require persistent processes. **Prevention:** Deploy to Railway/Fly.io/VPS, or replace WebSocket with SSE + HTTP POST for Vercel compatibility. Decision must be made before Phase 1 feature work begins.

2. **Thundering herd -- 300 simultaneous database writes** -- Burst traffic can exhaust connection pools via N+1 ORM patterns. **Prevention:** In-memory queue for batching (10-20 at a time), pre-fetch course roster into a `Map`, use batch INSERT statements, set PostgreSQL connection pool to at least 20.

3. **Duplicate check-ins and idempotency** -- Mobile network retries cause double-counting. **Prevention:** `UNIQUE(student_id, session_id)` constraint on `attendance_records`, client-side idempotency token, submit button debounce.

4. **QR code screenshot sharing (proxy attendance)** -- Static QR codes are trivially shareable via WeChat. **Prevention:** 10-second token expiry, server-side token regeneration via WebSocket push, IP address tracking for post-session review.

5. **Broadcast storm freezing teacher dashboard** -- 300 individual WebSocket messages trigger 300 React re-renders, freezing the browser. **Prevention:** Batch broadcasts (every 500ms or every 10 check-ins), virtualize student list with `@tanstack/react-virtual`, use batched state updates.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation + Auth
**Rationale:** No dependencies. Establishes the database schema, connection layer, and authentication -- everything else depends on these.
**Delivers:** PostgreSQL schema with migrations, Drizzle ORM connection, teacher login (JWT + HTTP-only cookie), base dashboard layout with auth guard.
**Addresses:** Teacher login/authentication feature.
**Avoids:** Session state leaks (Pitfall 7) by storing session state in PostgreSQL from day one. Timezone/clock skew issues (Pitfall 8) by enforcing server-side UTC timestamps.

### Phase 2: Course + Student Management
**Rationale:** Depends on Foundation (auth + DB). Teachers need courses and student rosters before they can initiate check-ins.
**Delivers:** Course CRUD (API + UI), student management (add/remove from courses), course-student enrollment API, Zod validation schemas.
**Implements:** Course Service, Student Service, course management page routes.
**Avoids:** N+1 query on attendance history (Pitfall 10) by creating database indexes during schema migration in this phase.

### Phase 3: Check-In System (Core)
**Rationale:** Depends on Course + Student Management. This is the core business logic -- sessions, QR codes, check-in submission.
**Delivers:** Check-in session creation with token generation, QR code display (qrcode.react), student check-in form + submission API, session lifecycle (start -> active -> end), attendance record service.
**Addresses:** Dynamic QR check-in, student scanning, manual check-in, session management.
**Avoids:** QR code screenshot sharing (Pitfall 4) via 10-second token expiry. Duplicate check-ins (Pitfall 3) via UNIQUE constraint. Thundering herd (Pitfall 2) via in-memory queue + batch INSERT. Missing rate limiting (Pitfall 12) via simple IP-based rate limiter.

### Phase 4: Real-Time Dashboard
**Rationale:** Depends on Check-In System. The WebSocket layer broadcasts check-in events -- requires the check-in submission flow to exist first.
**Delivers:** WebSocket server setup (ws + custom server.ts), broadcast manager with session rooms, heartbeat/connection lifecycle, teacher dashboard real-time updates, client WebSocket hooks (use-session, use-attendance).
**Addresses:** Real-time attendance dashboard (the core differentiator).
**Avoids:** WebSocket on serverless (Pitfall 1) by deploying to Railway/VPS. Broadcast storm (Pitfall 5) via batched WebSocket messages + virtualized student list. QR generation blocking event loop (Pitfall 11) by using client-side qrcode.react.

### Phase 5: Reporting + Bulk Operations
**Rationale:** Depends on Check-In System (needs attendance data). Reporting features are valuable but not required for the core check-in workflow.
**Delivers:** Attendance history queries (API + UI), student history view, course-level statistics, CSV export, Excel import with preview + validation.
**Implements:** History page routes, attendance statistics service, Excel/CSV parsing.
**Avoids:** Excel import failures (Pitfall 9) via preview-before-commit and row-level validation reporting. N+1 history queries (Pitfall 10) via explicit JOINs and indexes created in Phase 2.

### Phase 6: Differentiators + Polish
**Rationale:** Depends on all above. These features enhance the experience but are not required for a working product.
**Delivers:** Dynamic QR code refresh with countdown timer, absence alerts, IP/UA anomaly detection, responsive design audit, performance testing at 300 concurrent users.
**Addresses:** All differentiator features from FEATURES.md.
**Avoids:** IP tracking false positives (Pitfall 13) by flagging for teacher review rather than auto-rejection. Dynamic refresh WebSocket failures by implementing HTTP polling fallback.

### Phase Ordering Rationale

- **Auth before everything:** Every subsequent feature requires teacher authentication and database access.
- **Courses/Students before Check-In:** Check-in requires an active session tied to a course with enrolled students.
- **Check-In before Real-Time:** WebSocket broadcasting requires check-in events to broadcast.
- **Real-Time before Reporting:** The dashboard is the core value prop; reporting is useful but secondary.
- **Polish last:** Dynamic QR refresh, absence alerts, and performance tuning depend on all underlying systems being functional.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Real-Time):** WebSocket deployment configuration on Railway/VPS needs validation. Load testing strategy (k6/artillery) for 300 concurrent burst should be defined.
- **Phase 5 (Reporting):** Excel import edge cases (GBK encoding, merged cells, non-standard headers) need library evaluation (SheetJS vs alternatives).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard Next.js + PostgreSQL setup with well-documented patterns.
- **Phase 2 (CRUD):** Standard REST API + React UI patterns.
- **Phase 3 (Check-In):** Standard session/token management, well-understood QR code flow.
- **Phase 6 (Polish):** Incremental enhancements to existing systems.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified via npm registry and Context7 (React 19.2.6, Next.js 16.2.6, ws 8.21.0, Drizzle 0.45.2, qrcode.react 4.2.0, Zod 4.4.3). Alternatives evaluated with clear rejection rationale. |
| Features | HIGH | Table stakes derived from PROJECT.md requirements and common attendance system patterns. Anti-features explicitly defined in PROJECT.md. Phase grouping matches dependency graph. |
| Architecture | HIGH | Single-process Next.js + ws architecture is well-documented for this scale. Component boundaries follow established patterns (service layer, repository). Database schema includes all necessary constraints and indexes. |
| Pitfalls | HIGH | Each pitfall has documented prevention strategy, detection method, and phase assignment. Based on production failure patterns from similar systems (雨课堂, 学习通) and platform-specific constraints (Vercel serverless). |

**Overall confidence:** HIGH

### Gaps to Address

- **Deployment budget not specified:** The research recommends Railway or VPS but the exact budget/platform choice should be confirmed before Phase 1. A $6/month VPS vs Railway free tier decision affects deployment configuration.
- **Teacher password storage:** Auth service recommends JWT + HTTP-only cookies but the password hashing strategy (bcrypt, argon2) and initial teacher onboarding flow (first-time setup vs pre-provisioned accounts) are not fully defined.
- **Excel import library evaluation:** SheetJS is mentioned but not compared against alternatives (e.g., `exceljs`). The best library for handling Chinese character encodings (GBK vs UTF-8) needs validation during Phase 5 planning.
- **300-concurrent load test environment:** The research recommends k6/artillery but the exact test scenario (burst pattern, timing distribution) should be defined before Phase 4 to ensure the system meets its core performance requirement.

## Sources

### Primary (HIGH confidence)
- Context7 library resolution -- React 19.2.6, Next.js 16.2.6, Drizzle ORM 0.45.2, qrcode.react 4.2.0, Hono 4.12.23
- npm registry versions verified via `npm view` (2026-05-25): ws 8.21.0, Zod 4.4.3, @tanstack/react-query 5.100.14, better-sqlite3 12.10.0, html5-qrcode 2.3.8
- Drizzle ORM official documentation (orm.drizzle.team)
- Next.js official documentation (nextjs.org)
- PostgreSQL MVCC documentation (postgresql.org/docs/current/mvcc-intro.html)
- Vercel Functions Limits documentation (vercel.com/docs/functions/limitations)
- WebSocket ws library documentation (github.com/websockets/ws)

### Secondary (MEDIUM confidence)
- WebSocket vs SSE comparison from MDN Web Docs and Cloudflare Blog (2024-2025)
- Attendance system production failure patterns from web search on concurrent bottlenecks, idempotency, QR security
- Chinese education platform known issues (雨课堂, 学习通, 超星) -- concurrent bottlenecks, QR screenshot sharing
- Railway deployment guides for Next.js + WebSocket

### Tertiary (LOW confidence)
- Deployment platform comparison (Railway vs Fly.io vs VPS) -- depends on budget and team preferences, not technically validated
- Excel import encoding handling for Chinese school system exports -- real-world data variability not tested

---
*Research completed: 2026-05-25*
*Ready for roadmap: yes*
