import { Schema } from "effect"

export const DeviceID = Schema.String.pipe(Schema.brand("DeviceID"))
export type DeviceID = typeof DeviceID.Type

export const ExecutionRequestID = Schema.String.pipe(Schema.brand("ExecutionRequestID"))
export type ExecutionRequestID = typeof ExecutionRequestID.Type

export const GoalID = Schema.String.pipe(Schema.brand("GoalID"))
export type GoalID = typeof GoalID.Type

export const TaskID = Schema.String.pipe(Schema.brand("TaskID"))
export type TaskID = typeof TaskID.Type

export const AgentID = Schema.String.pipe(Schema.brand("AgentID"))
export type AgentID = typeof AgentID.Type
