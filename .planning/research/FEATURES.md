# Feature Landscape

**Domain:** Online Course Check-In System (课程签到系统)
**Researched:** 2026-05-25

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 老师登录/身份验证 | Basic access control | Low | Simple auth, no SSO needed for v1 |
| 学生登录/身份验证 | Basic access control | Low | Student ID + name, no password needed |
| 课程创建与管理 | Core workflow prerequisite | Low | CRUD for courses, teacher owns courses |
| 学生管理（添加到课程） | Required to define who can check in | Low | Bulk import (Excel/CSV) expected for large classes |
| 签到发起（动态二维码） | Core check-in mechanism | Medium | QR code must be dynamic (time-limited, refreshable) to prevent photo sharing |
| 扫码签到 | Core student action | Medium | Scan QR -> enter student ID + name -> confirm attendance |
| 实时签到看板 | Core teacher value prop | High | Must support 300 concurrent updates via WebSocket, show attendance rate, present/absent lists |
| 手动签到（代签） | Fallback for edge cases (phone dead, no camera) | Low | Teacher manually marks student as present |
| 签到历史记录 | Basic reporting | Low | Per-student and per-course history views |
| 签到状态统计 | Basic reporting | Low | Count by status: present, absent, late, excused |
| 签到会话管理 | Basic workflow | Low | Start, end, pause check-in session |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 300人并发不卡顿 | Core differentiator vs existing systems | High | This IS the product's main selling point. Requires WebSocket + connection pooling + efficient DB writes |
| 实时签到率可视化 | Immediate feedback, addresses pain point | Medium | Live chart/graph of attendance rate over time during session |
| 签到会话倒计时 | Creates urgency, reduces teacher overhead | Low | Configurable time limit with auto-close |
| 缺席预警 | Proactive value for teachers | Medium | Flag students with N consecutive absences |
| Excel导入/导出学生名单 | Saves teacher time on bulk operations | Low | Standard template for import |
| 签到报告导出 | Useful for administrative reporting | Low | CSV/PDF export of session results |
| 未签到学生列表高亮 | Quick identification of who's missing | Low | Filter/sort by attendance status |
| 多班级同时管理 | Teacher teaches multiple classes | Low | Switch between courses easily |
| 签到二维码防截图（动态刷新） | Prevents cheating (remote students having others scan) | Medium | QR refreshes every N seconds |
| 签到IP/UA限制 | Basic anti-abuse | Low | Detect multiple check-ins from same device |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| GPS/位置校验 | Per PROJECT.md, out of scope for v1. Adds complexity, privacy concerns | Log IP address server-side; add later if needed |
| 管理员/教务处角色 | Per PROJECT.md, v1 only has teacher + student roles | Keep it simple; add admin layer when there's demand |
| 人脸识别签到 | Over-engineered for 100-300 person classroom; hardware-dependent; privacy issues | Stick to QR + student ID/name; simple and reliable |
| 复杂的排课系统 | Out of scope; not the core value | Teacher manually creates courses and sessions |
| 家长通知 | Not relevant for university-level attendance | Focus on teacher-facing features |
| 复杂的权限系统 (RBAC) | Only 2 roles (teacher, student) | Simple role-based access, no fine-grained permissions |
| 考勤积分/奖惩系统 | Adds gamification complexity without solving the core problem | Keep it focused: attendance tracking only |
| 移动端原生App | Web-first per PROJECT.md; native apps add platform maintenance burden | Mobile-responsive web app covers the use case |
| LMS集成（Moodle/Canvas等） | v1 is standalone; integration adds complexity | Validate standalone product first, integrate later |
| 复杂的请假审批流 | Not the core problem; teachers manage absences manually | Simple status flag (excused/absent), no workflow |

## Feature Dependencies

```
老师身份验证 → 课程创建与管理 → 学生管理 → 签到发起 → 扫码签到
                                                                    ↓
                                          实时签到看板 ← 签到会话管理
                                                                    ↓
                                          签到历史记录 ← 签到状态统计
```

Detailed dependency map:

- **扫码签到** requires **签到发起** (QR code must exist)
- **扫码签到** requires **学生管理** (student must be in the course roster)
- **实时签到看板** requires **签到会话** (must have an active session)
- **实时签到看板** requires **WebSocket** infrastructure (for 300 concurrent updates)
- **签到历史记录** requires **签到状态统计** (history depends on recorded states)
- **缺席预警** requires **签到历史记录** (needs historical data)
- **签到报告导出** requires **签到历史记录** (exports from recorded data)

## MVP Recommendation

**Phase 1 - Core Check-In (MVP):**
1. 老师登录/身份验证
2. 课程创建与管理
3. 学生管理（手动添加 + 简单列表）
4. 签到发起（动态二维码）
5. 扫码签到（扫码 + 学号/姓名确认）
6. 实时签到看板（WebSocket, 签到率, 已签到/未签到列表）
7. 手动签到（代签）
8. 签到会话管理（开始/结束）

**Phase 2 - Reporting & Management:**
9. 签到历史记录
10. 签到状态统计
11. Excel导入学生名单
12. 签到报告导出
13. 多班级管理

**Phase 3 - Differentiators & Polish:**
14. 实时签到率可视化（图表）
15. 签到会话倒计时
16. 缺席预警
17. 签到二维码防截图（动态刷新）
18. 签到IP/UA限制

**Defer:**
- GPS/位置校验 (add when anti-fraud becomes a priority)
- 管理员/教务处角色 (add when scaling to department-level use)
- LMS集成 (add when integrating with existing school infrastructure)

## Sources

- Project context: `/Users/zhouqingfeng/Desktop/mydirect/ai/claudecode/claude_app_easy_vibe/getshitdone_tst1/.planning/PROJECT.md`
- General attendance system research: WebSearch results on student attendance management features
- Chinese education platform patterns: knowledge of 雨课堂, 学习通, 超星 platforms
