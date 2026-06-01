# CourseCheckIn 课程签到系统

一个轻量级在线课程签到系统。老师发起签到并展示二维码，学生扫码后输入学号/姓名完成签到。支持实时签到看板、历史记录查询、课程与学生的增删管理。面向 100-300 人课堂场景，核心要求是高并发扫码签到不卡顿。

## 功能特性

| 功能 | 说明 |
|------|------|
| 🔐 老师认证 | 首次使用 /setup 创建账号，JWT + HTTP-only Cookie 登录 |
| 📚 课程管理 | 创建/删除课程，每门课独立管理学生名单 |
| 👥 学生管理 | 添加/移除学生，学号+姓名唯一标识 |
| 📱 扫码签到 | 发起签到生成二维码，学生扫码后输入学号/姓名完成签到 |
| 🔄 自动注册 | 首次签到的学生自动加入课程名单 |
| ⏱ 时长设置 | 签到时长可选 1-30 分钟，倒计时自动结束 |
| ⚡ 实时推送 | WebSocket 实时推送签到人数、已签/未签学生列表 |
| 📊 实时看板 | 彩色签到率进度条、已签到/未签到学生双栏列表 |
| 📋 签到历史 | 查看所有历史签到记录及详情 |
| 📈 考勤统计 | 按学生查看出勤率、缺勤次数，课程级考勤总览 |
| ✋ 手动签到 | 老师可在学生花名册中手动标记签到 |

## 技术栈

| 技术 | 用途 |
|------|------|
| [Next.js 16](https://nextjs.org/) | 全栈框架 (UI + API Routes) |
| [React 19](https://react.dev/) | UI 库 |
| [Tailwind CSS 4](https://tailwindcss.com/) | 样式 |
| [PostgreSQL 17](https://www.postgresql.org/) | 数据库 |
| [Drizzle ORM](https://orm.drizzle.team/) | 数据库 ORM |
| [ws](https://github.com/websockets/ws) | WebSocket 实时通信 |
| [JWT (jose)](https://github.com/panva/jose) | 认证 |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 密码哈希 |

## 快速开始

### 前置要求

- Node.js 22+
- PostgreSQL 17+ (推荐 Docker)

### 1. 启动数据库

```bash
docker run -d \
  --name coursecheckin-db \
  -e POSTGRES_USER=coursecheckin \
  -e POSTGRES_PASSWORD=coursecheckin \
  -e POSTGRES_DB=coursecheckin \
  -p 5432:5432 \
  postgres:17-alpine
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，按需修改数据库连接等配置
```

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
npm run db:push
```

### 5. 启动开发服务器

```bash
# 方式一：仅 HTTP（适合前端开发）
npm run dev

# 方式二：HTTP + WebSocket（完整功能，推荐）
npm run dev:server
```

访问 `http://localhost:3000/setup` 创建第一个账号。

### 生产部署

```bash
npm run build
npm run start        # 仅 HTTP
# 或
NODE_ENV=production node server.js  # HTTP + WebSocket
```

## 项目结构

```
src/
├── app/
│   ├── (public)/         # 公开页面
│   │   ├── login/        # 登录页
│   │   └── setup/        # 首次设置页
│   ├── (protected)/      # 需认证页面
│   │   └── dashboard/    # 仪表盘（课程列表、卡片）
│   ├── api/              # API 路由
│   │   ├── auth/         # 登录/登出
│   │   ├── courses/      # 课程 CRUD、学生管理、签到历史、考勤
│   │   ├── sessions/     # 签到会话创建、查询、结束
│   │   ├── checkin/      # 学生签到提交
│   │   └── students/     # 学生考勤查询
│   ├── checkin/          # 学生签到页面（公开）
│   └── layout.tsx
├── db/
│   └── schema/           # Drizzle 数据库表定义
│       ├── users.ts      # 用户表
│       ├── courses.ts    # 课程表
│       ├── students.ts   # 学生表
│       └── checkin.ts    # 签到会话 + 签到记录表
└── lib/
    ├── auth.ts           # JWT 认证
    ├── checkin-service.ts# 签到业务逻辑
    ├── ws-broadcast.ts   # WebSocket 广播管理器
    ├── ws-types.ts       # WebSocket 消息协议
    └── use-checkin-session.ts  # WebSocket React Hook
```

## 页面路由

| 路由 | 说明 | 权限 |
|------|------|------|
| `/login` | 老师登录 | 公开 |
| `/setup` | 首次创建账号 | 公开 |
| `/dashboard` | 课程仪表盘 | 需登录 |
| `/checkin?session=xxx` | 学生签到表单 | 公开 |
| `/checkin/success` | 签到成功页 | 公开 |
| `/checkin/[courseId]` | 老师签到管理页（二维码、看板） | 需登录 |
| `/dashboard/courses/[id]/history` | 签到历史列表 | 需登录 |
| `/dashboard/courses/[id]/history/[sessionId]` | 签到详情页 | 需登录 |
| `/dashboard/courses/[id]/attendance` | 考勤总览 | 需登录 |
| `/dashboard/courses/[id]/attendance/[studentId]` | 学生考勤详情 | 需登录 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/setup` | 首次创建账号 |
| GET | `/api/courses` | 课程列表 |
| POST | `/api/courses` | 创建课程 |
| DELETE | `/api/courses/[id]` | 删除课程 |
| GET | `/api/courses/[id]/students` | 学生列表 |
| POST | `/api/courses/[id]/students` | 添加学生 |
| DELETE | `/api/courses/[id]/students/[studentId]` | 移除学生 |
| GET | `/api/courses/[id]/active-session` | 查询活跃签到会话 |
| GET | `/api/courses/[id]/sessions` | 签到历史列表 |
| GET | `/api/courses/[id]/attendance-summary` | 课程考勤汇总 |
| POST | `/api/sessions` | 创建签到会话 |
| GET | `/api/sessions/[sessionId]` | 签到会话状态 |
| PATCH | `/api/sessions/[sessionId]` | 结束签到 |
| POST | `/api/sessions/[sessionId]/manual-checkin` | 手动签到 |
| POST | `/api/checkin/submit` | 学生提交签到 |
| GET | `/api/students/[studentId]/attendance` | 学生考勤记录 |
| GET | `/api/checkin/[token]` | 查询签到会话（学生端） |

## 开发环境

### 局域网测试

在 `.env` 中设置 `NEXT_PUBLIC_BASE_URL` 指向你的局域网 IP：

```env
NEXT_PUBLIC_BASE_URL=http://192.168.x.x:3000
```

老师用 `localhost:3000/dashboard` 操作，手机上用 `http://192.168.x.x:3000/checkin?session=xxx` 扫码签到。

## License

MIT
