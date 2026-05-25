# Technology Stack

**Project:** CourseCheckIn (课程签到系统)
**Researched:** 2026-05-25

## Recommended Stack

This is a solo/small-team project targeting 300 concurrent check-ins. The recommendation prioritizes **developer productivity** and **minimal operational complexity** while guaranteeing the 300-concurrent-user performance requirement. The entire stack is TypeScript/JavaScript end-to-end to minimize context switching.

### Architecture Decision: Full-Stack Framework vs Separate Frontend/Backend

**Recommendation: Next.js full-stack app with serverless/API routes.**

For a solo developer building a real-time check-in system, a single full-stack framework eliminates the operational overhead of running, deploying, and maintaining two separate services. Next.js provides both the React UI and the API layer in one codebase, with built-in WebSocket/SSE support via route handlers.

### Frontend Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.x | Full-stack framework (UI + API routes) | React 19 built-in, App Router, server components reduce client bundle, API routes handle backend logic without a separate service |
| React | 19.x | UI library | Latest stable (19.2.6 verified), React Server Components reduce client-side JavaScript, excellent ecosystem |
| Tailwind CSS | 4.x | Styling | Utility-first, fastest setup, no context-switching to CSS files, works perfectly with Next.js out of the box |

### Backend Runtime & Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js 22 LTS | 22.x | JavaScript runtime | LTS support through 2027, native WebSocket support via `ws`, excellent async performance for 300 concurrent connections |
| Next.js API Routes | built-in | HTTP API endpoints | Co-located with frontend, zero deployment friction on Vercel/Railway, no need for separate backend |
| ws | 8.x | Native WebSocket library | Lightweight (vs Socket.io), handles 300 concurrent connections easily, no sticky-session requirement |

**Why not Hono?** Hono is excellent and faster for edge deployments, but for this project the performance bottleneck is not HTTP request handling -- it's real-time broadcasting to 300 connected clients. `ws` on Node.js handles this effortlessly, and Next.js API routes give a simpler developer experience for a solo dev. Hono becomes valuable if you deploy to Cloudflare Workers (which has WebSocket connection limits), but for a single-server deployment, Node.js + `ws` is simpler and sufficient.

**Why not Express?** Express is in maintenance mode, lacks native TypeScript support, and requires extensive middleware setup. Next.js API routes provide the same capability with zero configuration.

**Why not FastAPI (Python)?** Python's async model (asyncio) has a higher per-connection overhead than Node.js's event loop. For 300 concurrent WebSocket connections, Node.js uses less memory and handles more connections per process. Since the frontend is React/TypeScript anyway, using Python for the backend adds a language context-switch with no benefit.

**Why not Go?** Go would handle 300 concurrent connections with ease (it handles 100K+), but for a solo developer building a CRUD + real-time dashboard app, Go's verbosity and lack of shared types with the React frontend outweigh the performance benefit. 300 concurrent users is trivial for Node.js.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 17.x | Primary database | Handles 300+ concurrent reads/writes easily, relational model fits courses/students/attendance records perfectly, excellent with Drizzle ORM |
| Drizzle ORM | 0.45.x | Type-safe query builder | Lightweight (vs Prisma), zero runtime overhead, full TypeScript inference, supports migrations, works with PostgreSQL and SQLite (easy to swap) |

**Why PostgreSQL over SQLite?**
- 300 concurrent connections writing simultaneously will cause SQLite write-lock contention. PostgreSQL handles concurrent writes via MVCC without blocking.
- This is a multi-user system where concurrent writes are the core scenario (300 students checking in simultaneously). SQLite's single-writer model will create bottlenecks.
- PostgreSQL can be deployed on Railway/Supabase/Neon with zero ops overhead (managed, free tier sufficient).

**SQLite fallback:** If deployment simplicity is paramount and the 300-concurrent-write requirement can tolerate brief queuing (sub-second delays are acceptable), SQLite with `better-sqlite3` (synchronous, single-threaded) is viable for <=100 concurrent users. For the stated 300-concurrent requirement, PostgreSQL is the safe choice.

### Real-Time Communication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native WebSocket (`ws`) | 8.x | Server-side WebSocket | Lightweight, no abstraction overhead, handles 300 concurrent connections in a single Node.js process, no sticky sessions needed |
| Browser `WebSocket` API | built-in | Client-side WebSocket | No library needed on the client for basic WebSocket communication |
| `reconnecting-websocket` | latest (optional) | Client-side auto-reconnect | Adds automatic reconnection with exponential backoff if connection drops |

**Why WebSocket over SSE?** This use case requires bidirectional communication:
- Server -> Client: Broadcast check-in updates to teacher's dashboard (real-time count, student list)
- Client -> Server: Student submits check-in via QR code scan, teacher triggers check-in session

While SSE could work (client sends HTTP POST for check-in, server pushes updates via SSE), WebSocket simplifies the architecture: one persistent connection handles both directions, reducing connection management complexity.

**Why not Socket.io?** Socket.io adds ~30-50% payload overhead and requires sticky sessions for multi-instance scaling. For 300 concurrent users on a single server, `ws` is simpler and lighter. Socket.io's benefits (rooms, acknowledgments, long-polling fallback) are unnecessary for this use case.

### QR Code Generation & Scanning

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| qrcode.react | 4.x | QR code generation (teacher side) | React component, generates QR codes as SVG/Canvas, minimal bundle size, actively maintained |
| html5-qrcode | 2.x | QR code scanning (student side, camera) | Browser-based camera scanning, no native dependencies, supports QR codes specifically, works on mobile browsers |
| QR URL payload | custom | Check-in token | QR code contains a URL like `https://app.example.com/checkin?session=abc123` -- student opens URL, enters student ID/name, submits |

**QR Code flow:** The teacher's dashboard generates a QR code (via `qrcode.react`) containing a session-specific URL. Students scan the QR code with their phone camera (opens the URL directly -- no scanning library needed on the student side). The student then sees a form to enter their student ID and name to confirm check-in.

**Note:** `html5-qrcode` is only needed if you want in-app camera scanning (e.g., the teacher scans student IDs). For the primary flow (student scans QR with phone camera -> opens browser URL), no scanning library is needed on the student side -- the phone's native camera handles QR recognition.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.x | Runtime type validation | Validate all API request bodies, QR code payloads, student ID inputs |
| TypeScript | 5.x | Type safety | Entire codebase |
| @tanstack/react-query | 5.x | Server state management | Fetch and cache attendance records, course lists, student lists |
| lucide-react | latest | Icon library | UI icons for dashboard |
| date-fns | 4.x | Date manipulation | Check-in timestamps, attendance history display |
| nanoid | 5.x | Unique ID generation | Session IDs, check-in tokens |

### Authentication (v1: Simple)

| Technology | Purpose | Why |
|------------|---------|-----|
| HTTP-only cookies + JWT | Session management | Simple, no OAuth complexity for v1, teacher login with password, student identified by ID + name |

**For v2:** Consider adding OAuth (Google/WeChat login) for teacher accounts.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Full-stack framework | Next.js | Remix | Remix is excellent but smaller ecosystem, fewer deployment options, no significant advantage for this use case |
| Full-stack framework | Next.js | SvelteKit | Smaller ecosystem, harder to find developers familiar with it, React ecosystem is vastly larger for components |
| Backend | Node.js + ws | Hono + ws | Hono is better for edge deployment, but for single-server Node.js is simpler and equally performant |
| Backend | Node.js + ws | Express | Express is in maintenance mode, no native TypeScript, more boilerplate |
| Backend | Node.js + ws | FastAPI (Python) | Higher memory per WebSocket connection, language context-switch, no shared types with frontend |
| Backend | Node.js + ws | Go (Gin/Fiber) | Overkill for 300 concurrent users, no shared types with React frontend, more verbose |
| Database | PostgreSQL | SQLite | Single-writer lock causes contention with 300 concurrent writes; fine for <=100 users |
| Database | PostgreSQL | MongoDB | Overkill, relational data model fits better, no document-oriented needs |
| ORM | Drizzle ORM | Prisma | Prisma has higher memory footprint, slower cold starts, heavier runtime; Drizzle is lighter and faster |
| Real-time | Native WebSocket (`ws`) | Socket.io | 30-50% payload overhead, requires sticky sessions, unnecessary features for this use case |
| Real-time | Native WebSocket (`ws`) | SSE | Need bidirectional communication; SSE is server-only push |
| QR Generation | qrcode.react | node-qrcode | qrcode.react is a React component, integrates directly; node-qrcode requires manual rendering |
| QR Scanning | Phone camera (native) | html5-qrcode | For the primary flow, phone camera opens URL directly; no scanning library needed |

## Installation

```bash
# Create Next.js project
npx create-next-app@latest course-checkin --typescript --tailwind --app --src-dir

# Core dependencies
npm install drizzle-orm zod date-fns nanoid ws reconnecting-websocket

# Dev dependencies
npm install -D drizzle-kit @types/ws
```

### Database Setup (PostgreSQL)

```bash
# Environment variable
DATABASE_URL=postgresql://user:password@localhost:5432/course_checkin

# Initialize Drizzle
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Deployment Recommendation

For a solo developer with a 300-concurrent-user target:

| Component | Platform | Why |
|-----------|----------|-----|
| Application | Vercel or Railway | Vercel for Next.js native support; Railway for persistent WebSocket server |
| Database | Supabase or Neon (PostgreSQL) | Free tier, managed, auto-scaling, daily backups |
| Static assets | Vercel Edge Network | CDN for QR code images, icons |

**Important:** If using WebSockets, deploy to a platform that supports persistent connections (Railway, Fly.io, or a single VPS). Vercel's serverless functions do not support persistent WebSocket connections. For a WebSocket-based approach, Railway or a single VPS (DigitalOcean, ~$6/month) is the simplest deployment.

**Alternative for serverless:** If you prefer Vercel serverless, replace WebSocket with SSE + HTTP POST. The teacher's dashboard receives updates via SSE (server streams events), and students submit check-ins via regular HTTP POST. This works perfectly on Vercel with zero WebSocket infrastructure.

## Confidence Assessment

| Recommendation | Confidence | Reason |
|----------------|------------|--------|
| Next.js 16 + React 19 | HIGH | Context7 verified, npm version 19.2.6 and 16.2.6 confirmed |
| Node.js 22 LTS + ws 8.x | HIGH | npm version 8.21.0 verified, well-documented performance for concurrent connections |
| PostgreSQL 17 + Drizzle ORM 0.45.x | HIGH | npm version 0.45.2 verified, clear fit for concurrent writes |
| WebSocket over SSE | HIGH | Bidirectional requirement confirmed from project spec |
| qrcode.react 4.x | HIGH | npm version 4.2.0 verified, Context7 confirmed |
| Phone camera for QR scanning (no library) | HIGH | Standard mobile browser behavior, no library needed |
| Deployment recommendation | MEDIUM | Depends on budget and team preferences |

## Sources

- Context7 library resolution for React, Next.js, Hono, Drizzle ORM, qrcode.react
- npm registry versions verified via `npm view` (2026-05-25): React 19.2.6, Next.js 16.2.6, Hono 4.12.23, Drizzle ORM 0.45.2, qrcode.react 4.2.0, html5-qrcode 2.3.8, ws 8.21.0, Zod 4.4.3, @tanstack/react-query 5.100.14, better-sqlite3 12.10.0
- WebSocket vs SSE comparison from MDN Web Docs and Cloudflare Blog (2024-2025)
- Drizzle ORM official documentation (orm.drizzle.team)
- Hono official documentation (hono.dev)
- Next.js official documentation (nextjs.org)
