# Phase 2: Course + Student Management - Discussion Log

**Date:** 2026-05-26
**Mode:** Default interactive

## Areas Discussed

### 1. 课程展示方式
**Options presented:** 卡片网格 / 表格列表 / 紧凑列表
**Selected:** 卡片网格 (Recommended)
**Notes:** 和现有登录页卡片风格一致。

### 2. 学生添加方式
**Options presented:** 逐个手动添加 / 同时加 CSV 导入
**Selected:** 逐个手动添加 (Recommended)
**Notes:** BULK-01 是 v2 需求。

### 3. 课程删除策略
**Options presented:** 级联删除 / 软删除 / 禁止删除
**Selected:** 级联删除 (Recommended)
**Notes:** ON DELETE CASCADE 外键约束。

### 4. 课程页面导航
**Options presented:** Dashboard 内嵌 / 独立页面 / 侧边栏导航
**Selected:** Dashboard 内嵌 (Recommended)
**Notes:** 替换现有 Dashboard 欢迎页，不创建新路径。
