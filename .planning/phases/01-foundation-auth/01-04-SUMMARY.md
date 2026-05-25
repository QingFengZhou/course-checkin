---
phase: 01-foundation-auth
plan: 01-04
subsystem: auth-ui
tags:
  - middleware
  - login-page
  - setup-page
  - route-guard
dependency:
  requires:
    - 01-01 (project scaffolding)
    - 01-02 (database schema)
    - 01-03 (auth service, API routes)
  provides:
    - Route-level auth guard for /dashboard
    - Login UI with email/username + password form
    - Setup UI for first-time teacher registration
  affects:
    - src/middleware.ts
    - src/app/(public)/login/page.tsx
    - src/app/setup/page.tsx
tech-stack:
  added: []
  patterns:
    - Edge middleware cookie check
    - Client-side form with fetch to API routes
key-files:
  created:
    - src/middleware.ts
    - src/app/(public)/login/page.tsx
    - src/app/setup/page.tsx
  modified: []
decisions:
  - Middleware checks cookie presence only, not JWT signature (verified in Server Components)
  - No "Remember me" or "Forgot password" (per D-05)
  - Login form auto-detects email vs username by @ character
metrics:
  duration: ~5min
  tasks_completed: 2
  files_created: 3
  completed: "2026-05-26"
---

# Phase 1 Plan 01-04: Base Layout with Auth Guard and Login UI Summary

**One-liner:** Route-level middleware auth guard protecting /dashboard, login page with email/username + password form, and first-time setup page for teacher registration.

## Tasks Completed

### Task 1: Create middleware auth guard and login page UI

**Files created:**
- `src/middleware.ts` - Next.js Edge middleware that checks for `cc_session` cookie presence on `/dashboard/:path*` routes and redirects unauthenticated requests to `/login` with a `?redirect=` query parameter.
- `src/app/(public)/login/page.tsx` - Client Component login form that auto-detects whether the identifier is an email (contains `@`) or username, POSTs to `/api/auth/login` with the appropriate field, handles loading/error states, and redirects to `/dashboard` on success. Includes a link to `/setup` for first-time users.

**Commit:** `71b4f1f`

### Task 2: Create setup page UI

**Files created:**
- `src/app/setup/page.tsx` - Client Component registration form with email, username, password, and display name fields. Includes client-side validation (username min 3 chars, password min 6 chars), POSTs to `/api/setup`, handles 403 (setup already completed) with redirect to login, shows success state with auto-redirect to `/login` after 1.5s.

**Commit:** `8c32de9`

## Verification

- `src/middleware.ts` contains `AUTH_COOKIE_NAME` import and `/dashboard` matcher
- `src/app/(public)/login/page.tsx` contains `"use client"`, `api/auth/login` fetch, form elements, error display, and link to `/setup`
- `src/app/setup/page.tsx` contains form with email, username, password, displayName fields, submits to `/api/setup`, has success and error states
- All 3 files exist and are committed

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

No stubs. All created components are fully wired to their corresponding API endpoints.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth_bypass | src/middleware.ts | Middleware only checks cookie presence, not JWT signature. This is by design -- signature verification happens in Server Components via `getAuthSession()`. The middleware provides fast redirect logic, not security enforcement. |

## Self-Check: PASSED

- [x] `src/middleware.ts` exists
- [x] `src/app/(public)/login/page.tsx` exists
- [x] `src/app/setup/page.tsx` exists
- [x] Commits `71b4f1f` and `8c32de9` exist in git log
