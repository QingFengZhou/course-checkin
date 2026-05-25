# Phase 3: Check-In System - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

## Phase Boundary

老师可以发起签到并展示二维码，学生扫码后输入学号/姓名完成签到。交付：签到会话管理、二维码生成、学生签到提交、手动签到、签到超时自动结束。

## Implementation Decisions

### 签到会话机制
- **D-3.01:** 签到会话 5 分钟超时自动结束。超时后学生无法再通过该 session 签到。
- **D-3.02:** 二维码 URL 格式：`https://app.example.com/checkin?session=<token>`，其中 token 是 nanoid 生成的唯一签到会话标识。
- **D-3.03:** 学生扫码后打开 URL，输入学号/姓名确认身份后提交。不需要选择课程（session token 已绑定到课程）。

### 学生扫码方式
- **D-3.04:** 手机自带相机直接扫码打开 URL。不需要 html5-qrcode 或其他浏览器内扫码库。

### 签到数据存储
- **D-3.05:** 两张表：`check_in_sessions`（签到会话）+ `attendance_records`（签到记录）。
- **D-3.06:** `check_in_sessions` 包含：id, course_id, token, status (active/expired/closed), expires_at, created_at, closed_at。
- **D-3.07:** `attendance_records` 包含：id, session_id, student_id, checked_at。外键关联 students 表。

### 手动签到入口
- **D-3.08:** 在学生管理面板（学生列表）中，每个学生旁边有一个「签到」按钮，点击即标记该学生为当前活跃签到会话已签到。

### Claude's Discretion
- 签到提交 API 需要幂等性（防止学生重复提交）。
- 二维码 URL 使用相对路径 + 当前域名，无需硬编码域名。
- 签到会话超时检查：API 端检查 expires_at，无需后台定时任务（v1 简化方案）。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — 项目核心价值和约束
- `.planning/REQUIREMENTS.md` — v1 需求清单（CHECKIN-01, CHECKIN-02, CHECKIN-03, CHECKIN-04）
- `.planning/ROADMAP.md` — Phase 3 目标和成功标准
- `CLAUDE.md` — 技术栈决策（Next.js 16, PostgreSQL 17, Drizzle ORM, qrcode.react）

### Phase 1-2 Artifacts (dependencies)
- `.planning/phases/01-foundation-auth/01-CONTEXT.md`
- `.planning/phases/02-course-student-mgmt/02-CONTEXT.md`
- `src/db/schema/courses.ts` — courses 表
- `src/db/schema/students.ts` — students 表
- `src/lib/auth.ts` — JWT 认证
- `src/lib/zod-schemas.ts` — Zod 验证 schemas

### Requirements (from REQUIREMENTS.md)
- **CHECKIN-01:** 老师可以发起签到（选择课程，生成二维码）
- **CHECKIN-02:** 学生扫码后输入学号/姓名完成签到
- **CHECKIN-03:** 老师可以手动帮学生签到
- **CHECKIN-04:** 签到会话有超时自动结束

## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` — getAuthSession 用于获取老师身份
- `src/db/index.ts` — db 实例
- `src/lib/zod-schemas.ts` — 现有 Zod schemas，需要添加签到相关 schemas
- `src/app/(protected)/dashboard/components/student-roster.tsx` — 学生列表组件可复用/扩展
- `src/app/(public)/login/page.tsx` — 表单样式可复用为签到表单

### Established Patterns
- API routes 在 `src/app/api/` 下，使用 NextResponse + Zod 验证
- Server Components 用 cookies() + verifyToken 获取会话
- Client Components 用 'use client' + fetch + useState/useRouter
- Tailwind 卡片样式一致
- 错误返回 `{ error: "message" }`，成功返回 `{ data }` 或 `{ message }`

### Integration Points
- 签到页面在 `src/app/(protected)/` 下（需要老师认证）
- 学生签到提交页面在 `src/app/checkin/` 下（无需认证，通过 session token 识别）
- 二维码生成使用 `qrcode.react` 库（CLAUDE.md 已确认）

## Specific Ideas

- 老师从 Dashboard 选择课程，点击"发起签到"按钮
- 签到页面显示大二维码 + 签到状态信息（已签/总数、倒计时）
- 学生扫码后打开 `/checkin?session=<token>` 页面，输入学号 + 姓名，提交
- 提交成功后显示"签到成功"页面
- 手动签到：在学生列表旁点击"签到"按钮，选择学生标记签到

## Deferred Ideas

- 动态 QR 刷新（防作弊）— v2 需求 ABUSE-01
- IP/UA 防重复签到检测 — v2 需求 ABUSE-02
- GPS/位置校验签到 — 后期可添加

---

*Phase: 03-Check-In System*
*Context gathered: 2026-05-26*
