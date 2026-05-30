import { Effect } from "effect"
import { eq, and, lte, inArray, isNull } from "drizzle-orm"
import { ExecutionRequestTable, EventTable } from "@/storage/schema"
import { Database } from "@/storage/db"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "timeout-watchdog" })

const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

export interface TimeoutWatchdogInterface {
  scanExpired: (now?: number) => Effect.Effect<{ timed_out_count: number; ids: string[] }>
}

export class TimeoutWatchdog extends Effect.Service<TimeoutWatchdogInterface>()("@cognitive/TimeoutWatchdog", {
  effect: Effect.gen(function* () {
    return {
      scanExpired: (now?: number) =>
        Effect.sync(() => {
          const currentTime = now ?? Date.now()
          return Database.use((db) => {
            // Find requests that are queued or assigned and have passed their deadline
            const expired = db.select()
              .from(ExecutionRequestTable)
              .where(
                and(
                  inArray(ExecutionRequestTable.status, ["queued", "assigned"]),
                  lte(ExecutionRequestTable.deadline_at, currentTime),
                )
              )
              .all()

            const ids: string[] = []
            for (const request of expired) {
              // Mark as timeout
              db.update(ExecutionRequestTable)
                .set({ status: "timeout", time_updated: currentTime })
                .where(eq(ExecutionRequestTable.id, request.id))
                .run()

              // Add event
              db.insert(EventTable).values({
                id: generateId("evt"),
                type: "EXECUTION_REQUEST_TIMED_OUT",
                entity_id: request.id,
                entity_type: "execution_request",
                data_json: { deadline_at: request.deadline_at, now: currentTime },
                message: `Request timed out (deadline: ${request.deadline_at}, now: ${currentTime})`,
                time_created: currentTime,
              }).run()

              ids.push(request.id)
              log.info("request timed out", { request_id: request.id, deadline_at: request.deadline_at })
            }

            return { timed_out_count: ids.length, ids }
          })
        }),
    }
  }),
}) {}

export const defaultLayer = TimeoutWatchdog.Default
