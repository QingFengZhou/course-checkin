---
phase: "01"
plan: "03"
subsystem: "auth"
tags: ["authentication", "jwt", "password-hashing", "api-routes"]
dependency_graph:
  requires: ["01-01 (DB schema)", "01-02 (auth-types)"]
  provides: ["JWT signing/verification", "password hashing", "login/logout/setup endpoints"]
  affects: []
tech_stack:
  added: ["jose (JWT)", "bcryptjs (password hashing)", "zod (validation)"]
  patterns: ["HTTP-only cookies", "generic error messages", "one-time setup guard"]
key_files:
  created:
    - src/lib/auth.ts
    - src/lib/password.ts
    - src/lib/zod-schemas.ts
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/logout/route.ts
    - src/app/api/setup/route.ts
  modified: []
decisions:
  - "JWT expiration set to 7 days to match cookie maxAge"
  - "Login accepts email OR username as identifier, returns generic 'Invalid credentials' for both user-not-found and wrong-password"
  - "Setup endpoint hardcodes role='teacher', never accepts role from request body"
  - "Setup uses count() guard to prevent creating multiple accounts"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-26"
---

# Phase 01 Plan 03: Auth Service Summary

JWT auth with 7-day token expiration, bcrypt password hashing, and three API endpoints (login, logout, one-time setup) using HTTP-only cookies for session management.

## Tasks Completed

### Task 1: JWT and Password Hashing Utilities

**Files created:**
- `src/lib/auth.ts` — `signToken`, `verifyToken`, `setAuthCookie`, `clearAuthCookie`, `getAuthSession`
- `src/lib/password.ts` — `hashPassword`, `comparePassword` using bcryptjs with cost factor 10

**Verification:**
- bcrypt hash format verified (`$2a$10$` prefix)
- Password comparison returns true for correct password
- Password comparison returns false for wrong password

**Commit:** `2c0e3e6`

### Task 2: Login, Logout, and Setup API Routes

**Files created:**
- `src/lib/zod-schemas.ts` — `loginSchema` (email or username + password), `setupSchema` (email, username, password min 6, displayName)
- `src/app/api/auth/login/route.ts` — POST endpoint with Zod validation, DB lookup by email/username, bcrypt comparison, JWT signing, HTTP-only cookie
- `src/app/api/auth/logout/route.ts` — POST endpoint that clears auth cookie
- `src/app/api/setup/route.ts` — POST endpoint with `count()` guard (one-time only), Zod validation, bcrypt hashing, creates first teacher account

**Verification:**
- All three route files exist
- Login uses `comparePassword` and `setAuthCookie`
- Setup uses `count()` guard
- No hardcoded secrets (JWT_SECRET read from `process.env`)
- Login returns generic "Invalid credentials" for both user-not-found and wrong-password

**Commit:** `c6c1e94`

## Key Decisions

1. **JWT expiration = 7 days**: Matches cookie `maxAge` (604800 seconds) for consistent session lifetime
2. **Generic "Invalid credentials"**: Prevents user enumeration — same response for both non-existent user and wrong password
3. **Setup role hardcoded to "teacher"**: Never accepts role from request body to prevent privilege escalation during setup
4. **Setup count() guard**: Prevents creating multiple accounts — returns 403 if any user already exists

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired.

Note: `getAuthSession` in `src/lib/auth.ts` sets `displayName: payload.email` as a temporary value (documented with comment "Will be enriched from DB in routes"). This is not a UI-facing stub — it's an internal session object that will be populated with the actual display name when routes call DB enrichment.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: jwt-secret-env | src/lib/auth.ts | JWT secret read from `process.env.JWT_SECRET` — must be set before deployment. Missing secret will cause runtime errors. |
| threat_flag: one-time-setup | src/app/api/setup/route.ts | Setup endpoint creates first teacher account. Once count() > 0, no more accounts can be created via this endpoint. Teacher onboarding for subsequent teachers needs a separate flow (future plan). |

## Self-Check: PASSED
