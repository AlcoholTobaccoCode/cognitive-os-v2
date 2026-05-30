import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import type { TaskID } from "./schema"
import type { GoalID } from "../goal/schema"

export const TaskTable = sqliteTable(
  "task",
  {
    id: text().$type<TaskID>().primaryKey(),
    goal_id: text().$type<GoalID>().notNull(),
    title: text().notNull(),
    description: text(),
    status: text().notNull().default("pending"), // pending, ready, running, done, failed, blocked
    assigned_agent: text(),
    dependencies_json: text({ mode: "json" }).$type<string[]>(), // task IDs this task depends on
    result_json: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ...Timestamps,
    time_started: integer(),
    time_completed: integer(),
  },
  (table) => [
    index("task_goal_idx").on(table.goal_id),
    index("task_status_idx").on(table.status),
    index("task_assigned_agent_idx").on(table.assigned_agent),
  ],
)
