import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const EventTable = sqliteTable(
  "event",
  {
    id: text().primaryKey(),
    type: text().notNull(), // GOAL_CREATED, TASK_CREATED, EXECUTION_REQUEST_CREATED, etc.
    entity_id: text(), // ID of the related entity (goal, task, device, execution_request)
    entity_type: text(), // goal, task, device, execution_request
    data_json: text({ mode: "json" }).$type<Record<string, unknown>>(),
    message: text(),
    ...Timestamps,
  },
  (table) => [
    index("event_type_idx").on(table.type),
    index("event_entity_idx").on(table.entity_type, table.entity_id),
    index("event_time_idx").on(table.time_created),
  ],
)
