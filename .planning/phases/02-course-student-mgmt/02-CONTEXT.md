# Phase 2: Course + Student Management - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

## Phase Boundary

老师可以创建课程、管理学生花名册。交付：课程 CRUD API + UI、学生注册/移除 API + UI。课程与老师关联，学生与课程关联。

## Implementation Decisions

### 课程展示方式
- **D-2.01:** 课程列表使用卡片网格展示，每个卡片显示课程名、学期、学生数。风格与现有登录页卡片一致（bg-white, rounded-lg, shadow-md）。

### 学生添加方式
- **D-2.02:** v1 只支持手动逐个添加学生（学号 + 姓名表单）。CSV/Excel 批量导入是 v2 的 BULK-01 需求，不在 Phase 2。

### 课程删除策略
- **D-2.03:** 级联删除 — 删除课程时同时删除该课程下所有学生和签到记录。数据库使用 `ON DELETE CASCADE` 外键约束保证数据一致性。

### 课程页面导航
- **D-2.04:** 课程管理内嵌在 Dashboard 中。替换现有 Dashboard 欢迎页为课程管理界面。不创建独立页面路径，老师登录后直接进入 Dashboard 管理课程和学生。

### Claude's Discretion
- 学期字段设计：v1 使用简单字符串（如 "2026 春季"），不做枚举校验。
- 学生学号在课程内唯一（同一课程不允许重复学号），跨课程可重复。
- 删除操作需要二次确认弹窗（前端 UI 行为）。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — 项目核心价值和约束
- `.planning/REQUIREMENTS.md` — v1 需求清单（COURSE-01, COURSE-02, COURSE-03, STUDENT-01, STUDENT-02）
- `.planning/ROADMAP.md` — Phase 2 目标和成功标准
- `CLAUDE.md` — 技术栈决策（Next.js 16, PostgreSQL 17, Drizzle ORM）

### Phase 1 Artifacts (dependencies)
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — 数据库和认证决策
- `src/db/index.ts` — Drizzle 数据库连接
- `src/db/schema/users.ts` — 现有 users 表 schema
- `src/lib/auth.ts` — JWT 认证工具
- `src/lib/auth-types.ts` — 认证类型定义
- `src/middleware.ts` — 路由守卫

### Requirements (from REQUIREMENTS.md)
- **COURSE-01:** 老师可以创建课程（课程名、学期）
- **COURSE-02:** 老师可以删除课程
- **COURSE-03:** 老师可以查看课程列表
- **STUDENT-01:** 老师可以手动添加学生到课程（学号、姓名）
- **STUDENT-02:** 老师可以从课程中移除学生

## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` — `getAuthSession()` 可复用获取当前老师身份
- `src/db/index.ts` — `db` 实例可复用于所有数据库操作
- `src/middleware.ts` — 现有 auth guard 可复用，Phase 2 新页面都在 /dashboard 下
- `src/app/(public)/login/page.tsx` — 卡片样式可复用为课程卡片
- Tailwind CSS — 现有样式约定一致

### Established Patterns
- API routes 在 `src/app/api/` 下，使用 `NextResponse` + Zod 验证
- 前端页面使用 `'use client'` + `useState`/`useRouter`
- Drizzle schema 在 `src/db/schema/` 下，barrel export
- 错误返回 `{ error: "message" }` 格式，成功返回 `{ data: ... }` 或 `{ message: "..." }`

### Integration Points
- 课程表需要 `teacher_id` 外键关联 `users.id`
- 学生表需要 `course_id` 外键关联课程表
- Dashboard 页面在 `src/app/(protected)/dashboard/page.tsx`，需要重写

## Specific Ideas

- 课程卡片上显示：课程名、学期、学生数量、"管理学生" 按钮、"删除" 按钮（红色，带确认弹窗）
- 创建课程弹窗/内嵌表单：课程名输入 + 学期输入 + 创建按钮
- 学生管理视图：课程详情页面内显示学生列表，可逐个添加/移除

## Deferred Ideas

- CSV/Excel 批量导入学生 — v2 需求 BULK-01
- 课程编辑（改名、改学期）— 未在 v1 需求中，后期可添加
- 学生信息编辑（改学号、改姓名）— 未在 v1 需求中
- 签到记录导出 — v2 需求 BULK-02

---

*Phase: 02-Course + Student Management*
*Context gathered: 2026-05-26*
