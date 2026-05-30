import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { DeviceID, ExecutionRequestID, GoalID, TaskID } from "../../../cognitive/schema"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"

// Device schemas
const DeviceInfo = Schema.Struct({
  id: DeviceID,
  name: Schema.String,
  kind: Schema.String,
  capabilities_json: Schema.Array(Schema.String),
  status: Schema.String,
  last_seen_at: Schema.optional(Schema.Number),
  time_created: Schema.Number,
})

const DeviceRegisterPayload = Schema.Struct({
  device_id: DeviceID,
  name: Schema.String,
  kind: Schema.String,
  capabilities: Schema.Array(Schema.String),
})

const DevicePairingCodePayload = Schema.Struct({
  name: Schema.String,
  kind: Schema.String,
  capabilities: Schema.Array(Schema.String),
})

const DeviceExchangePayload = Schema.Struct({
  pairing_code: Schema.String,
  device_id: DeviceID,
})

const DeviceTokenPayload = Schema.Struct({
  device_token: Schema.optional(Schema.String),
})

// Execution Request schemas
const ExecutionRequestInfo = Schema.Struct({
  id: ExecutionRequestID,
  goal_id: Schema.optional(GoalID),
  agent_role: Schema.String,
  kind: Schema.String,
  payload_json: Schema.Record(Schema.String, Schema.Unknown),
  required_capabilities_json: Schema.Array(Schema.String),
  status: Schema.String,
  device_id: Schema.optional(DeviceID),
  result_json: Schema.optional(Schema.Struct({
    stdout: Schema.optional(Schema.String),
    stderr: Schema.optional(Schema.String),
    artifacts: Schema.optional(Schema.Array(Schema.Struct({
      path: Schema.String,
      sha256: Schema.optional(Schema.String),
      size_bytes: Schema.optional(Schema.Number),
    }))),
  })),
  attempt: Schema.Number,
  parent_request_id: Schema.optional(ExecutionRequestID),
  deadline_at: Schema.optional(Schema.Number),
  time_created: Schema.Number,
  time_updated: Schema.Number,
  time_completed: Schema.optional(Schema.Number),
})

const ExecutionRequestCreatePayload = Schema.Struct({
  goal_id: Schema.optional(GoalID),
  agent_role: Schema.String,
  kind: Schema.String,
  payload: Schema.Record(Schema.String, Schema.Unknown),
  required_capabilities: Schema.Array(Schema.String),
  deadline_at: Schema.optional(Schema.Number),
})

const ExecutionRequestResultPayload = Schema.Struct({
  device_id: DeviceID,
  status: Schema.String,
  stdout: Schema.optional(Schema.String),
  stderr: Schema.optional(Schema.String),
  artifacts: Schema.optional(Schema.Array(Schema.Struct({
    path: Schema.String,
    sha256: Schema.optional(Schema.String),
    size_bytes: Schema.optional(Schema.Number),
  }))),
  device_token: Schema.optional(Schema.String),
})

// Goal schemas
const GoalInfo = Schema.Struct({
  id: GoalID,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  status: Schema.String,
  constraints_json: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  priority: Schema.String,
  time_created: Schema.Number,
  time_updated: Schema.Number,
  time_completed: Schema.optional(Schema.Number),
})

const GoalCreatePayload = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  constraints: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  priority: Schema.optional(Schema.String),
})

// Task schemas
const TaskInfo = Schema.Struct({
  id: TaskID,
  goal_id: GoalID,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  status: Schema.String,
  assigned_agent: Schema.optional(Schema.String),
  dependencies_json: Schema.optional(Schema.Array(Schema.String)),
  result_json: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  time_created: Schema.Number,
  time_updated: Schema.Number,
  time_started: Schema.optional(Schema.Number),
  time_completed: Schema.optional(Schema.Number),
})

// Event schemas
const EventInfo = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  entity_id: Schema.optional(Schema.String),
  entity_type: Schema.optional(Schema.String),
  data_json: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  message: Schema.optional(Schema.String),
  time_created: Schema.Number,
})

// Agent Profile schemas
const AgentProfileInfo = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  status: Schema.String,
  system_prompt: Schema.optional(Schema.String),
  model: Schema.optional(Schema.Struct({
    id: Schema.String,
    providerID: Schema.String,
    variant: Schema.optional(Schema.String),
  })),
  boundary_json: Schema.optional(Schema.Struct({
    summary: Schema.optional(Schema.String),
    mission: Schema.optional(Schema.String),
    constraints: Schema.optional(Schema.Array(Schema.String)),
    forbidden: Schema.optional(Schema.Array(Schema.String)),
  })),
  health_json: Schema.optional(Schema.Struct({
    status: Schema.optional(Schema.String),
    metrics: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  })),
  time_created: Schema.Number,
  time_updated: Schema.Number,
})

export const CognitiveApi = HttpApi.make("cognitive")
  .add(
    HttpApiGroup.make("device")
      .add(
        HttpApiEndpoint.get("list", "/device", {
          success: Schema.Struct({ devices: Schema.Array(DeviceInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "device.list", summary: "List devices" })),
      )
      .add(
        HttpApiEndpoint.post("register", "/device/register", {
          payload: DeviceRegisterPayload,
          success: DeviceInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "device.register", summary: "Register device" })),
      )
      .add(
        HttpApiEndpoint.post("createPairingCode", "/device/pairing-codes", {
          payload: DevicePairingCodePayload,
          success: Schema.Struct({ pairing_code: Schema.String }),
        }).annotateMerge(OpenApi.annotations({ identifier: "device.createPairingCode", summary: "Create pairing code" })),
      )
      .add(
        HttpApiEndpoint.post("exchangePairingCode", "/device/exchange-pairing-code", {
          payload: DeviceExchangePayload,
          success: Schema.Struct({ device: DeviceInfo, device_token: Schema.String }),
        }).annotateMerge(OpenApi.annotations({ identifier: "device.exchangePairingCode", summary: "Exchange pairing code" })),
      )
      .add(
        HttpApiEndpoint.post("poll", "/device/:deviceID/poll", {
          params: { deviceID: DeviceID },
          payload: DeviceTokenPayload,
          success: Schema.Struct({ request: Schema.optional(ExecutionRequestInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "device.poll", summary: "Poll for execution request" })),
      )
      .annotateMerge(OpenApi.annotations({ title: "device", description: "Device management" }))
      .middleware(InstanceContextMiddleware)
      .middleware(Authorization),
  )
  .add(
    HttpApiGroup.make("execution")
      .add(
        HttpApiEndpoint.get("list", "/execution", {
          query: Schema.Struct({
            status: Schema.optional(Schema.String),
            device_id: Schema.optional(DeviceID),
            goal_id: Schema.optional(GoalID),
          }),
          success: Schema.Struct({ requests: Schema.Array(ExecutionRequestInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.list", summary: "List execution requests" })),
      )
      .add(
        HttpApiEndpoint.get("get", "/execution/:requestID", {
          params: { requestID: ExecutionRequestID },
          success: Schema.Struct({ request: ExecutionRequestInfo, events: Schema.Array(EventInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.get", summary: "Get execution request detail" })),
      )
      .add(
        HttpApiEndpoint.post("create", "/execution", {
          payload: ExecutionRequestCreatePayload,
          success: ExecutionRequestInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.create", summary: "Create execution request" })),
      )
      .add(
        HttpApiEndpoint.post("result", "/execution/:requestID/result", {
          params: { requestID: ExecutionRequestID },
          payload: ExecutionRequestResultPayload,
          success: ExecutionRequestInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.result", summary: "Report execution result" })),
      )
      .add(
        HttpApiEndpoint.post("cancel", "/execution/:requestID/cancel", {
          params: { requestID: ExecutionRequestID },
          payload: Schema.Struct({ reason: Schema.optional(Schema.String) }),
          success: ExecutionRequestInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.cancel", summary: "Cancel execution request" })),
      )
      .add(
        HttpApiEndpoint.post("retry", "/execution/:requestID/retry", {
          params: { requestID: ExecutionRequestID },
          payload: Schema.Struct({ reason: Schema.optional(Schema.String) }),
          success: ExecutionRequestInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.retry", summary: "Retry execution request" })),
      )
      .add(
        HttpApiEndpoint.post("timeoutExpired", "/execution/timeout-expired", {
          payload: Schema.Struct({ now: Schema.optional(Schema.Number) }),
          success: Schema.Struct({ timed_out_count: Schema.Number, ids: Schema.Array(Schema.String) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "execution.timeoutExpired", summary: "Mark expired requests as timeout" })),
      )
      .annotateMerge(OpenApi.annotations({ title: "execution", description: "Execution request management" }))
      .middleware(InstanceContextMiddleware)
      .middleware(Authorization),
  )
  .add(
    HttpApiGroup.make("goal")
      .add(
        HttpApiEndpoint.get("list", "/goal", {
          query: Schema.Struct({
            status: Schema.optional(Schema.String),
          }),
          success: Schema.Struct({ goals: Schema.Array(GoalInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "goal.list", summary: "List goals" })),
      )
      .add(
        HttpApiEndpoint.post("create", "/goal", {
          payload: GoalCreatePayload,
          success: GoalInfo,
        }).annotateMerge(OpenApi.annotations({ identifier: "goal.create", summary: "Create goal" })),
      )
      .add(
        HttpApiEndpoint.get("tasks", "/goal/:goalID/tasks", {
          params: { goalID: GoalID },
          success: Schema.Struct({ tasks: Schema.Array(TaskInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "goal.tasks", summary: "List tasks for goal" })),
      )
      .annotateMerge(OpenApi.annotations({ title: "goal", description: "Goal management" }))
      .middleware(InstanceContextMiddleware)
      .middleware(Authorization),
  )
  .add(
    HttpApiGroup.make("agent")
      .add(
        HttpApiEndpoint.get("list", "/agent", {
          success: Schema.Struct({ agents: Schema.Array(AgentProfileInfo) }),
        }).annotateMerge(OpenApi.annotations({ identifier: "agent.list", summary: "List agent profiles" })),
      )
      .add(
        HttpApiEndpoint.get("profile", "/agent/:role/profile", {
          params: { role: Schema.String },
          success: Schema.Struct({
            agent: AgentProfileInfo,
            task_counts: Schema.Record(Schema.String, Schema.Number),
            projects: Schema.Array(Schema.Struct({
              goal_id: GoalID,
              goal_title: Schema.String,
              task_count: Schema.Number,
              log_count: Schema.Number,
            })),
            tasks: Schema.Array(TaskInfo),
            project_logs: Schema.Array(EventInfo),
            boundary: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
            health: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
          }),
        }).annotateMerge(OpenApi.annotations({ identifier: "agent.profile", summary: "Get agent profile" })),
      )
      .annotateMerge(OpenApi.annotations({ title: "agent", description: "Agent profile management" }))
      .middleware(InstanceContextMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "Cognitive OS API",
      version: "0.0.1",
      description: "Cognitive OS device, execution, goal, task, and agent management",
    }),
  )
