<!-- GSD:project-start source:PROJECT.md -->
## Project

**课程签到系统 (CourseCheckIn)**

一个轻量级在线课程签到系统：老师发起签到并展示二维码，学生扫码后输入学号/姓名完成签到。支持实时签到看板、历史记录查询、课程与学生的增删管理。面向 100-300 人课堂场景，核心要求是高并发扫码签到不卡顿。

**Core Value:** 100-300 人同时扫码签到时稳定流畅，老师能实时看到签到进度和明细。

### Constraints

- **性能**: 支持 300 人并发签到不卡顿 — 核心场景
- **技术**: 扫码 + 学号/姓名确认身份 — 简单可靠
- **角色**: 仅老师和学生两种角色
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Architecture Decision: Full-Stack Framework vs Separate Frontend/Backend
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
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 17.x | Primary database | Handles 300+ concurrent reads/writes easily, relational model fits courses/students/attendance records perfectly, excellent with Drizzle ORM |
| Drizzle ORM | 0.45.x | Type-safe query builder | Lightweight (vs Prisma), zero runtime overhead, full TypeScript inference, supports migrations, works with PostgreSQL and SQLite (easy to swap) |
- 300 concurrent connections writing simultaneously will cause SQLite write-lock contention. PostgreSQL handles concurrent writes via MVCC without blocking.
- This is a multi-user system where concurrent writes are the core scenario (300 students checking in simultaneously). SQLite's single-writer model will create bottlenecks.
- PostgreSQL can be deployed on Railway/Supabase/Neon with zero ops overhead (managed, free tier sufficient).
### Real-Time Communication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native WebSocket (`ws`) | 8.x | Server-side WebSocket | Lightweight, no abstraction overhead, handles 300 concurrent connections in a single Node.js process, no sticky sessions needed |
| Browser `WebSocket` API | built-in | Client-side WebSocket | No library needed on the client for basic WebSocket communication |
| `reconnecting-websocket` | latest (optional) | Client-side auto-reconnect | Adds automatic reconnection with exponential backoff if connection drops |
- Server -> Client: Broadcast check-in updates to teacher's dashboard (real-time count, student list)
- Client -> Server: Student submits check-in via QR code scan, teacher triggers check-in session
### QR Code Generation & Scanning
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| qrcode.react | 4.x | QR code generation (teacher side) | React component, generates QR codes as SVG/Canvas, minimal bundle size, actively maintained |
| html5-qrcode | 2.x | QR code scanning (student side, camera) | Browser-based camera scanning, no native dependencies, supports QR codes specifically, works on mobile browsers |
| QR URL payload | custom | Check-in token | QR code contains a URL like `https://app.example.com/checkin?session=abc123` -- student opens URL, enters student ID/name, submits |
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
# Create Next.js project
# Core dependencies
# Dev dependencies
### Database Setup (PostgreSQL)
# Environment variable
# Initialize Drizzle
## Deployment Recommendation
| Component | Platform | Why |
|-----------|----------|-----|
| Application | Vercel or Railway | Vercel for Next.js native support; Railway for persistent WebSocket server |
| Database | Supabase or Neon (PostgreSQL) | Free tier, managed, auto-scaling, daily backups |
| Static assets | Vercel Edge Network | CDN for QR code images, icons |
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
