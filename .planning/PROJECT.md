# 课程签到系统 (CourseCheckIn)

## What This Is

一个轻量级在线课程签到系统：老师发起签到并展示二维码，学生扫码后输入学号/姓名完成签到。支持实时签到看板、历史记录查询、课程与学生的增删管理。面向 100-300 人课堂场景，核心要求是高并发扫码签到不卡顿。

## Core Value

100-300 人同时扫码签到时稳定流畅，老师能实时看到签到进度和明细。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 老师可以创建和管理课程（增删课程）
- [ ] 老师可以添加/移除课程中的学生
- [ ] 老师可以发起签到并展示二维码
- [ ] 学生扫码后输入学号/姓名完成签到
- [ ] 老师可以手动帮学生签到
- [ ] 实时显示签到情况（签到率、已签到人、未签到人、人数统计）
- [ ] 查看学生历史签到记录和缺勤情况

### Out of Scope

- 防作弊机制（GPS、位置校验等） — 后期可添加，v1 不做
- 管理员/教务处角色 — v1 仅老师和学生
- Web 端优先

## Context

- 现有签到系统不稳定，人多时容易卡顿
- 现有系统缺少实时数据展示（签到率、签到人列表）
- 现有系统不方便查看历史签到和缺勤情况
- 目标场景：一节课 100 人左右，最多 300 人同时扫码

## Constraints

- **性能**: 支持 300 人并发签到不卡顿 — 核心场景
- **技术**: 扫码 + 学号/姓名确认身份 — 简单可靠
- **角色**: 仅老师和学生两种角色

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 扫码+学号/姓名作为签到方式 | 简单、无需额外硬件 | — Pending |
| Web 优先 | 学生和老师都有浏览器即可 | — Pending |

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
*Last updated: 2026-05-25 after initialization*
