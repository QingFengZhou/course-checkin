# Phase 5: History & Reporting - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

## Phase Boundary

老师可以查看历史签到记录和学生考勤情况。交付：签到历史列表页、签到详情页、学生考勤个人页、考勤总览页。

## Implementation Decisions

### 入口设计
- **D-5.01:** 签到历史入口：课程卡片上加「历史记录」按钮，与「管理学生」「发起签到」并列。点击进入该课程的所有历史签到列表。
- **D-5.02:** 学生考勤入口：同时在学生列表（StudentRoster）中每个学生加「考勤」按钮，和独立的考勤总览页面。
- **D-5.03:** Dashboard 保持现有布局，不加导航标签。

### 签到详情页
- **D-5.04:** 展示内容：课程名称、签到时间、持续时长、签到率、已签到学生列表、未签到学生列表。
- **D-5.05:** 不展示签到时间线（签到时间分布留到 v2）。
- **D-5.06:** 已签/未签学生列表可复用 Phase 4 的看板样式（彩色标签 + 进度条）。

### 学生考勤页
- **D-5.07:** 个人考勤页：从学生列表或考勤总览点击学生进入，展示出勤率、缺勤次数、每次签到状态（已签/缺勤）、签到时间。
- **D-5.08:** 考勤总览页：列出课程内所有学生及其出勤率，支持排序（按出勤率、学号、姓名）。
- **D-5.09:** 考勤总览页放在 `/dashboard/courses/[courseId]/attendance` 路由。

### 页面路由
- **D-5.10:** 课程历史列表：`/dashboard/courses/[courseId]/history`
- **D-5.11:** 签到详情页：`/dashboard/courses/[courseId]/history/[sessionId]`
- **D-5.12:** 考勤总览：`/dashboard/courses/[courseId]/attendance`
- **D-5.13:** 学生考勤详情：`/dashboard/courses/[courseId]/attendance/[studentId]`

### API
- **D-5.14:** `GET /api/courses/[courseId]/sessions` — 返回该课程所有签到会话（含已结束的），按时间倒序
- **D-5.15:** `GET /api/students/[studentId]/attendance` — 返回某个学生的所有签到记录
- **D-5.16:** `GET /api/courses/[courseId]/attendance-summary` — 返回该课程所有学生的出勤率汇总

### Claude's Discretion
- 历史列表的翻页/分页方式（API 支持 limit/offset，前端用单页还是分页，由实现者根据数据量决定）
- 学生考勤总览页在 300 人课程下的渲染方式（简单的 table 还是需要虚拟滚动）
- 签到详情页是否在签到结束页新增「查看详情」链接（由实现者决定）
- 签到详情页的编辑功能（补签）是否是 Phase 5 范围，还是留到 v2

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/ROADMAP.md` — Phase 5 goal and success criteria
- `.planning/REQUIREMENTS.md` — HIST-01, HIST-02
- `CLAUDE.md` — Tech stack

### Existing Code
- `src/app/api/sessions/[sessionId]/route.ts` — Session status endpoint (GET returns student lists)
- `src/lib/checkin-service.ts` — getSessionStats helper
- `src/app/(protected)/dashboard/components/course-card.tsx` — Course card with button pattern
- `src/app/(protected)/dashboard/components/student-roster.tsx` — Student list component

## Specific Ideas

- 课程历史列表页可以用卡片式布局（类似课程卡片），每张卡片显示一次签到：日期、状态（已完成/已过期）、签到率
- 签到详情页可复用 CheckInPageClient.tsx 中已实现的看板 UI 组件
- 考勤总览页用表格布局，列：学号、姓名、出勤率、已签次数、缺勤次数、操作（查看详情）
- 首次进入无历史记录时，显示空状态提示「暂无签到记录」

## Deferred Ideas

- 签到时间线 — v2（按时间分布展示签到数据）
- 签到数据导出 — v2（BULK-02）
- 出勤率低于阈值自动标记 — 后期可添加
- 签到详情页的补签功能 — 由实现者判定是否属于 Phase 5 范围

---

*Phase: 05-history-reporting*
*Context gathered: 2026-06-01*
