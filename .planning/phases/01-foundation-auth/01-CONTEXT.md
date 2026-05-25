# Phase 1: Foundation + Auth - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

## Phase Boundary

老师可以安全登录系统，项目具备数据库基础架构。交付：PostgreSQL schema、Drizzle ORM 配置、老师首次注册 + 登录流程、JWT + HTTP-only cookie 会话管理、基础页面布局。

## Implementation Decisions

### 老师账号初始化
- **D-01:** 首次自注册模式 — 检测到数据库 user 表为空时，访问任何页面自动跳转 `/setup` 页面，创建第一个老师账号后永久关闭该入口。后续新增老师由已有老师操作（后期功能，不在 Phase 1）。

### 密码哈希
- **D-02:** 使用 bcrypt（bcryptjs 纯 JS 版本），无需 native 编译，部署兼容性好。cost factor 默认 10。

### 开发环境数据库
- **D-03:** 本地开发使用 Docker Compose 启动 PostgreSQL 17。`docker compose up` 一键启动，离线可用。
- **D-04:** 生产数据库使用托管 PostgreSQL（Railway/Supabase/Neon），具体部署平台在 Phase 4 WebSocket 需求明确后最终确定。

### 登录页设计
- **D-05:** v1 最小登录页 — 邮箱/用户名 + 密码输入框 + 登录按钮 + 错误提示。不加 remember-me 和忘记密码。
- **D-06:** 登录成功后 JWT 存储在 HTTP-only cookie 中，AUTH-02 要求跨页面会话保持由 cookie 自动处理。

### Claude's Discretion
- 基础布局使用 Next.js App Router 默认结构（`app/layout.tsx`），样式用 Tailwind CSS，无需复杂设计系统。
- 密码重置功能留给后期，v1 不涉及。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — 项目核心价值和约束
- `.planning/REQUIREMENTS.md` — v1 需求清单（AUTH-01, AUTH-02）
- `.planning/ROADMAP.md` — Phase 1 目标和成功标准
- `CLAUDE.md` — 技术栈决策（Next.js 16, PostgreSQL 17, Drizzle ORM, ws）

### Requirements (from REQUIREMENTS.md)
- **AUTH-01:** 老师可以通过账号密码登录
- **AUTH-02:** 老师登录状态跨页面保持

## Existing Code Insights

### Reusable Assets
- 无现有代码 — 绿场项目

### Established Patterns
- 无现有模式 — Phase 1 将建立项目基础模式

### Integration Points
- Phase 1 是项目的第一个 phase，无现有集成点

## Specific Ideas

- 注册页面 `/setup` 仅在 user 表为空时可用，创建第一个账号后重定向到登录页并禁用入口。
- Docker Compose 配置包含 PostgreSQL 17 和 pgAdmin（可选，方便开发调试）。

## Deferred Ideas

- 批量导入学生（CSV/Excel）— v2 需求 BULK-01
- 签到记录导出 — v2 需求 BULK-02
- 动态 QR 刷新（防作弊）— v2 需求 ABUSE-01
- 缺勤自动提醒 — v2 需求 NOTF-01

---

*Phase: 01-Foundation + Auth*
*Context gathered: 2026-05-25*
