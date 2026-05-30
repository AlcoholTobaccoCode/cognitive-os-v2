# Cognitive OS (基于 opencode)

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
└── server/routes/instance/httpapi/
    ├── groups/cognitive.ts          - API 定义
    └── handlers/
        ├── cognitive.ts             - Handlers 入口
        └── cognitive/
            ├── device.ts            - 设备服务
            ├── goal.ts              - 目标服务
            └── agent.ts             - Agent 服务
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

- **device** - 设备管理
- **execution_request** - 执行请求（支持生命周期）
- **goal** - 目标
- **task** - 任务
- **event** - 事件审计
- **agent_profile** - Agent 配置

## 特性

- 事件审计（所有操作写入 event 表）
- 配对码 + token 鉴权
- 执行生命周期（queued → assigned → succeeded/failed/timeout）
- 取消/重试
- timeout watchdog

## 下一步

1. 集成到 opencode 的 Web UI
2. 添加设备客户端（device-client）
3. 集成 opencode 的 LLM 系统
4. 添加认知图谱
5. 添加 C2C 协作

## License

MIT
