# Architecture Research

**Domain:** Real-Time Course Check-In System (课程签到系统)
**Researched:** 2026-05-25
**Confidence:** HIGH

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                 │
│                                                                      │
│  ┌────────────────────┐          ┌────────────────────────────┐     │
│  │   Teacher Browser   │          │    Student Mobile Browser   │     │
│  │  (Dashboard + Mgmt) │          │   (QR Scan -> Check-in Form) │     │
│  └────────┬────────────┘          └─────────────┬──────────────┘     │
│           │                                     │                     │
│     HTTP + WS                             HTTP POST                   │
└───────────┼─────────────────────────────────┼─────────────────────────┘
            │                                 │
┌───────────┴─────────────────────────────────┴─────────────────────────┐
│                        Application Layer (Next.js)                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js App (Single Process)                   │ │
│  │                                                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │ │
│  │  │  API Routes   │  │  Page Routes  │  │  WebSocket Handler     │  │ │
│  │  │  (REST)       │  │  (React UI)   │  │  (ws server, /ws)     │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │ │
│  │         │                 │                      │               │ │
│  │  ┌──────┴─────────────────┴──────────────────────┴────────────┐ │ │
│  │  │                  Service Layer                              │ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐ │ │ │
│  │  │  │  Auth    │ │  Course  │ │  CheckIn   │ │  Broadcast    │ │ │ │
│  │  │  │ Service  │ │ Service  │ │  Service   │ │  Manager      │ │ │ │
│  │  │  └──────────┘ └──────────┘ └───────────┘ └──────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴────────────────────────────────────┐
│                        Data Layer                                     │
│                                                                        │
│  ┌──────────────────────┐          ┌──────────────────────────────┐   │
│  │   PostgreSQL 17       │          │   In-Memory (Node.js)         │   │
│  │   (persistent data)   │          │   WS client registry +        │   │
│  │   courses, students,  │          │   session broadcast buffers   │   │
│  │   attendance records  │          │                               │   │
│  └──────────────────────┘          └──────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Architecture Decision: Single-Process vs Split

**Recommendation: Single Next.js process with embedded WebSocket server** for v1.

The STACK.md research recommends Railway (or a single VPS) for deployment because WebSockets require persistent connections. In this model, a single Node.js process runs both the Next.js handler and the `ws` WebSocket server. This avoids the operational complexity of managing two services and Redis pub/sub for inter-service communication.

At 300 concurrent WebSocket connections, a single Node.js process on a modest server (512MB-1GB RAM) handles this comfortably. The `ws` library uses ~4KB per connection, so 300 connections = ~1.2MB RAM for connection state alone.

**When to split:** Only split into separate services if:
- WebSocket connections exceed ~5,000 (single-process limit)
- You need horizontal scaling of the WebSocket layer independently
- Teacher dashboard and check-in API need different scaling profiles

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Auth Service** | Teacher login (JWT + HTTP-only cookie), session validation, role verification | `jose` or `jsonwebtoken` for JWT, middleware on protected routes |
| **Course Service** | Course CRUD, teacher-course ownership, student roster management | Drizzle queries on `courses`, `course_students` tables |
| **CheckIn Service** | Create/end check-in sessions, generate session tokens, validate student check-ins | `nanoid` for session tokens, Zod validation on input |
| **Broadcast Manager** | WebSocket connection registry, room-based broadcasting (per session), connection lifecycle | `ws` WebSocket.Server, Map<sessionId, Set<WebSocket>> |
| **Page Routes** | Teacher dashboard, course management UI, student check-in form, history views | Next.js App Router, React Server Components for initial load |
| **API Routes** | REST endpoints for all CRUD operations, check-in submission | Next.js route handlers (`app/api/.../route.ts`) |
| **WebSocket Handler** | `/ws` endpoint upgrade, message routing, heartbeat/pong, disconnect cleanup | Custom server extending Next.js with `ws` |

## Recommended Project Structure

```
course-checkin/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/                # Teacher login page
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx            # Auth layout (no sidebar)
│   │   ├── (dashboard)/              # Authenticated route group
│   │   │   ├── layout.tsx            # Dashboard layout (sidebar, auth guard)
│   │   │   ├── courses/              # Course management
│   │   │   │   ├── page.tsx          # Course list
│   │   │   │   ├── new/              # Create course
│   │   │   │   └── [courseId]/       # Course detail + student management
│   │   │   │       ├── page.tsx
│   │   │   │       └── students/
│   │   │   ├── sessions/             # Check-in sessions
│   │   │   │   ├── page.tsx          # Active session list
│   │   │   │   └── [sessionId]/      # Live session dashboard
│   │   │   │       └── page.tsx
│   │   │   ├── history/              # Attendance history
│   │   │   │   ├── page.tsx          # History by course or student
│   │   │   │   └── [studentId]/
│   │   │   │       └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   ├── checkin/                  # Student check-in (public, no auth)
│   │   │   └── page.tsx              # QR landing + ID/name form
│   │   ├── api/                      # API routes
│   │   │   ├── auth/
│   │   │   │   └── login/
│   │   │   │       └── route.ts
│   │   │   ├── courses/
│   │   │   │   ├── route.ts          # GET / POST courses
│   │   │   │   └── [courseId]/
│   │   │   │       ├── route.ts      # GET / PUT / DELETE course
│   │   │   │       └── students/
│   │   │   │           └── route.ts  # Manage course students
│   │   │   ├── sessions/
│   │   │   │   ├── route.ts          # GET / POST sessions
│   │   │   │   └── [sessionId]/
│   │   │   │       ├── route.ts      # Session status
│   │   │   │       └── checkin/
│   │   │   │           └── route.ts  # Student check-in submission
│   │   │   └── history/
│   │   │       └── route.ts          # Attendance history queries
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing / redirect
│   ├── components/                   # React components
│   │   ├── ui/                       # Reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── qr-code.tsx           # QR code display wrapper
│   │   ├── courses/                  # Course-specific components
│   │   │   ├── course-card.tsx
│   │   │   ├── course-form.tsx
│   │   │   └── student-list.tsx
│   │   ├── sessions/                 # Session-specific components
│   │   │   ├── session-dashboard.tsx  # Real-time dashboard
│   │   │   ├── qr-display.tsx         # QR code for teacher
│   │   │   ├── attendance-table.tsx   # Live attendance table
│   │   │   └── attendance-stats.tsx   # Stats bar (rate, counts)
│   │   ├── checkin/                  # Student check-in components
│   │   │   ├── checkin-form.tsx       # Student ID + name form
│   │   │   └── checkin-success.tsx    # Confirmation screen
│   │   └── layout/                   # Layout components
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── lib/                          # Core utilities and services
│   │   ├── db/                       # Database layer
│   │   │   ├── schema.ts             # Drizzle schema definitions
│   │   │   ├── index.ts              # DB connection (single instance)
│   │   │   └── migrations/           # Drizzle migration files
│   │   ├── ws/                       # WebSocket layer
│   │   │   ├── server.ts             # WebSocket server setup
│   │   │   ├── broadcast.ts          # Broadcast manager (rooms)
│   │   │   ├── heartbeat.ts          # Ping/pong keep-alive
│   │   │   └── types.ts              # WS message types
│   │   ├── services/                 # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── course.service.ts
│   │   │   ├── student.service.ts
│   │   │   ├── session.service.ts
│   │   │   └── attendance.service.ts
│   │   ├── auth.ts                   # JWT helpers, cookie management
│   │   └── utils.ts                  # General utilities
│   ├── hooks/                        # React hooks
│   │   ├── use-session.ts            # WebSocket session connection
│   │   ├── use-attendance.ts         # Real-time attendance state
│   │   └── use-auth.ts               # Auth state hook
│   ├── validation/                   # Zod schemas
│   │   ├── auth.schema.ts
│   │   ├── course.schema.ts
│   │   ├── session.schema.ts
│   │   └── checkin.schema.ts
│   └── types/                        # Shared TypeScript types
│       └── index.ts
├── server.ts                         # Custom server (Next.js + ws)
├── drizzle.config.ts                 # Drizzle configuration
├── .env.example                      # Environment variable template
├── next.config.ts                    # Next.js configuration
└── package.json
```

### Structure Rationale

- **`app/` (App Router):** Next.js convention. Route groups `(auth)` and `(dashboard)` separate layouts without affecting URL structure. Student check-in (`/checkin`) is public, outside authenticated groups.
- **`components/` organized by domain:** Follows the "colocate with feature" principle. `ui/` contains shared primitives; `sessions/`, `courses/`, `checkin/` contain domain-specific components.
- **`lib/services/` separate from API routes:** Business logic is decoupled from HTTP transport. API routes call services; WebSocket handler also calls services. This enables reuse.
- **`lib/ws/` isolated:** WebSocket logic is self-contained. The broadcast manager is a pure module that API routes and the WebSocket handler both import.
- **`validation/` standalone:** Zod schemas live in their own directory so both API routes and services can import them. Single source of truth for input validation.
- **`server.ts` custom entry:** Required to embed the `ws` server alongside Next.js in a single process.

## Architectural Patterns

### Pattern 1: WebSocket Room-Based Broadcasting

**What:** WebSocket connections are grouped by check-in session. When a student checks in, the server broadcasts the update only to clients subscribed to that session's room.

**When to use:** Always for this project. The teacher's dashboard is the primary subscriber to a session room. Multiple teachers viewing the same session should all receive updates.

**Trade-offs:**
- Pro: Efficient -- only relevant clients receive updates, no wasted bandwidth
- Pro: Simple to implement with `Map<sessionId, Set<WebSocket>>`
- Con: Requires server-side state (in-memory client registry)
- Con: Single-process only (multi-instance needs Redis pub/sub)

**Example:**
```typescript
// lib/ws/broadcast.ts
type BroadcastRoom = Map<string, Set<WebSocket>>;
const rooms: BroadcastRoom = new Map();

export function subscribe(sessionId: string, ws: WebSocket) {
  if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
  rooms.get(sessionId)!.add(ws);
}

export function unsubscribe(sessionId: string, ws: WebSocket) {
  rooms.get(sessionId)?.delete(ws);
}

export function broadcast(sessionId: string, message: unknown) {
  const payload = JSON.stringify(message);
  rooms.get(sessionId)?.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}
```

### Pattern 2: Service Layer Decoupled from Transport

**What:** All business logic lives in service modules (`lib/services/`), never in API routes or WebSocket handlers. API routes and WebSocket message handlers both call the same service methods.

**When to use:** Always. The check-in submission happens via both HTTP POST (student submits form) and could potentially be triggered via WebSocket message in the future.

**Trade-offs:**
- Pro: Single source of truth for business rules
- Pro: Testable in isolation (no HTTP/WebSocket mocking needed)
- Pro: Easy to add new transport (gRPC, CLI, etc.) later
- Con: Extra indirection for simple CRUD (acceptable for this complexity)

**Example:**
```typescript
// lib/services/attendance.service.ts
export async function submitCheckIn(sessionId: string, studentId: string, name: string) {
  // 1. Validate session is active
  const session = await getSession(sessionId);
  if (!session || session.status !== 'active') {
    throw new Error('Session not active');
  }

  // 2. Validate student is in the course roster
  const student = await verifyStudentInCourse(session.courseId, studentId, name);
  if (!student) {
    throw new Error('Student not found in course');
  }

  // 3. Prevent duplicate check-in
  const existing = await db.select().from(attendanceRecords)
    .where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.studentId, student.id)));
  if (existing.length > 0) {
    throw new Error('Already checked in');
  }

  // 4. Record attendance
  const record = await db.insert(attendanceRecords)
    .values({ sessionId, studentId: student.id, timestamp: new Date(), status: 'present' })
    .returning();

  // 5. Broadcast update to all subscribers
  const stats = await getAttendanceStats(sessionId);
  broadcast(sessionId, { type: 'checkin:update', data: { student: record[0], stats } });

  return record[0];
}
```

### Pattern 3: Optimistic UI with WebSocket Reconciliation

**What:** The teacher's dashboard shows check-in updates immediately via WebSocket events. If the connection drops, React Query refetches the current state on reconnect.

**When to use:** For the real-time attendance dashboard. The teacher sees students appear in the "checked in" list instantly.

**Trade-offs:**
- Pro: Feels instant to the teacher -- no polling, no page refresh
- Pro: Resilient -- WebSocket drop doesn't lose data; refetch restores state
- Con: Requires WebSocket connection management on the client
- Con: Race conditions possible if two updates arrive out of order (mitigated by server timestamps)

### Pattern 4: QR Code URL with Session Token

**What:** The QR code displayed on the teacher's screen contains a URL with a session token: `https://app.example.com/checkin?session=abc123`. The student scans the QR (native phone camera), opens the URL, and sees a pre-filled check-in form.

**When to use:** Always for the primary check-in flow.

**Trade-offs:**
- Pro: Zero setup for students -- no app install, no account needed before check-in
- Pro: Session token in URL is scannable and short-lived
- Con: Token in URL could be screenshotted and shared (mitigated by short expiry + single-use)
- Con: Relies on students having a smartphone with a camera (assumed for this use case)

## Data Flow

### Check-In Flow (Primary)

```
Teacher creates session
    |
API: POST /api/sessions --> creates session in DB, returns session token
    |
Teacher dashboard renders QR code (qrcode.react) with session URL
    |
Student scans QR code with phone camera
    |
Student browser opens /checkin?session=abc123
    |
Student enters student ID + name, submits
    |
API: POST /api/sessions/[sessionId]/checkin
    |
    |-- Validate session is active
    |-- Validate student exists in course roster
    |-- Check for duplicate check-in
    |-- Insert attendance record into PostgreSQL
    +-- Broadcast update via WebSocket to teacher's room
          |
Teacher dashboard receives WebSocket message
    |
UI updates: attendance count increments, student appears in list
```

### Real-Time Dashboard Flow

```
Teacher opens /sessions/[sessionId]
    |
Page loads initial attendance data (SSR -> React Server Component)
    |
Client establishes WebSocket connection to /ws
    |
Client subscribes to session room via WS message: { type: 'subscribe', sessionId }
    |
Server adds WS connection to broadcast room for this session
    |
[Student checks in concurrently]
    |
Server broadcasts: { type: 'checkin:update', data: { student, stats } }
    |
Teacher dashboard receives event, updates React state
    |
Attendance stats re-render, student row appears in table
```

### Database Write Flow (300 Concurrent)

```
300 students submit check-in simultaneously
    |
300 HTTP POST requests hit Next.js API routes
    |
Next.js processes requests concurrently (Node.js event loop)
    |
Each request: validate -> insert into PostgreSQL (async)
    |
PostgreSQL handles 300 concurrent writes via MVCC (no write locks)
    |
Each successful insert triggers WebSocket broadcast
    |
Broadcast manager sends updates to teacher's dashboard
```

**Note on concurrent writes:** PostgreSQL's MVCC (Multi-Version Concurrency Control) means concurrent INSERT operations do not block each other. At 300 concurrent inserts, each taking ~2-5ms, total write time is well under 1 second. This is the key reason PostgreSQL was chosen over SQLite (which would serialize writes, causing queuing delays).

## Database Schema

```
+-------------------+       +-----------------------+       +-----------------------+
|     teachers       |       |       courses          |       |      students          |
+-------------------+       +-----------------------+       +-----------------------+
| id (PK)           |---+   | id (PK)               |   +---| id (PK)                |
| name              |   |   | teacher_id (FK)       |<--+    | student_id (unique)    |
| email             |   |   | name                  |         | name                   |
| password_hash     |   |   | description           |         | email (optional)       |
| created_at        |   |   | created_at            |         | created_at             |
+-------------------+   |   +-----------+-----------+         +-----------+-----------+
                        |               |                                 |
                        |   +-----------+-----------+                     |
                        |   |    course_students     |                     |
                        |   +-----------------------+                     |
                        |   | course_id (FK)       |<---------------------+
                        |   | student_id (FK)      |
                        |   | enrolled_at          |
                        |   +-----------+-----------+
                        |               |
                        |   +-----------+-----------+       +-----------------------+
                        |   |   checkin_sessions     |       |  attendance_records    |
                        |   +------------------------+       +-----------------------+
                        |   | id (PK)               |       | id (PK)                |
                        |   | course_id (FK)       |<------+| session_id (FK)        |
                        |   | teacher_id (FK)      |       | student_id (FK)        |
                        |   | token (unique)       |       | status                  |
                        |   | status               |       | checked_in_at           |
                        |   | started_at           |       | notes (optional)        |
                        |   | ended_at             |       +-------------------------+
                        +-- | expires_at           |
                            | created_at           |
                            +----------------------+
```

### Table Definitions

```sql
teachers
  id            UUID PRIMARY KEY
  name          VARCHAR(100) NOT NULL
  email         VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  created_at    TIMESTAMP DEFAULT NOW()

courses
  id            UUID PRIMARY KEY
  teacher_id    UUID REFERENCES teachers(id) ON DELETE CASCADE
  name          VARCHAR(200) NOT NULL
  description   TEXT
  created_at    TIMESTAMP DEFAULT NOW()

students
  id            UUID PRIMARY KEY
  student_id    VARCHAR(50) UNIQUE NOT NULL   -- 学号 (unique per student)
  name          VARCHAR(100) NOT NULL
  email         VARCHAR(255)
  created_at    TIMESTAMP DEFAULT NOW()

course_students
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE
  enrolled_at   TIMESTAMP DEFAULT NOW()
  PRIMARY KEY (course_id, student_id)

checkin_sessions
  id            UUID PRIMARY KEY
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE
  teacher_id    UUID REFERENCES teachers(id)
  token         VARCHAR(32) UNIQUE NOT NULL   -- QR code payload (nanoid)
  status        VARCHAR(20) DEFAULT 'pending' -- pending | active | ended
  started_at    TIMESTAMP
  ended_at      TIMESTAMP
  created_at    TIMESTAMP DEFAULT NOW()
  expires_at    TIMESTAMP                     -- auto-expire time (optional)

attendance_records
  id            UUID PRIMARY KEY
  session_id    UUID REFERENCES checkin_sessions(id) ON DELETE CASCADE
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE
  status        VARCHAR(20) DEFAULT 'present' -- present | late | excused | absent
  checked_in_at TIMESTAMP NOT NULL DEFAULT NOW()
  notes         TEXT
  UNIQUE(session_id, student_id)              -- prevent duplicate check-in
```

### Index Recommendations

```sql
-- Fast lookup: all sessions for a course
CREATE INDEX idx_sessions_course ON checkin_sessions(course_id);

-- Fast lookup: active session by token (QR code validation)
CREATE INDEX idx_sessions_token ON checkin_sessions(token) WHERE status = 'active';

-- Fast lookup: attendance for a session (real-time stats)
CREATE INDEX idx_attendance_session ON attendance_records(session_id);

-- Fast lookup: student history
CREATE INDEX idx_attendance_student ON attendance_records(student_id);

-- Fast lookup: course roster
CREATE INDEX idx_course_students_course ON course_students(course_id);
```

## WebSocket Architecture for 300 Concurrent Users

### Connection Model

```
Single Node.js process:
+-- Next.js HTTP handler (API routes + page rendering)
+-- ws WebSocket server (shared HTTP server instance)

Connection capacity:
+-- 300 WebSocket connections (teacher dashboards + optional student WS)
+-- ~4KB per connection (ws library overhead)
+-- Total WS memory: ~1.2MB (negligible)
+-- 300 concurrent HTTP requests (Node.js handles via event loop)
```

### WebSocket Message Protocol

```typescript
// Client -> Server messages
type ClientMessage =
  | { type: 'subscribe'; sessionId: string }          // Join a session room
  | { type: 'unsubscribe'; sessionId: string }        // Leave a session room
  | { type: 'ping' }                                  // Heartbeat

// Server -> Client messages
type ServerMessage =
  | { type: 'checkin:update'; data: { student: StudentRecord; stats: AttendanceStats } }
  | { type: 'session:status'; data: { status: 'active' | 'ended' } }
  | { type: 'pong' }                                  // Heartbeat response
  | { type: 'error'; data: { message: string } }
```

### Connection Lifecycle

```
1. Student or teacher navigates to session page
2. Client opens WebSocket: new WebSocket('/ws')
3. Server accepts connection, assigns unique ID
4. Client sends: { type: 'subscribe', sessionId: 'abc123' }
5. Server adds connection to session's broadcast room
6. Server sends initial state: current attendance stats
7. [Events flow bidirectionally while session is active]
8. Client sends: { type: 'unsubscribe', sessionId } or closes
9. Server removes connection from broadcast room
10. Heartbeat: server sends ping every 30s, closes stale connections after 60s
```

### Resource Requirements

| Resource | Requirement | Notes |
|----------|-------------|-------|
| CPU | 1 core minimum | Node.js is single-threaded; 300 concurrent writes + WS broadcast uses <10% CPU |
| Memory | 512MB minimum | Node.js process ~150MB, PostgreSQL ~200MB, OS ~162MB |
| Network | Low bandwidth | WebSocket messages are small JSON (~200 bytes each) |
| PostgreSQL connections | 350 max (connection pool) | 300 API requests + 50 page renders + overhead |

**Connection pooling:** Use `pg` built-in pool with `max: 20` connections. Node.js event loop multiplexes 300 concurrent requests across 20 DB connections efficiently.

## Build Order (Dependencies Between Components)

The component dependency graph dictates this build sequence:

```
Phase 1: Foundation (no dependencies)
+-- Database schema + migrations
+-- DB connection layer (Drizzle + pg pool)
+-- Auth service + login page
+-- Base layout + navigation

Phase 2: Core Entities (depends on: Foundation)
+-- Course CRUD (API + UI)
+-- Student management (API + UI)
+-- Course-student enrollment (API)
+-- Validation schemas (Zod)

Phase 3: Check-In System (depends on: Core Entities)
+-- Check-in session creation (API)
+-- QR code generation (qrcode.react)
+-- Student check-in form + submission (API)
+-- Attendance record service
+-- Session lifecycle (start -> active -> end)

Phase 4: Real-Time Layer (depends on: Check-In System)
+-- WebSocket server setup (ws + custom server)
+-- Broadcast manager (rooms)
+-- Heartbeat / connection lifecycle
+-- Teacher dashboard real-time updates
+-- Client WebSocket hooks (use-session, use-attendance)

Phase 5: Reporting (depends on: Check-In System)
+-- Attendance history queries (API + UI)
+-- Student history view
+-- Course-level statistics
+-- Export functionality (CSV)

Phase 6: Polish (depends on: all above)
+-- Dynamic QR code refresh
+-- Session countdown timer
+-- Absence alerts
+-- Responsive design audit
+-- Performance testing at 300 concurrent
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **300 concurrent (current target)** | Single Node.js process, PostgreSQL with 20-connection pool, in-memory WS broadcast. No Redis needed. Railway single instance or $6 VPS is sufficient. |
| **1,000-5,000 concurrent** | Add connection pooling with PgBouncer. Consider splitting WS server from Next.js. Single WS server still handles 5K connections; monitor memory. Add Redis for multi-instance WS broadcast if horizontal scaling needed. |
| **10,000+ concurrent** | Horizontal WS server cluster with Redis pub/sub (Socket.io Redis adapter or custom). Read replicas for PostgreSQL. CDN for static assets. Separate Next.js (Vercel) from WS servers (Railway cluster). |

### Scaling Priorities

1. **First bottleneck: Database connections.** At 300 concurrent check-ins, each API route opens a DB connection. With a 20-connection pool, requests queue briefly (~100ms wait). **Fix:** Increase pool size to 50, or add PgBouncer at 1,000+ concurrent.

2. **Second bottleneck: WebSocket broadcast fan-out.** Broadcasting to 300 dashboard viewers after each check-in is 300 x 300 = 90,000 WS sends. Node.js handles this, but at 5,000+ connections, broadcast becomes CPU-bound. **Fix:** Batch updates (send aggregated stats every 500ms instead of per-event) or use binary WebSocket messages.

3. **Third bottleneck: Single-process memory.** Node.js event loop blocks on CPU-intensive work. At scale, synchronous operations (large CSV exports, complex queries) cause latency spikes. **Fix:** Move CPU-heavy work to worker threads or separate service.

## Anti-Patterns

### Anti-Pattern 1: Polling Instead of WebSocket

**What people do:** Teacher dashboard polls `GET /api/sessions/:id/stats` every 2 seconds.

**Why it's wrong:** At 300 students checking in, the dashboard makes 150 unnecessary API requests per minute. Database gets hammered with repeated stat queries. Updates are delayed by up to 2 seconds.

**Do this instead:** WebSocket push. Server sends updates only when state changes. Zero polling overhead, instant updates.

### Anti-Pattern 2: Storing WebSocket State in Database

**What people do:** Every WebSocket connection is tracked in a database table. Broadcast queries the DB to find subscribers.

**Why it's wrong:** Database round-trip for every broadcast defeats the purpose of real-time. DB becomes the bottleneck, not the network.

**Do this instead:** Keep WebSocket connections in an in-memory `Map<sessionId, Set<WebSocket>>`. This is O(1) lookup and O(n) broadcast where n = connected clients for that session. For 300 connections, this is microseconds.

### Anti-Pattern 3: SQLite for Concurrent Writes

**What people do:** Use SQLite because it's simpler to deploy.

**Why it's wrong:** SQLite serializes writes. 300 simultaneous check-in submissions queue behind each other. Last student waits 1-2 seconds. This is the exact pain point the product claims to solve.

**Do this instead:** PostgreSQL with MVCC. Concurrent INSERT operations do not block each other. All 300 writes complete in parallel.

### Anti-Pattern 4: Sending Full Page Re-render on Check-In

**What people do:** When a student checks in, the server sends the entire updated attendance list to the teacher.

**Why it's wrong:** At 300 students, the attendance list payload is ~50KB per update. Broadcasting 50KB x 300 times = 15MB of unnecessary bandwidth.

**Do this instead:** Send incremental updates. WebSocket message contains only the new check-in record and aggregated stats (~200 bytes). Teacher's dashboard merges the update into existing state.

### Anti-Pattern 5: Vercel Serverless for WebSocket

**What people do:** Deploy WebSocket server on Vercel serverless functions.

**Why it's wrong:** Serverless functions are stateless and ephemeral. They spin up per request and shut down after. WebSocket connections require persistent processes. Vercel will kill the connection after the function timeout (10 seconds).

**Do this instead:** Deploy to Railway, Fly.io, or a VPS for persistent WebSocket support. Or use SSE + HTTP POST if deploying to Vercel (trade: slightly more complex client-side code, no persistent connections needed).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **PostgreSQL** | `pg` connection pool, Drizzle ORM queries | Use `DATABASE_URL` env var. Max pool size: 20 for 300 concurrent. |
| **Railway / VPS** | Docker deployment, persistent Node.js process | Railway: single service with `server.ts` entry point. VPS: PM2 or systemd. |
| **Phone Camera** | Native QR scanning (no library needed) | QR URL opens browser. No `html5-qrcode` needed on student side. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **API Routes <-> Services** | Direct function calls | Services return typed results, API routes handle HTTP serialization |
| **WebSocket Handler <-> Services** | Direct function calls | Same services as API routes; WebSocket handler calls `submitCheckIn()` |
| **Services <-> Broadcast Manager** | Direct function calls | Services call `broadcast()` after DB write (fire-and-forget, non-blocking) |
| **Client WS <-> Server WS** | JSON message protocol | Typed messages (ClientMessage / ServerMessage), validated with Zod |
| **Pages <-> API Routes** | HTTP fetch / React Query | React Query handles caching, deduplication, and refetch on WS reconnect |

## Sources

- Next.js WebSocket architecture patterns: Railway deployment guides and community documentation (2024-2025)
- WebSocket `ws` library documentation: [github.com/websockets/ws](https://github.com/websockets/ws)
- PostgreSQL MVCC and concurrent write handling: [PostgreSQL official documentation](https://www.postgresql.org/docs/current/mvcc-intro.html)
- Drizzle ORM schema patterns: [orm.drizzle.team](https://orm.drizzle.team)
- QR code generation with React: Context7 verified qrcode.react 4.x documentation
- Chinese education platform patterns: knowledge of 雨课堂, 学习通, 超星 platforms
- Stack research: `.planning/research/STACK.md` (2026-05-25)
- Feature research: `.planning/research/FEATURES.md` (2026-05-25)

---

*Architecture research for: Real-Time Course Check-In System*
*Researched: 2026-05-25*
