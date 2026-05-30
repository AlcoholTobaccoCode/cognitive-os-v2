import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import type { DeviceID } from "../device/schema"
import type { GoalID } from "../goal/schema"

export const ExecutionRequestTable = sqliteTable(
  "execution_request",
  {
    id: text().primaryKey(),
    goal_id: text().$type<GoalID>(),
    agent_role: text().notNull(),
    kind: text().notNull(), // local_shell, browser, filesystem
    payload_json: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    required_capabilities_json: text({ mode: "json" }).notNull().$type<string[]>(),
    status: text().notNull().default("queued"), // queued, assigned, running, succeeded, failed, cancelled, timeout
    device_id: text().$type<DeviceID>(),
    result_json: text({ mode: "json" }).$type<{
      stdout?: string
      stderr?: string
      artifacts?: Array<{ path: string; sha256?: string; size_bytes?: number }>
    }>(),
    attempt: integer().notNull().default(1),
    parent_request_id: text(),
    deadline_at: integer(), // timestamp for timeout detection
    ...Timestamps,
    time_completed: integer(),
  },
  (table) => [
    index("execution_request_status_idx").on(table.status),
    index("execution_request_device_idx").on(table.device_id),
    index("execution_request_goal_idx").on(table.goal_id),
    index("execution_request_agent_role_idx").on(table.agent_role),
  ],
)
