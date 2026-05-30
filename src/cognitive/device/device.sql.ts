import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import type { DeviceID } from "./schema"

export const DeviceTable = sqliteTable(
  "device",
  {
    id: text().$type<DeviceID>().primaryKey(),
    name: text().notNull(),
    kind: text().notNull(), // macos, windows, linux, browser
    capabilities_json: text({ mode: "json" }).notNull().$type<string[]>(),
    status: text().notNull().default("online"), // online, offline
    last_seen_at: integer(),
    device_token_hash: text(), // hashed token for authentication
    ...Timestamps,
  },
  (table) => [
    index("device_status_idx").on(table.status),
    index("device_kind_idx").on(table.kind),
  ],
)
