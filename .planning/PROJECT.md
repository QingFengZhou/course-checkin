# 课程签到系统 (CourseCheckIn)

## What This Is

一个轻量级在线课程签到系统：老师发起签到并展示二维码，学生扫码后输入学号/姓名完成签到。支持实时签到看板、历史记录查询、课程与学生的增删管理。面向 100-300 人课堂场景，核心要求是高并发扫码签到不卡顿。

v1.0 delivered: 老师登录、课程/学生管理、二维码签到、WebSocket 实时看板、签到历史与考勤统计。

## Core Value

100-300 人同时扫码签到时稳定流畅，老师能实时看到签到进度和明细。

## Requirements

### Validated

- ✓ 老师可以创建和管理课程（增删课程） — v1.0 (Phase 2)
- ✓ 老师可以添加/移除课程中的学生 — v1.0 (Phase 2)
- ✓ 老师可以发起签到并展示二维码 — v1.0 (Phase 3)
- ✓ 学生扫码后输入学号/姓名完成签到 — v1.0 (Phase 3)
- ✓ 老师可以手动帮学生签到 — v1.0 (Phase 3)
- ✓ 实时显示签到情况（签到率、已签到人、未签到人、人数统计） — v1.0 (Phase 4)
- ✓ 查看学生历史签到记录和缺勤情况 — v1.0 (Phase 5)

### Active

(None — all v1 requirements shipped)

### Out of Scope

- 防作弊机制（GPS、位置校验等） — 后期可添加，v1 不做
- 管理员/教务处角色 — v1 仅老师和学生
- Web 端优先

## Context

Shipped v1.0 MVP with 4,816 lines of TypeScript/TSX across 125 source files.
Tech stack: Next.js 16, React 19, PostgreSQL 17, Drizzle ORM, ws (WebSocket), JWT, bcryptjs.
Timeline: 8 days (2026-05-25 → 2026-06-01), 63 commits (32 feature, 20 docs, 11 fix/refactor).

## Constraints

- **性能**: 支持 300 人并发签到不卡顿 — 核心场景
- **技术**: 扫码 + 学号/姓名确认身份 — 简单可靠
- **角色**: 仅老师和学生两种角色

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 扫码+学号/姓名作为签到方式 | 简单、无需额外硬件 | ✅ v1.0 |
| Web 优先 | 学生和老师都有浏览器即可 | ✅ v1.0 |
| Next.js + ws 作为实时方案 | 同端口处理 HTTP + WebSocket | ✅ v1.0 |
| 学生首次签到自动注册到课程 | 减少老师前置操作 | ✅ Phase 3 |
| 局域网测试支持 NEXT_PUBLIC_BASE_URL | 方便手机扫码测试 | ✅ Phase 3 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-01 after v1.0 milestone*
