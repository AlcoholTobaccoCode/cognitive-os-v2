import { Context, Effect, Layer } from "effect"
import { eq, and, isNull, asc, desc, inArray, lte } from "drizzle-orm"
import { DeviceID, ExecutionRequestID, GoalID } from "@/cognitive/schema"
import { DeviceTable, ExecutionRequestTable, EventTable } from "@/storage/schema"
import { Database } from "@/storage/db"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "cognitive-device" })

export interface CognitiveDeviceServiceInterface {
  list: () => Effect.Effect<{ devices: any[] }>
  register: (payload: { device_id: DeviceID; name: string; kind: string; capabilities: string[] }) => Effect.Effect<any>
  createPairingCode: (payload: { name: string; kind: string; capabilities: string[] }) => Effect.Effect<{ pairing_code: string }>
  exchangePairingCode: (payload: { pairing_code: string; device_id: DeviceID }) => Effect.Effect<{ device: any; device_token: string }>
  poll: (deviceID: DeviceID, payload: { device_token?: string }) => Effect.Effect<{ request?: any }>
  listExecutionRequests: (query: { status?: string; device_id?: DeviceID; goal_id?: GoalID }) => Effect.Effect<{ requests: any[] }>
  getExecutionRequest: (requestID: ExecutionRequestID) => Effect.Effect<{ request: any; events: any[] }>
  createExecutionRequest: (payload: any) => Effect.Effect<any>
  reportExecutionResult: (requestID: ExecutionRequestID, payload: any) => Effect.Effect<any>
  cancelExecutionRequest: (requestID: ExecutionRequestID, reason?: string) => Effect.Effect<any>
  retryExecutionRequest: (requestID: ExecutionRequestID, reason?: string) => Effect.Effect<any>
  timeoutExpired: (now?: number) => Effect.Effect<{ timed_out_count: number; ids: string[] }>
}

export class CognitiveDeviceService extends Context.Service<CognitiveDeviceServiceInterface>()("@cognitive/DeviceService") {}

const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

export const layer = Layer.effect(
  CognitiveDeviceService,
  Effect.gen(function* () {
    const addEvent = (type: string, entityId?: string, entityType?: string, data?: any, message?: string) => {
      Database.use((db) => {
        db.insert(EventTable).values({
          id: generateId("evt"),
          type,
          entity_id: entityId,
          entity_type: entityType,
          data_json: data,
          message,
        }).run()
      })
    }

    return CognitiveDeviceService.of({
      list: () =>
        Effect.sync(() => {
          return Database.use((db) => {
            const devices = db.select().from(DeviceTable).orderBy(desc(DeviceTable.time_created)).all()
            return { devices }
          })
        }),

      register: (payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            const device = {
              id: payload.device_id,
              name: payload.name,
              kind: payload.kind,
              capabilities_json: payload.capabilities,
              status: "online",
              last_seen_at: now,
              time_created: now,
              time_updated: now,
            }
            db.insert(DeviceTable).values(device).onConflictDoUpdate({
              target: DeviceTable.id,
              set: {
                name: payload.name,
                kind: payload.kind,
                capabilities_json: payload.capabilities,
                status: "online",
                last_seen_at: now,
                time_updated: now,
              },
            }).run()
            addEvent("DEVICE_REGISTERED", payload.device_id, "device", { name: payload.name, kind: payload.kind }, `Device ${payload.name} registered`)
            log.info("device registered", { device_id: payload.device_id, name: payload.name })
            return device
          })
        }),

      createPairingCode: (payload) =>
        Effect.sync(() => {
          const pairingCode = Math.random().toString(36).substring(2, 14)
          // Store pairing code temporarily (in production, use Redis or similar)
          log.info("pairing code created", { pairing_code: pairingCode, name: payload.name })
          return { pairing_code: pairingCode }
        }),

      exchangePairingCode: (payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            const deviceToken = Math.random().toString(36) + Math.random().toString(36)
            const device = {
              id: payload.device_id,
              name: "Local Runner",
              kind: "macos",
              capabilities_json: ["shell"],
              status: "online",
              last_seen_at: now,
              device_token_hash: deviceToken, // TODO: hash this properly
              time_created: now,
              time_updated: now,
            }
            db.insert(DeviceTable).values(device).onConflictDoUpdate({
              target: DeviceTable.id,
              set: {
                status: "online",
                last_seen_at: now,
                device_token_hash: deviceToken,
                time_updated: now,
              },
            }).run()
            addEvent("DEVICE_PAIRED", payload.device_id, "device", { pairing_code: payload.pairing_code }, `Device paired with code`)
            log.info("device paired", { device_id: payload.device_id })
            return { device, device_token: deviceToken }
          })
        }),

      poll: (deviceID, payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            // Update device last seen
            db.update(DeviceTable)
              .set({ last_seen_at: Date.now(), status: "online", time_updated: Date.now() })
              .where(eq(DeviceTable.id, deviceID))
              .run()

            // Find queued request that this device can handle
            const request = db.select()
              .from(ExecutionRequestTable)
              .where(
                and(
                  eq(ExecutionRequestTable.status, "queued"),
                  isNull(ExecutionRequestTable.device_id)
                )
              )
              .orderBy(asc(ExecutionRequestTable.time_created))
              .get()

            if (request) {
              // Assign to this device
              db.update(ExecutionRequestTable)
                .set({ status: "assigned", device_id: deviceID, time_updated: Date.now() })
                .where(eq(ExecutionRequestTable.id, request.id))
                .run()
              addEvent("EXECUTION_REQUEST_ASSIGNED", request.id, "execution_request", { device_id: deviceID }, `Request assigned to ${deviceID}`)
              log.info("request assigned", { request_id: request.id, device_id: deviceID })
              return { request: { ...request, status: "assigned", device_id: deviceID } }
            }
            return { request: undefined }
          })
        }),

      listExecutionRequests: (query) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const requests = db.select()
              .from(ExecutionRequestTable)
              .orderBy(desc(ExecutionRequestTable.time_created))
              .all()
            return { requests }
          })
        }),

      getExecutionRequest: (requestID) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const request = db.select()
              .from(ExecutionRequestTable)
              .where(eq(ExecutionRequestTable.id, requestID))
              .get()
            const events = db.select()
              .from(EventTable)
              .where(
                and(
                  eq(EventTable.entity_id, requestID),
                  eq(EventTable.entity_type, "execution_request")
                )
              )
              .orderBy(asc(EventTable.time_created))
              .all()
            return { request, events }
          })
        }),

      createExecutionRequest: (payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            const request = {
              id: generateId("exec"),
              goal_id: payload.goal_id,
              agent_role: payload.agent_role,
              kind: payload.kind,
              payload_json: payload.payload,
              required_capabilities_json: payload.required_capabilities,
              status: "queued",
              attempt: 1,
              deadline_at: payload.deadline_at,
              time_created: now,
              time_updated: now,
            }
            db.insert(ExecutionRequestTable).values(request).run()
            addEvent("EXECUTION_REQUEST_CREATED", request.id, "execution_request", { agent_role: payload.agent_role, kind: payload.kind }, `Execution request created by ${payload.agent_role}`)
            log.info("execution request created", { request_id: request.id, kind: payload.kind })
            return request
          })
        }),

      reportExecutionResult: (requestID, payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            db.update(ExecutionRequestTable)
              .set({
                status: payload.status,
                result_json: { stdout: payload.stdout, stderr: payload.stderr, artifacts: payload.artifacts },
                time_updated: now,
                time_completed: now,
              })
              .where(eq(ExecutionRequestTable.id, requestID))
              .run()
            const eventType = payload.status === "succeeded" ? "EXECUTION_REQUEST_COMPLETED" : "EXECUTION_REQUEST_FAILED"
            addEvent(eventType, requestID, "execution_request", { stdout: payload.stdout, stderr: payload.stderr }, `Request ${payload.status}`)
            log.info("execution result reported", { request_id: requestID, status: payload.status })
            const request = db.select().from(ExecutionRequestTable).where(eq(ExecutionRequestTable.id, requestID)).get()
            return request
          })
        }),

      cancelExecutionRequest: (requestID, reason) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            db.update(ExecutionRequestTable)
              .set({ status: "cancelled", time_updated: now })
              .where(eq(ExecutionRequestTable.id, requestID))
              .run()
            addEvent("EXECUTION_REQUEST_CANCELLED", requestID, "execution_request", { reason }, `Request cancelled: ${reason || "user request"}`)
            log.info("execution request cancelled", { request_id: requestID, reason })
            const request = db.select().from(ExecutionRequestTable).where(eq(ExecutionRequestTable.id, requestID)).get()
            return request
          })
        }),

      retryExecutionRequest: (requestID, reason) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const original = db.select().from(ExecutionRequestTable).where(eq(ExecutionRequestTable.id, requestID)).get()
            if (!original) throw new Error(`Request ${requestID} not found`)
            const now = Date.now()
            const newRequest = {
              ...original,
              id: generateId("exec"),
              status: "queued",
              device_id: null,
              result_json: null,
              attempt: (original.attempt || 1) + 1,
              parent_request_id: requestID,
              deadline_at: original.deadline_at,
              time_created: now,
              time_updated: now,
              time_completed: null,
            }
            db.insert(ExecutionRequestTable).values(newRequest).run()
            addEvent("EXECUTION_REQUEST_RETRIED", newRequest.id, "execution_request", { parent_request_id: requestID, reason }, `Request retried from ${requestID}`)
            log.info("execution request retried", { new_request_id: newRequest.id, parent_request_id: requestID })
            return newRequest
          })
        }),

      timeoutExpired: (now?: number) =>
        Effect.sync(() => {
          const currentTime = now ?? Date.now()
          return Database.use((db) => {
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
              db.update(ExecutionRequestTable)
                .set({ status: "timeout", time_updated: currentTime })
                .where(eq(ExecutionRequestTable.id, request.id))
                .run()

              addEvent("EXECUTION_REQUEST_TIMED_OUT", request.id, "execution_request", { deadline_at: request.deadline_at, now: currentTime }, `Request timed out`)
              ids.push(request.id)
              log.info("request timed out", { request_id: request.id, deadline_at: request.deadline_at })
            }

            return { timed_out_count: ids.length, ids }
          })
        }),
    })
  }),
)

export const defaultLayer = layer
