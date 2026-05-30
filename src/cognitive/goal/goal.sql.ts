import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import type { GoalID } from "./schema"

export const GoalTable = sqliteTable(
  "goal",
  {
    id: text().$type<GoalID>().primaryKey(),
    title: text().notNull(),
    description: text(),
    status: text().notNull().default("active"), // active, completed, failed, cancelled
    constraints_json: text({ mode: "json" }).$type<Record<string, unknown>>(),
    priority: text().default("normal"), // low, normal, high, critical
    ...Timestamps,
    time_completed: integer(),
  },
  (table) => [
    index("goal_status_idx").on(table.status),
    index("goal_priority_idx").on(table.priority),
  ],
)
