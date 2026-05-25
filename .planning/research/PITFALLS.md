# Domain Pitfalls: Course Check-In System

**Domain:** Online Course Check-In System (课程签到系统)
**Researched:** 2026-05-25

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: WebSocket on Serverless (Vercel) = Silent Failure

**What goes wrong:** The recommended stack (Next.js + `ws`) deploys fine to Vercel in development but WebSocket connections silently fail or drop immediately in production. Vercel serverless functions are stateless, ephemeral, and do not support persistent connections. The `ws` library requires a persistent process holding open connections -- serverless functions spin up per-request and terminate.

**Why it happens:** Next.js API routes on Vercel compile to AWS Lambda functions. Lambda containers are destroyed after each invocation. WebSocket connections require a long-lived process.

**Consequences:** 300-concurrent check-in requirement completely fails. Students scan QR code, WebSocket connects, then immediately disconnects. Teacher dashboard shows zero check-ins even as students submit.

**Prevention:**
- **Option A (recommended for this project):** Deploy to Railway, Fly.io, or a single VPS ($6/month DigitalOcean droplet). These support persistent Node.js processes. Keep Next.js but run the WebSocket server as a custom server (`next start` with custom `server.js`).
- **Option B:** Replace WebSocket with SSE (Server-Sent Events) + HTTP POST. SSE works on Vercel serverless. Students submit check-ins via POST; teacher dashboard receives live updates via SSE stream. This is architecturally simpler for serverless.
- **Detection:** Test WebSocket connections on the target platform before building any feature on top of them. A simple `ws` echo server deployed to the platform will reveal compatibility in minutes.

**Phase to address:** Phase 1 (Core Check-In) -- infrastructure decision must be made before any real-time feature is built.

### Pitfall 2: Thundering Herd -- 300 Students Hit the Database Simultaneously

**What goes wrong:** When the teacher starts a check-in session, all 300 students open the check-in URL and submit within a 30-second window. Each submission triggers: (1) session validation query, (2) student roster lookup, (3) attendance record INSERT, (4) broadcast to teacher dashboard. Without buffering, this creates a spike of 10+ concurrent database writes per second. PostgreSQL handles this, but the N+1 query pattern from Drizzle ORM (fetching roster for each submission) can cause connection pool exhaustion.

**Why it happens:** Attendance systems have extremely bursty traffic -- 80-90% of requests occur in a 10-minute window. ORM patterns that work fine for CRUD (one query per request) multiply under burst load.

**Consequences:** Database connection pool saturates. Requests queue up and timeout. Students see "check-in failed" errors. Teacher dashboard shows partial attendance. System appears "laggy" -- the exact problem this product is built to solve.

**Prevention:**
- Use an in-memory queue (Node.js `Array` or `p-limit`) to batch-process check-in submissions. Incoming requests are acknowledged immediately ("received, processing"), then processed in small batches (10-20 at a time) to avoid overwhelming the database.
- Pre-fetch the course roster into a `Map` when the session starts (cached in memory). Validate student ID against the in-memory set, not the database, for each submission.
- Use a single batch INSERT (`INSERT INTO attendance_records ... VALUES (...), (...), (...)`) instead of individual INSERTs per student.
- Set PostgreSQL connection pool to at least 20 connections (default is often 5-10).
- **Detection:** Load-test with 300 simulated concurrent POST requests before any production deployment. Use `k6` or `artillery` to simulate the burst pattern.

**Phase to address:** Phase 1 (Core Check-In) -- the concurrent write pattern is the core scenario, not an edge case.

### Pitfall 3: Duplicate Check-Ins and Idempotency

**What goes wrong:** Students double-tap the submit button, or their browser retries a request that appeared to timeout. Without idempotency controls, the same student gets counted twice, inflating attendance numbers. Or worse, two simultaneous submissions from the same student create a race condition where the second one overwrites the first with a different timestamp (affecting "late" status).

**Why it happens:** Mobile browsers are unreliable on campus Wi-Fi. Requests appear to hang, users retry. The server processes both.

**Consequences:** Attendance counts are wrong. Teacher sees "305 checked in" for a class of 300. Historical data is corrupted. Students dispute their attendance records.

**Prevention:**
- Add a `UNIQUE(student_id, session_id)` constraint on the `attendance_records` table. The database rejects duplicates at the constraint level -- no application-level race condition possible.
- Generate a client-side idempotency token (nanoid) per check-in attempt. Server tracks seen tokens for a 60-second window and returns the original response for duplicates.
- Debounce the submit button on the client side (disable after first click, show loading state).
- **Detection:** Monitor for `unique_violation` errors in PostgreSQL logs. Add a counter for rejected duplicates to detect aggressive retry patterns.

**Phase to address:** Phase 1 (Core Check-In) -- must be built into the data model from day one.

### Pitfall 4: QR Code Screenshot Sharing (Proxy Attendance)

**What goes wrong:** A student photographs the QR code on the projector screen and sends it to absent classmates via WeChat/group chat. Those students open the URL, enter valid student IDs and names, and check in remotely. The teacher's dashboard shows "100% attendance" when 20% of students are actually absent.

**Why it happens:** A static or long-lived QR code is trivially shareable. Even a time-limited QR code (e.g., 5-minute expiry) gives enough time for a photo to be shared and scanned by off-campus students.

**Consequences:** The core value proposition (accurate attendance) is undermined. Teachers lose trust in the system. Product reputation damaged.

**Prevention:**
- QR code must contain a short-lived, single-use token (nanoid, 10-second expiry). The server regenerates the token every 10 seconds and displays a countdown on the teacher dashboard.
- Use WebSocket to push the new token to the teacher's browser for QR regeneration without page reload.
- Track IP addresses of check-in submissions. Flag sessions where >2 check-ins come from the same IP (beyond the teacher's projector IP). This is a LOW-confidence signal but useful for post-session review.
- **Do NOT over-engineer for v1:** GPS, face recognition, and device fingerprinting are explicitly out of scope per PROJECT.md. The dynamic QR + short expiry is sufficient for v1. Add IP/UA tracking as a Phase 3 differentiator.
- **Detection:** After each session, compare the distribution of source IPs. If >5% of check-ins share an IP (excluding the teacher's network), flag the session for teacher review.

**Phase to address:** Phase 1 (Core Check-In) for dynamic QR token. Phase 3 (Differentiators) for IP tracking and anomaly detection.

### Pitfall 5: Broadcast Storm to Teacher Dashboard

**What goes wrong:** When 300 students check in within 30 seconds, the server broadcasts "student X checked in" to the teacher's WebSocket connection 300 times in rapid succession. Each broadcast triggers a React re-render. The teacher's browser becomes unresponsive, the tab crashes, and the teacher sees a frozen dashboard -- the exact "laggy" experience this product is meant to fix.

**Why it happens:** Naive WebSocket broadcasting sends individual messages per event. React's reconciliation handles 300 individual state updates poorly when each triggers a full component tree re-render.

**Consequences:** Teacher dashboard freezes or crashes during peak check-in. Teacher cannot see real-time progress. Core selling point fails.

**Prevention:**
- **Batch broadcasts:** Instead of sending one message per check-in, aggregate and send every 500ms or every 10 check-ins. The message contains `{ checkedInCount: 145, newStudents: [...], absentCount: 155 }`.
- **Throttle React updates:** Use `useSyncExternalStore` or batched state updates to avoid re-rendering on every individual WebSocket message.
- **Virtualize the student list:** Use `@tanstack/react-virtual` for the present/absent student lists. Rendering 300 DOM nodes on every update is expensive; virtualization renders only visible rows.
- **Detection:** Use React DevTools Profiler to measure render time during simulated burst. If a single update takes >50ms, optimization is needed.

**Phase to address:** Phase 1 (Core Check-In) -- real-time dashboard is a core feature, not polish.

## Moderate Pitfalls

### Pitfall 6: Student Identity Verification is Trivially Bypassed

**What goes wrong:** The system identifies students by "student ID + name" only. Any student who knows another student's ID and name can check in on their behalf. No password, no secondary factor.

**Why it happens:** PROJECT.md specifies "student ID + name" as the identification method. This is intentionally simple but inherently insecure.

**Consequences:** Proxy attendance by peers who share their credentials. This is a known trade-off, not a bug.

**Prevention:**
- Accept this as a v1 trade-off. The PROJECT.md explicitly chose simplicity over security.
- Log the IP address and user-agent of each check-in submission. This provides an audit trail for teachers to review suspicious patterns post-session.
- Document this limitation clearly to teachers: "This system verifies presence at scan-time, not identity of the scanner."
- **Phase to address:** Phase 1 -- design the data model to store IP/UA from day one so the audit trail exists even if the UI to display it comes later.

### Pitfall 7: Session State Leaks Across Requests

**What goes wrong:** A check-in session is "active" but the server process restarts (deployment, crash, OOM). All active WebSocket connections drop. The in-memory session state is lost. The teacher's dashboard shows the session as ended, but the database still has it as "active". Students scanning the old QR code get errors.

**Why it happens:** If session state (active/inactive, token, expiry) is stored only in Node.js memory, it's lost on restart.

**Consequences:** Orphaned sessions. Students cannot check in. Teacher must manually end and restart the session. Confusing UX.

**Prevention:**
- Store session state in PostgreSQL (or Redis if added later). The "active session" is a database row, not an in-memory variable.
- On server startup, scan for orphaned sessions (active but no connected teacher WebSocket) and auto-close them after a grace period (5 minutes).
- Implement WebSocket reconnection with exponential backoff (`reconnecting-websocket` library). The teacher's dashboard should auto-reconnect and re-fetch session state.
- **Phase to address:** Phase 1 (Core Check-In) -- session persistence is foundational.

### Pitfall 8: Timezone and Clock Skew Manipulation

**What goes wrong:** The system uses the student's device clock to determine "late" status. A student with an incorrect device clock (or intentionally manipulated clock) checks in as "on time" when they are actually late. Or, the teacher's device and the server are in different timezones, causing session expiry times to be off by hours.

**Why it happens:** Client-side timestamps are untrusted. Timezone handling is easy to get wrong.

**Consequences:** "Late" status is unreliable. Session expiry times are wrong for teachers in different timezones. Historical reports show incorrect timestamps.

**Prevention:**
- **All timestamps are server-side.** The student's device sends no timestamp -- the server records `NOW()` in UTC at the moment of check-in submission.
- Store all timestamps in UTC in PostgreSQL. Convert to local time only for display, using the teacher's configured timezone.
- Session expiry is enforced by server clock, not client clock.
- **Phase to address:** Phase 1 (Core Check-In) -- time handling is foundational and hard to retrofit.

### Pitfall 9: Excel Import Fails on Real-World Data

**What goes wrong:** Teachers export student rosters from their school's system (often poorly formatted Excel files with merged cells, hidden rows, encoding issues, or non-standard column names) and try to import. The import silently skips 20% of students or corrupts names with special characters.

**Why it happens:** School system exports are notoriously inconsistent. Encoding (GBK vs UTF-8), date formats, and column headers vary wildly.

**Consequences:** Students missing from the roster cannot check in. Teacher blames the system. Manual re-entry is tedious and error-prone.

**Prevention:**
- Show a preview of imported data before committing. Display "X rows read, Y students will be added, Z will be updated" before the teacher confirms.
- Validate each row and report specific errors: "Row 15: missing student ID", "Row 23: duplicate ID". Allow the teacher to fix and re-import.
- Support both `.xlsx` and `.csv` formats. Use a robust parsing library (e.g., `xlsx` / `SheetJS`) that handles encoding detection.
- Trim whitespace from all fields. Normalize student ID format (remove leading zeros if the school system inconsistently adds them).
- **Phase to address:** Phase 2 (Reporting & Management) -- student management features deferred to Phase 2 per FEATURES.md.

### Pitfall 10: N+1 Query on Attendance History

**What goes wrong:** The "attendance history" page fetches all sessions for a course, then for each session, fetches the attendance records for each student. With 20 sessions and 300 students, this is 20 + 20*300 = 6,021 queries. The page takes 10+ seconds to load.

**Why it happens:** Drizzle ORM's default pattern is to fetch related data lazily. Without explicit JOINs or batch loading, each nested relation triggers a separate query.

**Consequences:** History page is unusably slow. Teachers cannot review past attendance. Core feature fails.

**Prevention:**
- Use explicit SQL JOINs or Drizzle's `with` clause to fetch session + attendance records in a single query (or two: one for sessions, one for all attendance records with `IN` clause).
- Add database indexes on `(course_id)`, `(session_id)`, and `(student_id, session_id)`.
- Paginate or virtualize the history view. Do not load all sessions at once if the course has many.
- **Phase to address:** Phase 2 (Reporting & Management) -- history feature is in Phase 2, but the data model (indexes) should be created in Phase 1.

## Minor Pitfalls

### Pitfall 11: QR Code Generation Blocks the Event Loop

**What goes wrong:** Generating a QR code image (especially as PNG) is CPU-intensive. Doing this synchronously in a Node.js API route blocks the event loop for 50-200ms. During a burst of concurrent requests, this compounds and causes request queuing.

**Prevention:** Generate QR codes as SVG (lighter weight) or pre-generate the QR code on the client side using `qrcode.react` (it's a React component, runs in the browser). The server only needs to provide the session token string.

**Phase to address:** Phase 1 (Core Check-In).

### Pitfall 12: Missing Rate Limiting on Check-In Endpoint

**What goes wrong:** Without rate limiting, a single student (or malicious actor) can hammer the check-in endpoint with thousands of requests, attempting to guess valid student IDs or flood the database.

**Prevention:** Add simple rate limiting: max 5 check-in attempts per IP per minute. Use an in-memory Map for v1 (no Redis needed). Return `429 Too Many Requests` when exceeded.

**Phase to address:** Phase 1 (Core Check-In) -- basic rate limiting is a one-day task.

### Pitfall 13: Student List Grows Unbounded Without Pagination

**What goes wrong:** The teacher dashboard fetches all 300 students and renders them in a single list. On mobile browsers, this causes jank and slow scrolling. On the backend, fetching and serializing 300 rows on every WebSocket broadcast wastes bandwidth.

**Prevention:** Virtualize the list (`@tanstack/react-virtual`). Paginate the API response. Send only the delta (newly checked-in students) in WebSocket broadcasts, not the full list.

**Phase to address:** Phase 1 (Core Check-In) -- list rendering is part of the real-time dashboard.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: WebSocket infrastructure | Serverless deployment silently drops connections | Decide deployment target (Railway/VPS vs Vercel+SSE) before building |
| Phase 1: Concurrent check-in burst | Thundering herd saturates database | Use in-memory queue + batch INSERT + pre-fetched roster |
| Phase 1: Duplicate submissions | Same student counted twice | UNIQUE constraint + client-side debounce |
| Phase 1: QR code anti-cheating | Screenshot sharing enables remote check-in | 10-second token expiry + server-side time enforcement |
| Phase 1: Real-time dashboard | Broadcast storm freezes teacher's browser | Batch WebSocket messages + virtualize list |
| Phase 1: Session persistence | Server restart loses active session state | Store session state in PostgreSQL |
| Phase 1: Time handling | Device clock skew corrupts "late" status | Server-side UTC timestamps only |
| Phase 2: Excel import | Malformed school exports cause silent failures | Preview + validation report before commit |
| Phase 2: Attendance history | N+1 query makes history page unusable | Explicit JOINs + database indexes |
| Phase 3: IP tracking | False positives flag legitimate shared Wi-Fi | Flag for teacher review, don't auto-reject |
| Phase 3: QR dynamic refresh | WebSocket broadcast of new token fails | Fallback to HTTP polling if WebSocket drops |

## Sources

- Attendance system production failures: WebSearch on "attendance system design lessons learned production issues" -- thundering herd, idempotency, timezone handling
- QR code attendance security: WebSearch on "QR code attendance system security cheating prevention problems" -- dynamic QR, replay attacks, proxy scanning
- Vercel serverless limitations: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) -- no persistent connections, 1024 file descriptor limit, stateless execution
- WebSocket scaling: WebSearch on "WebSocket broadcasting 300 concurrent connections Node.js performance issues" -- broadcast optimization, batch updates
- Concurrent write patterns: WebSearch on "attendance system database concurrent writes lock contention PostgreSQL" -- burst traffic patterns, queue-based ingestion
- Chinese education platform patterns: Known issues with 雨课堂, 学习通, 超星 -- concurrent bottleneck during class start, QR screenshot sharing
