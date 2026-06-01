# Phase 4: Real-Time Dashboard - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

## Phase Boundary

老师在不刷新页面的情况下实时看到签到进度。交付：WebSocket 服务端、广播管理器、客户端 hooks、实时看板 UI。

## Implementation Decisions

### WebSocket 方案
- **D-4.01:** 使用 `ws` 库 + 自定义 `server.ts`。Next.js API Routes 不支持持久连接，需要在 Node.js 层面同时启动 HTTP + WebSocket。
- **D-4.02:** `server.ts` 放在项目根目录，通过 `NODE_OPTIONS` 或 `tsx` 运行。开发模式用 `tsx server.ts`，生产模式用 `node dist/server.js`（build 后）。
- **D-4.03:** WebSocket 端口与 HTTP 端口共用（3000），`server.ts` 创建 http.Server，传递给 Next.js 的 `requestHandler` 和 `ws.Server`。

### 消息协议
- **D-4.04:** JSON 格式消息，统一结构：`{ type: string, sessionId: string, payload: any }`
- **D-4.05:** 服务端 → 客户端事件：
  - `attendance_update` — 签到人数变更（checkedInCount, totalStudents, newCheckIn）
  - `session_ended` — 签到已结束
  - `session_error` — 服务端错误
- **D-4.06:** 客户端 → 服务端事件：
  - `subscribe` — 订阅某 session 的实时更新（sessionId）
  - `unsubscribe` — 取消订阅

### 广播管理
- **D-4.07:** Room 模式：每个活跃 session 一个 room，teacher 端订阅该 room。
- **D-4.08:** 使用 `Map<sessionId, Set<WebSocket>>` 管理房间成员。
- **D-4.09:** check-in submit API 成功写入后，通过广播管理器向对应 room 推送 `attendance_update`。
- **D-4.10:** 广播器作为单例模块，`checkin-service` 中 `submitAttendance` 成功后调用广播器发送更新。

### 客户端
- **D-4.11:** 自制 `useCheckinSession` hook（不用 `reconnecting-websocket` 库），包含连接管理、心跳、自动重连（指数退避，最大 30s）。
- **D-4.12:** 现有 5s 轮询降级为 fallback：WebSocket 连接成功时禁用轮询，断开后恢复轮询。
- **D-4.13:** WebSocket URL 使用 `window.location.origin` 的 ws:// 协议（开发环境 ws://localhost:3000）。
- **D-4.14:** 使用 `next-use-sync-external-store` 管理 WebSocket 连接状态（可选，看复杂度）。

### 现有代码改造
- **D-4.15:** `CheckInPageClient.tsx` 的轮询代码（`fetchCount`、`pollRef`）保留为 fallback，新增 WebSocket 连接在活跃时接管。
- **D-4.16:** `submit/route.ts` 签到成功后调用广播管理器推送更新（通过函数调用，不通过 WebSocket 再发 HTTP 请求）。
- **D-4.17:** Dashboard 课程卡片上新增实时签到状态指示器（绿点/数字/进度条）。

### Claude's Discretion
- 是否需要在服务端记录 WebSocket 连接数/心跳超时阈值，由实现者决定。
- 虚拟列表（virtualized list）用简单的 CSS `overflow-y: auto` + 固定行高还是用 `react-window`，由实现者根据 300 人场景评估。
- 自动重连的指数退退避具体参数（初始延迟、最大延迟）。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria
- `CLAUDE.md` — Tech stack (Node.js 22, ws 8.x, Next.js 16)
- `.planning/phases/03-check-in-system/03-CONTEXT.md` — Existing check-in decisions

### Existing Code
- `src/app/(protected)/checkin/[courseId]/components/CheckInPageClient.tsx` — Teacher's check-in page with polling
- `src/lib/checkin-service.ts` — submitAttendance (broadcast trigger point)
- `src/app/api/checkin/submit/route.ts` — Student check-in submission (broadcast hook point)
- `src/app/api/sessions/[sessionId]/route.ts` — Session status endpoint
- `src/app/(protected)/dashboard/page.tsx` — Dashboard
- `src/app/(protected)/dashboard/components/course-card.tsx` — Course card with 发起签到

### Requirements
- **DASH-01:** 签到率百分比实时更新（不刷新页面）
- **DASH-02:** 已签到学生列表实时更新
- **DASH-03:** 未签到学生列表实时更新
- **DASH-04:** 签到计数（已签/总数）即时更新

## Specific Ideas

- 签到看板作为新的独立页面（替代现有的 CheckInPageClient 简单状态面板）
- 在教师签到页面右侧或下方增加实时列表区域
- 顶部显示大号签到率数字 + 进度条
- 左侧是已签到列表（绿色），右侧是未签到列表（灰色/红色）
- 学生签到时的动画效果（新签到者从右侧滑入）
- 当前 CheckInPageClient 的轮询代码保留为 fallback，WS 断开时降级

## Deferred Ideas

- 动态 QR 刷新（防作弊）— v2 需求 ABUSE-01
- 学生端实时看到签到成功 — v2（当前是页面跳转到 success page，非实时）
- 多个老师同时查看同一 session 的实时推送 — v2 场景

---

*Phase: 04-realtime-dashboard*
*Context gathered: 2026-06-01*
