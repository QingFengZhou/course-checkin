---
phase: 01-foundation-auth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - next.config.ts
  - .env.example
  - .gitignore
  - docker-compose.yml
  - drizzle.config.ts
  - src/db/index.ts
  - src/db/schema/users.ts
  - src/db/schema/index.ts
  - src/lib/db.ts
  - src/lib/auth-types.ts
  - src/lib/auth.ts
  - src/lib/password.ts
  - src/lib/zod-schemas.ts
  - src/app/layout.tsx
  - src/app/(public)/layout.tsx
  - src/app/(public)/login/page.tsx
  - src/app/(protected)/layout.tsx
  - src/app/(protected)/dashboard/page.tsx
  - src/app/setup/page.tsx
  - src/app/api/auth/login/route.ts
  - src/app/api/auth/logout/route.ts
  - src/app/api/setup/route.ts
  - src/middleware.ts
  - drizzle/ (migration files)
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
user_setup:
  - service: docker
    why: "Local PostgreSQL 17 required for development database"
    setup: "Install Docker Desktop (macOS) or Docker Engine (Linux). Must support `docker compose up`."

must_haves:
  truths:
    - "Developer can start local PostgreSQL with `docker compose up` and app with `npm run dev`"
    - "Teacher visiting /login sees email/username + password form with login button"
    - "First-time visitor to /setup can create the first teacher account; after creation, /setup redirects to /login permanently"
    - "Valid credentials return HTTP-only cookie containing JWT; invalid credentials return 401 with generic error"
    - "Teacher stays authenticated when navigating between pages (cookie sent automatically)"
    - "Unauthenticated access to /dashboard redirects to /login"
  artifacts:
    - path: "package.json"
      provides: "Project dependencies: Next.js 16, React 19, Drizzle ORM, bcryptjs, jose, zod"
    - path: "docker-compose.yml"
      provides: "PostgreSQL 17 container with `coursecheckin` database"
      contains: "postgres:17"
    - path: "src/db/schema/users.ts"
      provides: "User table definition with email, username, password_hash, role"
      contains: "pgTable('users'"
    - path: "src/lib/auth.ts"
      provides: "JWT sign/verify functions using jose"
      exports: ["signToken", "verifyToken", "setAuthCookie", "clearAuthCookie"]
    - path: "src/lib/password.ts"
      provides: "bcrypt hash and compare functions (cost factor 10 per D-02)"
      exports: ["hashPassword", "comparePassword"]
    - path: "src/app/api/auth/login/route.ts"
      provides: "POST /api/auth/login endpoint"
      exports: ["POST"]
    - path: "src/app/api/auth/logout/route.ts"
      provides: "POST /api/auth/logout endpoint"
      exports: ["POST"]
    - path: "src/app/api/setup/route.ts"
      provides: "POST /api/setup for first-time registration, guarded on empty users table"
      exports: ["POST"]
    - path: "src/middleware.ts"
      provides: "Route-level auth guard protecting /dashboard"
      exports: ["middleware", "config.matcher"]
    - path: "src/app/login/page.tsx"
      provides: "Login UI with email/username + password + error display"
    - path: "src/app/setup/page.tsx"
      provides: "First-time registration UI"
  key_links:
    - from: "src/app/api/auth/login/route.ts"
      to: "src/db/schema/users.ts"
      via: "SELECT user WHERE email/username, compare password_hash via bcrypt"
      pattern: "db\\.select.*from.*users.*where"
    - from: "src/app/api/auth/login/route.ts"
      to: "src/lib/auth.ts"
      via: "signToken + setAuthCookie on successful login"
      pattern: "setAuthCookie.*signToken"
    - from: "src/middleware.ts"
      to: "src/lib/auth.ts"
      via: "verifyToken from request cookie, redirect to /login if invalid"
      pattern: "verifyToken.*cookies\\.get"
    - from: "src/app/api/setup/route.ts"
      to: "src/db/schema/users.ts"
      via: "SELECT count from users, INSERT if count === 0"
      pattern: "db\\.select.*count.*from.*users"

tags:
  - nextjs-setup
  - drizzle-orm
  - postgresql
  - authentication
  - jwt
  - bcrypt
---

<objective>
Phase 1: Foundation + Auth -- Establish the project foundation with Next.js 16, PostgreSQL 17 via Docker, Drizzle ORM, and complete teacher authentication with JWT + HTTP-only cookies, including first-time self-registration flow.

Purpose: Enable teachers to securely log in (AUTH-01) and maintain session across pages (AUTH-02), while establishing a working database foundation for subsequent phases (Course Management, Check-In, Real-Time Dashboard, History).

Output: Runnable Next.js app with Docker PostgreSQL, user table migration, login/logout/setup APIs, protected dashboard, login UI, and setup UI.
</objective>

<execution_context>
@git:/Users/zhouqingfeng/.claude/get-shit-done/workflows/execute-plan.md
@git:/Users/zhouqingfeng/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation-auth/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md
@CLAUDE.md
</context>

<tasks>

## Plan 01-01: Project Scaffolding (ROADMAP item 01-01)

<task type="auto">
<name>Task 1: Initialize Next.js 16 project with core dependencies and configuration</name>
<files>
package.json, tsconfig.json, next.config.ts, .env.example, .gitignore
</files>
<action>
Create the project foundation. This is a greenfield project -- no existing code.

1. **package.json** -- Initialize with these exact dependencies:
   - Runtime: `next: "16.x"`, `react: "19.x"`, `react-dom: "19.x"`
   - Database: `drizzle-orm: "^0.45.x"`, `postgres: "^3.x"` (node-postgres driver for Drizzle)
   - Auth: `bcryptjs: "^2.x"` (per D-02 -- pure JS, no native compilation), `jose: "^5.x"` (JWT creation/verification, Edge-compatible)
   - Validation: `zod: "^4.x"` (runtime validation for API inputs)
   - Dev: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/bcryptjs`, `drizzle-kit`, `tsx`

   Add scripts:
   ```json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "db:generate": "drizzle-kit generate",
     "db:migrate": "drizzle-kit migrate",
     "db:push": "drizzle-kit push",
     "db:studio": "drizzle-kit studio"
   }
   ```

2. **tsconfig.json** -- Use Next.js recommended config:
   - `target: "ES2017"`, `lib: ["dom", "dom.iterable", "esnext"]`, `module: "ESNext"`, `moduleResolution: "bundler"`
   - `strict: true`, `jsx: "preserve"`, `incremental: true`, `esModuleInterop: true`
   - `paths: { "@/*": ["./src/*"] }`

3. **next.config.ts** -- Default Next.js 16 config:
   ```ts
   import type { NextConfig } from "next";
   const nextConfig: NextConfig = {};
   export default nextConfig;
   ```

4. **.env.example** -- Template with all required variables:
   ```
   DATABASE_URL=postgresql://coursecheckin:coursecheckin@localhost:5432/coursecheckin
   JWT_SECRET=change-me-to-a-random-string-at-least-32-chars
   NODE_ENV=development
   ```

5. **.gitignore** -- Include: `node_modules/`, `.next/`, `.env`, `.env.local`, `*.db`, `drizzle/meta/` (DO NOT gitignore `drizzle/` root -- migration SQL files ARE committed, only meta can be ignored)

6. Run `npm install` to lock dependencies.

IMPORTANT:
- Do NOT run `npx create-next-app` -- create files directly to avoid interactive prompts and unnecessary boilerplate.
- Use `bcryptjs` NOT `bcrypt` (per D-02 -- pure JS, no native compilation required).
- Use `jose` NOT `jsonwebtoken` (Edge runtime compatible).
</action>
<verify>
<automated>npx next --version 2>/dev/null | head -1 && npx drizzle-kit --version 2>/dev/null | head -1 && echo "Scaffolding complete"</automated>
</verify>
<done>
package.json has all required dependencies, `npm install` succeeds, `npx next` and `npx drizzle-kit` are executable, .env.example has DATABASE_URL/JWT_SECRET/NODE_ENV
</done>
</task>

<task type="auto">
<name>Task 2: Create Docker Compose PostgreSQL configuration and Next.js app entry points</name>
<files>
docker-compose.yml, src/app/layout.tsx, src/app/(public)/layout.tsx, src/app/(protected)/layout.tsx, src/app/(protected)/dashboard/page.tsx
</files>
<action>
Set up local PostgreSQL and create Next.js app structure with route groups.

Per D-03: Local development uses Docker Compose PostgreSQL 17.

1. **docker-compose.yml** -- Create with:
   ```yaml
   services:
     postgres:
       image: postgres:17
       container_name: coursecheckin-db
       environment:
         POSTGRES_DB: coursecheckin
         POSTGRES_USER: coursecheckin
         POSTGRES_PASSWORD: coursecheckin
       ports:
         - "5432:5432"
       volumes:
         - docker-data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U coursecheckin"]
         interval: 5s
         timeout: 3s
         retries: 5
   volumes:
     docker-data:
   ```
   Document in a comment: `docker compose up` starts the database.

2. **src/app/layout.tsx** -- Root layout:
   - Imports: `type { Metadata } from "next"`, global CSS import (if using Tailwind: `import "@/app/globals.css"` or Tailwind v4's `@import "tailwindcss"`)
   - Export `metadata: Metadata` with `title: "CourseCheckIn"`, `description: "Course attendance check-in system"`
   - Returns `<html lang="en"><body>{children}</body></html>` with `className` for Tailwind font
   - Use `suppressHydrationWarning` on html/body if needed

3. **src/app/globals.css** -- Tailwind CSS v4 entry:
   ```css
   @import "tailwindcss";
   ```

4. **src/app/(public)/layout.tsx** -- Public route group layout:
   - Renders `children` directly (no auth needed)
   - Same structure as root layout

5. **src/app/(protected)/layout.tsx** -- Protected route group layout:
   - Renders `children` directly (auth enforced by middleware, not layout)

6. **src/app/(protected)/dashboard/page.tsx** -- Minimal dashboard stub:
   - Server Component (default, no `'use client'`)
   - Import `cookies` from `next/headers`
   - Read the auth cookie (`cc_session`), attempt to decode user info if possible
   - Render: `<h1>Welcome to CourseCheckIn</h1>`, `<p>You are logged in.</p>`
   - This proves the auth guard works -- only reachable when authenticated

Route group structure for executor reference:
```
src/app/
  layout.tsx              # Root layout (all routes)
  globals.css             # Tailwind entry
  (public)/               # Route group: no URL prefix, auth not required
    layout.tsx
    login/page.tsx        # /login (plan 01-04)
  (protected)/            # Route group: no URL prefix, auth required by middleware
    layout.tsx
    dashboard/page.tsx    # /dashboard
  setup/                  # Not in route group: always accessible
    page.tsx              # /setup (plan 01-04)
  api/
    auth/login/route.ts   # POST /api/auth/login (plan 01-03)
    auth/logout/route.ts  # POST /api/auth/logout (plan 01-03)
    setup/route.ts        # POST /api/setup (plan 01-03)
```
</action>
<verify>
<automated>test -f docker-compose.yml && grep -q "postgres:17" docker-compose.yml && test -f src/app/layout.tsx && test -f "src/app/(protected)/dashboard/page.tsx" && echo "Structure verified"</automated>
</verify>
<done>
`docker compose config` validates the compose file, root layout exists at `src/app/layout.tsx`, route group layouts exist, dashboard page renders a heading, globals.css imports Tailwind
</done>
</task>

## Plan 01-02: Database Schema and Migrations (ROADMAP item 01-02)

<task type="auto">
<name>Task 1: Define Drizzle ORM database connection and User schema</name>
<files>
src/db/index.ts, src/db/schema/users.ts, src/db/schema/index.ts, drizzle.config.ts, src/lib/auth-types.ts, src/lib/db.ts
</files>
<action>
Define the database layer. This creates the types and connection that all subsequent code uses.

1. **src/db/index.ts** -- Create Drizzle database client:
   - Import `drizzle` from `drizzle-orm/node-postgres`
   - Import `Pool` from `pg`
   - Create `pool = new Pool({ connectionString: process.env.DATABASE_URL })`
   - Export `db = drizzle(pool, { schema: ... })`
   - Export `pool` for shutdown handling

2. **src/db/schema/users.ts** -- Define the User table:
   ```ts
   import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
   export const users = pgTable("users", {
     id: uuid("id").defaultRandom().primaryKey(),
     email: varchar("email", { length: 255 }).unique().notNull(),
     username: varchar("username", { length: 100 }).unique().notNull(),
     passwordHash: varchar("password_hash", { length: 255 }).notNull(),
     displayName: varchar("display_name", { length: 255 }).notNull(),
     role: varchar("role", { length: 20 }).notNull().default("teacher"),
     createdAt: timestamp("created_at").defaultNow().notNull(),
     updatedAt: timestamp("updated_at").defaultNow().notNull(),
   });
   export type InsertUser = typeof users.$inferInsert;
   export type SelectUser = typeof users.$inferSelect;
   ```

3. **src/db/schema/index.ts** -- Barrel export: `export * from "./users"`

4. **drizzle.config.ts** -- Drizzle Kit configuration:
   ```ts
   import { defineConfig } from "drizzle-kit";
   export default defineConfig({
     schema: "./src/db/schema/index.ts",
     out: "./drizzle",
     dialect: "postgresql",
     dbCredentials: { url: process.env.DATABASE_URL || "" },
   });
   ```

5. **src/lib/auth-types.ts** -- Shared auth type definitions:
   - `interface JwtPayload { sub: string; email: string; role: string; iat: number; exp: number }`
   - `interface AuthSession { user: { id: string; email: string; displayName: string; role: string } | null; isAuthenticated: boolean }`
   - `export const AUTH_COOKIE_NAME = "cc_session"` as const
   - Cookie config: `{ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 604800, path: "/" }` (7-day expiry = 7 * 24 * 60 * 60 seconds)

6. **src/lib/db.ts** -- Re-export for convenience: `export { db, pool } from "@/db"` so imports use `@/lib/db` consistently
</action>
<verify>
<automated>npx tsc --noEmit src/db/schema/users.ts src/db/index.ts drizzle.config.ts src/lib/auth-types.ts 2>&1 | head -5; echo "Type check complete"</automated>
</verify>
<done>
TypeScript compiles with no errors for schema and config files, User schema has all 8 columns (id, email, username, password_hash, display_name, role, created_at, updated_at), drizzle.config.ts points to the schema, auth types are exported
</done>
</task>

<task type="auto">
<name>Task 2: Generate and apply Drizzle migration, verify users table exists</name>
<files>
drizzle/ (migration files)
</files>
<action>
Generate the initial migration and verify it creates the users table.

1. Ensure PostgreSQL is running: `docker compose up -d` (from project root)
2. Wait for health check: use a loop to poll until `docker compose exec postgres pg_isready -U coursecheckin` succeeds (max 30s wait)
3. Set `DATABASE_URL=postgresql://coursecheckin:coursecheckin@localhost:5432/coursecheckin` environment variable
4. Generate migration: `npx drizzle-kit generate` -- this creates `drizzle/XXXXX_*.sql` migration file
5. Apply migration: `npx drizzle-kit migrate` -- this runs the SQL against PostgreSQL
6. Verify table exists:
   ```bash
   docker compose exec -T postgres psql -U coursecheckin -d coursecheckin -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
   ```
   Confirm columns: id (uuid, NO), email (character varying, NO), username (character varying, NO), password_hash (character varying, NO), display_name (character varying, NO), role (character varying, NO), created_at (timestamp without time zone, NO), updated_at (timestamp without time zone, NO)
7. Verify unique constraints:
   ```bash
   docker compose exec -T postgres psql -U coursecheckin -d coursecheckin -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';"
   ```
   Confirm unique indexes on email and username exist.
8. Verify idempotency: Run `npx drizzle-kit migrate` again -- output should be "nothing to migrate" or equivalent.
9. Commit `drizzle/` directory to git -- migrations ARE version controlled.
</action>
<verify>
<automated>docker compose exec -T postgres psql -U coursecheckin -d coursecheckin -c "SELECT count(*) FROM information_schema.columns WHERE table_name='users';" 2>/dev/null | grep -v '^#' | grep -q 8 && echo "users table has 8 columns"</automated>
</verify>
<done>
`drizzle/` directory contains at least one migration SQL file, `users` table exists in PostgreSQL with exactly 8 columns, unique constraints on email and username verified, running `npx drizzle-kit migrate` a second time shows nothing to migrate
</done>
</task>

## Plan 01-03: Auth Service -- JWT, Password, API Routes (ROADMAP item 01-03)

<task type="auto">
<name>Task 1: Create JWT and password hashing utilities</name>
<files>
src/lib/auth.ts, src/lib/password.ts
</files>
<action>
Implement the core auth building blocks. These are imported by API routes and middleware.

1. **src/lib/auth.ts** -- JWT operations using `jose` library (Edge-compatible, per CLAUDE.md):
   - `async function signToken(payload: JwtPayload): Promise<string>` -- Creates JWT:
     ```ts
     import { SignJWT } from "jose";
     const secret = new TextEncoder().encode(process.env.JWT_SECRET);
     return new SignJWT(payload)
       .setProtectedHeader({ alg: "HS256" })
       .setIssuedAt()
       .setExpirationTime("7d")
       .sign(secret);
     ```
   - `async function verifyToken(token: string): Promise<JwtPayload>` -- Verifies JWT:
     ```ts
     import { jwtVerify } from "jose";
     const secret = new TextEncoder().encode(process.env.JWT_SECRET);
     const { payload } = await jwtVerify(token, secret);
     return payload as JwtPayload;
     ```
   - `function setAuthCookie(response: NextResponse, token: string): void` -- Sets HTTP-only cookie:
     - `response.cookies.set({ name: AUTH_COOKIE_NAME, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" })`
   - `function clearAuthCookie(response: NextResponse): void` -- Clears the auth cookie:
     - `response.cookies.set(AUTH_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" })`
   - `async function getAuthSession(): Promise<AuthSession>` -- Reads cookie from request context:
     - For Server Components: import `cookies` from `next/headers`, get the cookie value, call `verifyToken()`, return `{ user: { id, email, displayName, role }, isAuthenticated: true }` or `{ user: null, isAuthenticated: false }` on failure

2. **src/lib/password.ts** -- Password operations using `bcryptjs` (per D-02):
   - `async function hashPassword(plainText: string): Promise<string>` -- Uses `bcrypt.hash(plainText, 10)` (cost factor 10 per D-02)
   - `async function comparePassword(plainText: string, hash: string): Promise<boolean>` -- Uses `bcrypt.compare(plainText, hash)`
   - CRITICAL: bcryptjs is synchronous in its core API but the callback-based async API is preferred here. Use `bcrypt.hash(plainText, 10)` which returns a Promise when no callback is provided.

AVOID:
- Do NOT use `jsonwebtoken` -- it has Edge runtime CJS issues. Use `jose`.
- Do NOT use `bcrypt` (native addon with `node-gyp`) -- use `bcryptjs` (pure JS, per D-02).
- Do NOT set cookie `maxAge` beyond 7 days -- security best practice.
</action>
<verify>
<automated>npx tsx -e "import { hashPassword, comparePassword } from './src/lib/password'; (async () => { const h = await hashPassword('test123'); console.log(h.startsWith('\$2a\$10\$') ? 'bcrypt OK' : 'FAIL'); const m = await comparePassword('test123', h); console.log(m ? 'compare OK' : 'FAIL'); })()" 2>&1 | tail -2</automated>
</verify>
<done>
`hashPassword('test')` returns a bcrypt hash starting with `$2a$10$`, `comparePassword('test', hash)` returns `true`, `comparePassword('wrong', hash)` returns `false`, `signToken` and `verifyToken` roundtrip successfully with a test payload
</done>
</task>

<task type="auto">
<name>Task 2: Implement login, logout, and setup API routes</name>
<files>
src/app/api/auth/login/route.ts, src/app/api/auth/logout/route.ts, src/app/api/setup/route.ts
</files>
<action>
Implement the three API endpoints for authentication.

1. **src/app/api/auth/login/route.ts** -- `POST /api/auth/login` (implements AUTH-01, per D-05):
   - Parse request body: `const body = await req.json()`
   - Validate with Zod `loginSchema` from `@/lib/zod-schemas`
   - Query database: `db.select().from(users).where(eq(users.email, body.email).or(eq(users.username, body.username)))` -- try email first, then fall back to username if the identifier doesn't match email format
   - If no user found: return `NextResponse.json({ error: "Invalid credentials" }, { status: 401 })`
   - If user found: call `comparePassword(body.password, user.passwordHash)` (per D-02)
   - If password mismatch: return `NextResponse.json({ error: "Invalid credentials" }, { status: 401 })` -- SAME message as above, never reveal whether email exists
   - If password matches: create JWT payload `{ sub: user.id, email: user.email, role: user.role }`, call `signToken()`, create `NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } })`, call `setAuthCookie(response, token)` (per D-06), return response with status 200

2. **src/app/api/auth/logout/route.ts** -- `POST /api/auth/logout`:
   - Create `NextResponse.json({ message: "Logged out" })`
   - Call `clearAuthCookie(response)`
   - Return response (no auth check needed -- idempotent)

3. **src/app/api/setup/route.ts** -- `POST /api/setup` (implements D-01):
   - **Guard (runs FIRST):** Query `SELECT count(*) FROM users` via Drizzle: `const result = await db.select({ count: count() }).from(users)`
   - If `result[0].count > 0`: return `NextResponse.json({ error: "Setup already completed" }, { status: 403 })` -- permanently disabled
   - If `result[0].count === 0`: continue
   - Validate body with Zod `setupSchema` from `@/lib/zod-schemas`: `{ email, username, password, displayName }`
   - Hash password: `const passwordHash = await hashPassword(password)` (per D-02)
   - INSERT user: `db.insert(users).values({ email, username, passwordHash, displayName, role: "teacher" })`
   - Return `NextResponse.json({ message: "Account created" }, { status: 201 })`
   - IMPORTANT: The count check MUST run before any INSERT. This is a server-side guard -- client-side redirects can be bypassed.

AVOID:
- Login endpoint MUST NOT reveal whether the email/username exists -- always return generic "Invalid credentials"
- Setup endpoint MUST NOT accept `role` from the request body -- role is hardcoded to "teacher"
- Password MUST be hashed before INSERT -- never store plain text
- Zod validation must reject empty strings, invalid email format, and passwords shorter than 6 characters
- JWT payload MUST NOT include password or password hash
</action>
<verify>
<automated>test -f src/app/api/auth/login/route.ts && grep -q "comparePassword" src/app/api/auth/login/route.ts && grep -q "setAuthCookie" src/app/api/auth/login/route.ts && test -f src/app/api/setup/route.ts && grep -q "count" src/app/api/setup/route.ts && echo "API routes verified"</automated>
</verify>
<done>
Login API returns 401 for invalid credentials with generic message, returns 200 + sets cookie for valid credentials, logout clears cookie, setup creates first user when table is empty and returns 403 after first user exists
</done>
</task>

## Plan 01-04: Base Layout with Auth Guard and Login UI (ROADMAP item 01-04)

<task type="auto">
<name>Task 1: Create Zod validation schemas and login page UI</name>
<files>
src/lib/zod-schemas.ts, src/app/(public)/login/page.tsx
</files>
<action>
Create request validation schemas and the login page UI (per D-05).

1. **src/lib/zod-schemas.ts** -- Shared Zod validation schemas:
   ```ts
   import { z } from "zod";
   export const loginSchema = z.object({
     email: z.string().email("Invalid email format").optional(),
     username: z.string().min(1, "Username is required").optional(),
     password: z.string().min(1, "Password is required"),
   }).refine(data => data.email || data.username, {
     message: "Email or username is required",
   });

   export const setupSchema = z.object({
     email: z.string().email("Invalid email format"),
     username: z.string().min(3, "Username must be at least 3 characters"),
     password: z.string().min(6, "Password must be at least 6 characters"),
     displayName: z.string().min(1, "Display name is required"),
   });
   ```

2. **src/app/(public)/login/page.tsx** -- Login page UI (per D-05: minimal login page):
   - Client Component (`'use client'`)
   - Form with:
     - Input: `name="identifier"` (accepts either email or username) with placeholder "Email or username"
     - Input: `type="password"`, `name="password"`, placeholder "Password"
     - Submit button: "Sign In"
   - On submit:
     - Set loading state, disable button
     - Determine if identifier is email (contains @) or username
     - POST to `/api/auth/login` with body: `{ email: identifier, password }` if email format, or `{ username: identifier, password }` if not
     - On success (200): `router.push('/dashboard')` using `useRouter()` from `next/navigation`
     - On error (401): display error message from response in a visible error alert (red border/background)
     - On network error: display "Connection error, please try again"
   - Link below form: `<Link href="/setup">First time? Create your account</Link>`
   - Styling: Tailwind CSS, centered card layout on a light gray background:
     - Page: `min-h-screen flex items-center justify-center bg-gray-50`
     - Card: `bg-white p-8 rounded-lg shadow-md w-full max-w-md`
     - Inputs: `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`
     - Button: `w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50`

AVOID:
- Do NOT add "Remember me" checkbox (per D-05)
- Do NOT add "Forgot password" link (deferred, mentioned in CONTEXT.md as post-v1)
- Do NOT store any auth state in localStorage or sessionStorage -- JWT is HTTP-only cookie only (per D-06)
- Do NOT pre-fill the identifier field from localStorage
</action>
<verify>
<automated>grep -q "api/auth/login" "src/app/(public)/login/page.tsx" && grep -q "Invalid credentials" "src/app/(public)/login/page.tsx" && grep -q "use client" "src/app/(public)/login/page.tsx" && echo "Login page verified"</automated>
</verify>
<done>
Login page renders email/username + password form, submits to /api/auth/login with correct field based on identifier format, redirects to /dashboard on success, displays error message on failure, loading state during submission, link to /setup visible
</done>
</task>

<task type="auto">
<name>Task 2: Create setup page and middleware auth guard</name>
<files>
src/app/setup/page.tsx, src/middleware.ts
</files>
<action>
Complete the auth flow with first-time registration and route protection.

1. **src/app/setup/page.tsx** -- First-time registration page (implements D-01):
   - Client Component (`'use client'`)
   - Form with:
     - Input: `name="email"`, `type="email"`, placeholder "Email"
     - Input: `name="username"`, placeholder "Username (min 3 characters)"
     - Input: `name="password"`, `type="password"`, placeholder "Password (min 6 characters)"
     - Input: `name="displayName"`, placeholder "Display Name"
     - Submit button: "Create Account"
   - On submit:
     - Validate client-side using `setupSchema.safeParse()`
     - If validation fails: display field-level error messages
     - If validation passes: POST to `/api/setup` with form data
     - On success (201): `router.push('/login')` with a success toast/message: "Account created. Please log in."
     - On error (403): redirect to `/login` with message: "Setup already completed. Please log in."
     - On error (400): display validation errors from response
   - Styling: Same card layout as login page
   - Note: The server-side guard in `/api/setup` is the real security. This page is always accessible.

2. **src/middleware.ts** -- Route-level auth guard (implements AUTH-02):
   ```ts
   import { NextRequest, NextResponse } from "next/server";
   import { AUTH_COOKIE_NAME } from "@/lib/auth-types";

   export function middleware(request: NextRequest) {
     const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME);
     if (!sessionCookie || !sessionCookie.value) {
       const loginUrl = new URL("/login", request.url);
       loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
       return NextResponse.redirect(loginUrl);
     }
     return NextResponse.next();
   }

   export const config = {
     matcher: ["/dashboard/:path*"],
   };
   ```
   - Reads the auth cookie `cc_session` (per D-06)
   - If cookie missing or empty AND path matches `/dashboard`: redirect to `/login` with `?redirect=` query param for post-login redirect
   - If cookie present: allow request through
   - The middleware does NOT verify the JWT signature -- it only checks cookie presence for redirect logic. JWT verification happens in Server Components via `getAuthSession()` before rendering protected data.
   - NOT matched routes (accessible without auth): `/login`, `/setup`, `/api/auth/*`, `/api/setup`, static files

File ownership note: This plan creates `src/middleware.ts` (new) and `src/app/setup/page.tsx` (new). Plan 01-01 created layout files in `(protected)/` and `(public)/` -- no file conflict since middleware and setup page are new files.
</action>
<verify>
<automated>test -f src/middleware.ts && grep -q "AUTH_COOKIE_NAME" src/middleware.ts && grep -q "/dashboard" src/middleware.ts && test -f src/app/setup/page.tsx && grep -q "api/setup" src/app/setup/page.tsx && echo "Middleware and setup page verified"</automated>
</verify>
<done>
Setup page renders form with email/username/password/display name fields, creates first user via POST /api/setup, redirects to /login after creation, middleware redirects unauthenticated requests from /dashboard to /login
</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> API routes | User-supplied credentials (email/username/password) arrive as untrusted input |
| Setup endpoint -> Database | First-time registration writes to users table -- must be guarded to prevent unauthorized account creation |
| JWT cookie -> Middleware | Client-controlled cookie could be tampered with; middleware only checks presence, Server Component verifies signature |
| npm packages -> Runtime | bcryptjs, jose, zod are external dependencies installed via npm |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Spoofing | POST /api/auth/login | mitigate | Accept EITHER email OR username as identifier via Zod schema `.refine()` -- not both simultaneously, prevents identifier ambiguity |
| T-01-02 | Tampering | JWT in HTTP-only cookie | mitigate | JWT signed with HS256 via jose; Server Components verify signature via `verifyToken()` before trusting payload; middleware only checks presence for fast redirect |
| T-01-03 | Repudiation | POST /api/auth/login (failed attempts) | accept | No audit log for v1; failed login attempts return generic 401; logging added in v2 if needed |
| T-01-04 | Information Disclosure | POST /api/auth/login error responses | mitigate | Always return identical error "Invalid credentials" for both "user not found" and "wrong password" -- prevents email/username enumeration |
| T-01-05 | Denial of Service | POST /api/setup | mitigate | Endpoint returns 403 immediately when `SELECT count(*) FROM users > 0` -- single-shot guard prevents repeated abuse; no rate limiting needed since endpoint self-disables |
| T-01-06 | Elevation of Privilege | POST /api/setup after first user exists | mitigate | Server-side `SELECT count(*)` check runs BEFORE any INSERT -- cannot bypass client-side redirect; role hardcoded to 'teacher' on INSERT, not accepted from request body |
| T-01-07 | Tampering | Password storage in users table | mitigate | Password hashed with bcrypt cost factor 10 (per D-02) before INSERT; plain text password never stored, never logged, never returned in API responses |
| T-01-SC | Tampering | npm package installs (bcryptjs, jose, zod, drizzle-orm, postgres) | mitigate | Verify all packages published on npmjs.com with expected download counts and active maintenance before `npm install`. Blocking checkpoint for any [ASSUMED]/[SUS] packages. |
</threat_model>

<verification>
## Phase 1 Verification Checklist

### Infrastructure
- [ ] `docker compose up` starts PostgreSQL 17 successfully, `pg_isready` returns "accepting connections"
- [ ] `npm run dev` starts Next.js on port 3000 without errors
- [ ] `npx drizzle-kit migrate` applies migration cleanly and shows "nothing to migrate" on second run

### Database
- [ ] `users` table exists in PostgreSQL with 8 columns: id (uuid PK), email (varchar unique), username (varchar unique), password_hash (varchar), display_name (varchar), role (varchar default 'teacher'), created_at (timestamp), updated_at (timestamp)
- [ ] Unique index on `email` column verified
- [ ] Unique index on `username` column verified
- [ ] `drizzle/` directory committed to git with migration SQL files

### Authentication (AUTH-01)
- [ ] `curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"wrong"}'` returns 401 with `{"error":"Invalid credentials"}`
- [ ] `curl -X POST http://localhost:3000/api/setup -H 'Content-Type: application/json' -d '{"email":"teacher@test.com","username":"teacher","password":"password123","displayName":"Test Teacher"}'` returns 201 when table is empty
- [ ] Running the same setup request again returns 403 with `{"error":"Setup already completed"}`
- [ ] Login with created user returns 200 with user object and sets `cc_session` cookie
- [ ] Cookie has `HttpOnly` flag, `Path=/`, `SameSite=Lax`, `Max-Age=604800`
- [ ] Password in database starts with `$2a$10$` (bcrypt cost 10 per D-02)

### Session Persistence (AUTH-02)
- [ ] After login, `GET /dashboard` returns 200 (not redirected to /login)
- [ ] After login, `GET /login` returns 200 (login page accessible even when logged in)
- [ ] `cc_session` cookie is sent with every request to /dashboard (verified via browser dev tools or curl -b)

### Auth Guard
- [ ] Without `cc_session` cookie, `GET /dashboard` returns 307 redirect to `/login`
- [ ] Login page renders identifier input + password input + "Sign In" button
- [ ] Login page shows error message on failed login attempt
- [ ] Setup page renders email + username + password + display name form
- [ ] Setup page redirects to /login after successful account creation
- [ ] Middleware config matcher includes `/dashboard/:path*` but NOT `/login`, `/setup`, or `/api/auth/*`
</verification>

<success_criteria>
## Phase 1 Success Criteria (from ROADMAP.md)

1. **Teacher can log in with email/username and password** -- VERIFIED by: login page renders form, POST /api/auth/login returns 200 with JWT cookie on valid credentials, returns 401 on invalid (AUTH-01)
2. **Teacher stays logged in when navigating between pages (session persists)** -- VERIFIED by: HTTP-only cookie `cc_session` is sent with every request automatically, /dashboard accessible after login without re-authentication (AUTH-02)
3. **Teacher is redirected to login when accessing protected pages while not authenticated** -- VERIFIED by: `middleware.ts` redirects /dashboard to /login when no auth cookie present (AUTH-02)

## Additional Verification
- First-time self-registration works via /setup and self-disables after first account created (D-01)
- Password is bcrypt-hashed with cost factor 10 before storage (D-02)
- Local PostgreSQL starts via Docker Compose with single command (D-03)
- JWT stored exclusively in HTTP-only cookie, not in localStorage or sessionStorage (D-06)
</success_criteria>

<output>
Create `.planning/phases/01-foundation-auth/01-01-SUMMARY.md` when plan execution completes.
</output>
