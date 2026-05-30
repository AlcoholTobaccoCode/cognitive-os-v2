import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import type { AgentID } from "./schema"

export const AgentProfileTable = sqliteTable(
  "agent_profile",
  {
    id: text().$type<AgentID>().primaryKey(),
    name: text().notNull(),
    role: text().notNull(), // insight, strategy, product, engineering, content, operations, compliance, finance
    status: text().notNull().default("running"), // running, stopped, error
    system_prompt: text(),
    model: text({ mode: "json" }).$type<{
      id: string
      providerID: string
      variant?: string
    }>(),
    boundary_json: text({ mode: "json" }).$type<{
      summary?: string
      mission?: string
      constraints?: string[]
      forbidden?: string[]
    }>(),
    health_json: text({ mode: "json" }).$type<{
      status?: string
      metrics?: Record<string, unknown>
    }>(),
    ...Timestamps,
  },
  (table) => [
    index("agent_profile_role_idx").on(table.role),
    index("agent_profile_status_idx").on(table.status),
  ],
)
