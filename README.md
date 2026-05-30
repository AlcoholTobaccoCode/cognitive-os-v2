# Cognitive OS v2 (基于 opencode)

这是一个基于 [opencode](https://github.com/anomalyco/opencode) 改造的 AI Agent 操作系统。

## 核心概念

Cognitive OS 是一个多 Agent 协作系统，支持：
- 设备管理（device-client 执行）
- 执行请求生命周期
- 目标/任务管理
- Agent Profile
- 事件审计

## 目录结构

```
src/
├── cognitive/
│   ├── schema.ts                    - 类型定义
│   ├── device/
│   │   ├── device.sql.ts            - 设备表
│   │   └── execution-request.sql.ts - 执行请求表
│   ├── goal/
│   │   └── goal.sql.ts              - 目标表
│   ├── task/
│   │   └── task.sql.ts              - 任务表
│   ├── event/
│   │   └── event.sql.ts             - 事件表
│   ├── agent/
│   │   └── agent-profile.sql.ts     - Agent Profile 表
│   └── watchdog/
│       └── timeout.ts               - 超时处理
├── server/routes/instance/httpapi/
│   ├── groups/cognitive.ts          - API 定义
│   └── handlers/
│       ├── cognitive.ts             - Handlers 入口
│       └── cognitive/
│           ├── device.ts            - 设备服务
│           ├── goal.ts              - 目标服务
│           └── agent.ts             - Agent 服务
└── pages/cognitive/
    ├── devices.tsx                  - 设备管理页面
    ├── goals.tsx                    - 目标管理页面
    ├── agent-profile.tsx            - Agent Profile 页面
    └── layout/
        └── sidebar-shell.tsx        - 侧边栏导航

migration/
└── 20260530000000_cognitive_os/    - 数据库迁移
```

## API 端点

### 设备管理
- `GET /device` - 设备列表
- `POST /device/register` - 注册设备
- `POST /device/pairing-codes` - 创建配对码
- `POST /device/exchange-pairing-code` - 交换 token
- `POST /device/:id/poll` - 轮询任务

### 执行请求
- `GET /execution` - 执行请求列表
- `GET /execution/:id` - 请求详情
- `POST /execution` - 创建请求
- `POST /execution/:id/result` - 回传结果
- `POST /execution/:id/cancel` - 取消请求
- `POST /execution/:id/retry` - 重试请求
- `POST /execution/timeout-expired` - 超时扫描

### 目标/任务
- `GET /goal` - 目标列表
- `POST /goal` - 创建目标
- `GET /goal/:id/tasks` - 任务列表

### Agent Profile
- `GET /agent` - Agent 列表
- `GET /agent/:role/profile` - Agent 详情

## 数据模型

- **device** - 设备管理（id, name, kind, capabilities, status, token_hash）
- **execution_request** - 执行请求（id, goal_id, agent_role, kind, payload, status, device_id, result, attempt, deadline）
- **goal** - 目标（id, title, description, status, constraints, priority）
- **task** - 任务（id, goal_id, title, status, assigned_agent, dependencies）
- **event** - 事件审计（id, type, entity_id, entity_type, data, message）
- **agent_profile** - Agent 配置（id, name, role, status, model, boundary, health）

## 状态流转

```
execution_request:
  queued -> assigned -> succeeded
  queued -> assigned -> failed
  queued -> cancelled
  assigned -> timeout
  cancelled/failed/timeout -> retry -> queued(new request)

goal:
  active -> completed
  active -> failed
  active -> cancelled

task:
  pending -> ready -> running -> done
  pending -> ready -> running -> failed
  pending -> blocked
```

## Web UI

- `/cognitive/devices` - 设备管理
  - 设备列表
  - 状态统计
  - 创建配对码
  - 本机 Runner 命令

- `/cognitive/goals` - 目标管理
  - 目标列表
  - 状态统计
  - 优先级统计
  - 创建目标

- `/cognitive/agents` - Agent Profile
  - 8 个 Agent（insight/strategy/product/engineering/content/operations/compliance/finance）
  - 健康状态
  - 任务统计
  - 项目穿透
  - 最近任务

## 特性

- 事件审计（所有操作写入 event 表）
- 配对码 + token 鉴权
- 执行生命周期（queued → assigned → succeeded/failed/timeout）
- 取消/重试
- timeout watchdog

## 运行

### 1. 安装依赖

```bash
bun install
```

### 2. 生成数据库迁移

```bash
cd packages/opencode
bun run db generate --name cognitive_os
```

### 3. 启动后端

```bash
cd packages/opencode
bun run --conditions=browser ./src/index.ts serve --port 4096
```

### 4. 启动前端

```bash
cd packages/app
bun dev -- --port 4444
```

### 5. 访问应用

打开 http://localhost:4444

点击侧边栏底部的 "Cognitive OS" 按钮，进入设备管理页面。

## 设备客户端

设备客户端是用户电脑上的执行器，负责：
- 向 Cognitive OS server 注册设备
- 轮询执行请求
- 在本机受限执行任务
- 回传结果

启动设备客户端：

```bash
python3 apps/device-client/cognitive_device_client.py \
  --server http://127.0.0.1:4096 \
  --device-id local-runner \
  --name "Local Runner" \
  --capability shell
```

带 token 的配对设备：

```bash
python3 apps/device-client/cognitive_device_client.py \
  --server http://127.0.0.1:4096 \
  --device-id local-runner \
  --name "Local Runner" \
  --capability shell \
  --device-token "<从 Web 设备绑定页复制的 device_token>"
```

## 下一步

1. 集成 opencode 的 LLM 系统
2. 添加认知图谱
3. 添加 C2C 协作对话
4. 添加执行请求详情页面
5. 添加更多 capability（browser, filesystem, local-llm）

## License

MIT
