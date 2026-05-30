import { Context, Effect, Layer } from "effect"
import { eq, desc, asc } from "drizzle-orm"
import { GoalID, TaskID } from "@/cognitive/schema"
import { GoalTable, TaskTable, EventTable } from "@/storage/schema"
import { Database } from "@/storage/db"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "cognitive-goal" })

export interface CognitiveGoalServiceInterface {
  list: (status?: string) => Effect.Effect<{ goals: any[] }>
  create: (payload: { title: string; description?: string; constraints?: Record<string, unknown>; priority?: string }) => Effect.Effect<any>
  getTasks: (goalID: GoalID) => Effect.Effect<{ tasks: any[] }>
  createTask: (goalID: GoalID, payload: { title: string; description?: string; assigned_agent?: string; dependencies?: string[] }) => Effect.Effect<any>
}

export class CognitiveGoalService extends Context.Service<CognitiveGoalServiceInterface>()("@cognitive/GoalService") {}

const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

export const layer = Layer.effect(
  CognitiveGoalService,
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

    return CognitiveGoalService.of({
      list: (status) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const goals = db.select()
              .from(GoalTable)
              .orderBy(desc(GoalTable.time_created))
              .all()
            return { goals }
          })
        }),

      create: (payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            const goal = {
              id: generateId("goal"),
              title: payload.title,
              description: payload.description,
              status: "active",
              constraints_json: payload.constraints,
              priority: payload.priority || "normal",
              time_created: now,
              time_updated: now,
            }
            db.insert(GoalTable).values(goal).run()
            addEvent("GOAL_CREATED", goal.id, "goal", { title: payload.title, priority: goal.priority }, `Goal created: ${payload.title}`)
            log.info("goal created", { goal_id: goal.id, title: payload.title })
            return goal
          })
        }),

      getTasks: (goalID) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const tasks = db.select()
              .from(TaskTable)
              .where(eq(TaskTable.goal_id, goalID))
              .orderBy(asc(TaskTable.time_created))
              .all()
            return { tasks }
          })
        }),

      createTask: (goalID, payload) =>
        Effect.sync(() => {
          return Database.use((db) => {
            const now = Date.now()
            const task = {
              id: generateId("task"),
              goal_id: goalID,
              title: payload.title,
              description: payload.description,
              status: "pending",
              assigned_agent: payload.assigned_agent,
              dependencies_json: payload.dependencies,
              time_created: now,
              time_updated: now,
            }
            db.insert(TaskTable).values(task).run()
            addEvent("TASK_CREATED", task.id, "task", { goal_id: goalID, title: payload.title }, `Task created: ${payload.title}`)
            log.info("task created", { task_id: task.id, goal_id: goalID, title: payload.title })
            return task
          })
        }),
    })
  }),
)

export const defaultLayer = layer
