import { DeviceID, ExecutionRequestID, GoalID } from "@/cognitive/schema"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { CognitiveDeviceService } from "./cognitive/device"
import { CognitiveGoalService } from "./cognitive/goal"
import { CognitiveAgentService } from "./cognitive/agent"
import { CognitiveLLMService } from "@/cognitive/llm/llm"

export const deviceHandlers = HttpApiBuilder.group(InstanceHttpApi, "device", (handlers) =>
  Effect.gen(function* () {
    const deviceSvc = yield* CognitiveDeviceService

    return handlers
      .handle("list", () => deviceSvc.list())
      .handle("register", (ctx) => deviceSvc.register(ctx.payload))
      .handle("createPairingCode", (ctx) => deviceSvc.createPairingCode(ctx.payload))
      .handle("exchangePairingCode", (ctx) => deviceSvc.exchangePairingCode(ctx.payload))
      .handle("poll", (ctx) => deviceSvc.poll(ctx.params.deviceID, ctx.payload))
  }),
)

export const executionHandlers = HttpApiBuilder.group(InstanceHttpApi, "execution", (handlers) =>
  Effect.gen(function* () {
    const deviceSvc = yield* CognitiveDeviceService

    return handlers
      .handle("list", (ctx) => deviceSvc.listExecutionRequests(ctx.query))
      .handle("get", (ctx) => deviceSvc.getExecutionRequest(ctx.params.requestID))
      .handle("create", (ctx) => deviceSvc.createExecutionRequest(ctx.payload))
      .handle("result", (ctx) => deviceSvc.reportExecutionResult(ctx.params.requestID, ctx.payload))
      .handle("cancel", (ctx) => deviceSvc.cancelExecutionRequest(ctx.params.requestID, ctx.payload.reason))
      .handle("retry", (ctx) => deviceSvc.retryExecutionRequest(ctx.params.requestID, ctx.payload.reason))
      .handle("timeoutExpired", (ctx) => deviceSvc.timeoutExpired(ctx.payload.now))
  }),
)

export const goalHandlers = HttpApiBuilder.group(InstanceHttpApi, "goal", (handlers) =>
  Effect.gen(function* () {
    const goalSvc = yield* CognitiveGoalService

    return handlers
      .handle("list", (ctx) => goalSvc.list(ctx.query.status))
      .handle("create", (ctx) => goalSvc.create(ctx.payload))
      .handle("tasks", (ctx) => goalSvc.getTasks(ctx.params.goalID))
  }),
)

export const agentHandlers = HttpApiBuilder.group(InstanceHttpApi, "agent", (handlers) =>
  Effect.gen(function* () {
    const agentSvc = yield* CognitiveAgentService

    return handlers
      .handle("list", () => agentSvc.list())
      .handle("profile", (ctx) => agentSvc.getProfile(ctx.params.role))
  }),
)

export const llmHandlers = HttpApiBuilder.group(InstanceHttpApi, "llm", (handlers) =>
  Effect.gen(function* () {
    const llmSvc = yield* CognitiveLLMService

    return handlers
      .handle("generate", (ctx) => llmSvc.generate(ctx.payload))
  }),
)
