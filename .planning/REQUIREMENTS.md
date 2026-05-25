# Requirements: CourseCheckIn (课程签到系统)

**Defined:** 2026-05-25
**Core Value:** 100-300 人同时扫码签到时稳定流畅，老师能实时看到签到进度和明细。

## v1 Requirements

### Authentication

- [x] **AUTH-01**: 老师可以通过账号密码登录
- [x] **AUTH-02**: 老师登录状态跨页面保持

### Course Management

- [x] **COURSE-01**: 老师可以创建课程（课程名、学期）
- [x] **COURSE-02**: 老师可以删除课程
- [x] **COURSE-03**: 老师可以查看课程列表

### Student Management

- [x] **STUDENT-01**: 老师可以手动添加学生到课程（学号、姓名）
- [x] **STUDENT-02**: 老师可以从课程中移除学生

### Check-In Flow

- [x] **CHECKIN-01**: 老师可以发起签到（选择课程，生成二维码）
- [x] **CHECKIN-02**: 学生扫码后输入学号/姓名完成签到
- [x] **CHECKIN-03**: 老师可以手动帮学生签到
- [x] **CHECKIN-04**: 签到会话有超时自动结束

### Real-Time Dashboard

- [ ] **DASH-01**: 实时显示签到率百分比
- [ ] **DASH-02**: 实时显示已签到学生列表
- [ ] **DASH-03**: 实时显示未签到学生列表
- [ ] **DASH-04**: 实时显示签到人数统计（已签/总数）

### History & Reports

- [ ] **HIST-01**: 老师可以查看某次签到的完整记录
- [ ] **HIST-02**: 老师可以查看学生的历史签到记录和缺勤情况

## v2 Requirements

### Bulk Operations

- **BULK-01**: Excel/CSV 批量导入学生
- **BULK-02**: 签到记录导出 Excel

### Anti-Abuse

- **ABUSE-01**: 动态 QR 刷新（10 秒过期）
- **ABUSE-02**: IP/UA 防重复签到检测

### Notifications

- **NOTF-01**: 缺勤自动提醒

## Out of Scope

| Feature | Reason |
|---------|--------|
| GPS/位置校验签到 | 后期可添加，v1 不做 |
| 管理员/教务处角色 | v1 仅老师和学生 |
| 人脸识别签到 | 复杂度高，不属于轻量级签到 |
| 家长通知 | 不适用于本课程场景 |
| 小程序/App 原生端 | Web 优先 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| COURSE-01 | Phase 2 | Complete |
| COURSE-02 | Phase 2 | Complete |
| COURSE-03 | Phase 2 | Complete |
| STUDENT-01 | Phase 2 | Complete |
| STUDENT-02 | Phase 2 | Complete |
| CHECKIN-01 | Phase 3 | Complete |
| CHECKIN-02 | Phase 3 | Complete |
| CHECKIN-03 | Phase 3 | Complete |
| CHECKIN-04 | Phase 3 | Complete |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| HIST-01 | Phase 5 | Pending |
| HIST-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 after initial definition*
