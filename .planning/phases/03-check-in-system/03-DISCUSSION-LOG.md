# Phase 3: Check-In System - Discussion Log

**Date:** 2026-05-26
**Mode:** Default interactive

## Areas Discussed

### 1. 签到会话机制
**Options presented:** 30 分钟超时 / 不自动过期 / 5 分钟超时
**Selected:** 5 分钟超时
**Notes:** 适合课堂快速签到，超时后自动结束。

### 2. 学生扫码方式
**Options presented:** 手机相机扫码 / 浏览器内扫码
**Selected:** 手机相机扫码 (Recommended)
**Notes:** 手机自带相机直接打开 URL，最简方案。

### 3. 签到数据存储
**Options presented:** 两张表 / 简化单表
**Selected:** 两张表 (Recommended)
**Notes:** check_in_sessions + attendance_records，结构清晰，支持后续历史记录查询。

### 4. 手动签到入口
**Options presented:** 学生列表旁 / 签到页面入口
**Selected:** 学生列表旁 (Recommended)
**Notes:** 在学生管理面板中，每个学生旁边有「签到」按钮。
