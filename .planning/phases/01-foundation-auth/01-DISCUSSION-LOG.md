# Phase 1: Foundation + Auth - Discussion Log

**Date:** 2026-05-25
**Mode:** Default interactive

## Areas Discussed

### 1. 老师账号初始化
**Options presented:** 注册页面 / 种子脚本 / 首次自注册
**Selected:** 首次自注册 (Recommended)
**Notes:** 首次访问检测 user 表为空，跳转 /setup，创建第一个账号后永久关闭入口。

### 2. 密码哈希方案
**Options presented:** bcrypt / argon2
**Selected:** bcrypt (Recommended)
**Notes:** 使用 bcryptjs 纯 JS 版本，cost factor 10。

### 3. 开发环境数据库
**Options presented:** Docker PostgreSQL / 远程数据库
**Selected:** Docker PostgreSQL (Recommended)
**Notes:** docker compose up 一键启动，生产使用托管 PostgreSQL。

### 4. 登录页设计
**Options presented:** 简单登录页 / 带 Remember Me
**Selected:** 简单登录页 (Recommended)
**Notes:** v1 最小方案，邮箱/用户名 + 密码 + 登录按钮 + 错误提示。
