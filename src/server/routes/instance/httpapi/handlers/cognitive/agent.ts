import { Context, Effect, Layer } from "effect"
import { eq, desc, count } from "drizzle-orm"
import { AgentProfileTable, TaskTable, EventTable, GoalTable } from "@/storage/schema"
import { Database } from "@/storage/db"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "cognitive-agent" })

export interface CognitiveAgentServiceInterface {
  list: () => Effect.Effect<{ agents: any[] }>
  getProfile: (role: string) => Effect.Effect<{
    agent: any
    task_counts: Record<string, number>
    projects: any[]
    tasks: any[]
    project_logs: any[]
    boundary?: Record<string, unknown>
    health?: Record<string, unknown>
  }>
}

export class CognitiveAgentService extends Context.Service<CognitiveAgentServiceInterface>()("@cognitive/AgentService") {}

const DEFAULT_AGENTS = [
  { id: "insight", name: "洞察 Agent", role: "insight", status: "running" },
  { id: "strategy", name: "策略 Agent", role: "strategy", status: "running" },
  { id: "product", name: "产品 Agent", role: "product", status: "running" },
  { id: "engineering", name: "工程 Agent", role: "engineering", status: "running" },
  { id: "content", name: "内容 Agent", role: "content", status: "running" },
  { id: "operations", name: "运营 Agent", role: "operations", status: "running" },
  { id: "compliance", name: "合规 Agent", role: "compliance", status: "running" },
  { id: "finance", name: "财务 Agent", role: "finance", status: "running" },
]

export const layer = Layer.effect(
  CognitiveAgentService,
  Effect.gen(function* () {
    return CognitiveAgentService.of({
      list: () =>
        Effect.sync(() => {
          return Database.use((db) => {
            // Get agents from database, fall back to defaults
            const dbAgents = db.select().from(AgentProfileTable).all()
            const agents = dbAgents.length > 0 ? dbAgents : DEFAULT_AGENTS.map(a => ({
              ...a,
              system_prompt: null,
              model: null,
              boundary_json: null,
              health_json: { status: "healthy" },
              time_created: Date.now(),
              time_updated: Date.now(),
            }))
            return { agents }
          })
        }),

      getProfile: (role) =>
        Effect.sync(() => {
          return Database.use((db) => {
            // Get agent from database or use default
            let agent = db.select().from(AgentProfileTable).where(eq(AgentProfileTable.role, role)).get()
            if (!agent) {
              const defaultAgent = DEFAULT_AGENTS.find(a => a.role === role) || DEFAULT_AGENTS[3] // default to engineering
              agent = {
                ...defaultAgent,
                system_prompt: null,
                model: null,
                boundary_json: null,
                health_json: { status: "healthy" },
                time_created: Date.now(),
                time_updated: Date.now(),
              }
            }

            // Get task counts for this agent
            const tasks = db.select().from(TaskTable).where(eq(TaskTable.assigned_agent, role)).all()
            const task_counts = {
              pending: tasks.filter(t => t.status === "pending").length,
              ready: tasks.filter(t => t.status === "ready").length,
              running: tasks.filter(t => t.status === "running").length,
              done: tasks.filter(t => t.status === "done").length,
              failed: tasks.filter(t => t.status === "failed").length,
              blocked: tasks.filter(t => t.status === "blocked").length,
            }

            // Get projects (goals) this agent worked on
            const uniqueGoalIds = [...new Set(tasks.map(t => t.goal_id))]
            const projects = uniqueGoalIds.map(goalId => {
              const goal = db.select().from(GoalTable).where(eq(GoalTable.id, goalId)).get()
              const goalTasks = tasks.filter(t => t.goal_id === goalId)
              const events = db.select().from(EventTable)
                .where(eq(EventTable.entity_id, goalId))
                .all()
              return {
                goal_id: goalId,
                goal_title: goal?.title || "Unknown Goal",
                task_count: goalTasks.length,
                log_count: events.length,
              }
            })

            // Get recent events for this agent
            const project_logs = db.select().from(EventTable)
              .where(eq(EventTable.entity_type, "task"))
              .orderBy(desc(EventTable.time_created))
              .limit(10)
              .all()
              .filter(e => {
                const task = tasks.find(t => t.id === e.entity_id)
                return task !== undefined
              })

            return {
              agent,
              task_counts,
              projects,
              tasks: tasks.slice(0, 10), // Return last 10 tasks
              project_logs,
              boundary: agent.boundary_json,
              health: agent.health_json,
            }
          })
        }),
    })
  }),
)

export const defaultLayer = layer
