import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useQuery } from "@tanstack/solid-query"
import { Button } from "@opencode-ai/ui/button"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Icon } from "@opencode-ai/ui/icon"
import { useServer } from "@/context/server"

export default function AgentProfile() {
  const server = useServer()
  const [state, setState] = createStore({
    selectedRole: "engineering",
  })

  const agentsQuery = useQuery(() => ({
    queryKey: ["agents"],
    queryFn: async () => {
      const response = await server().api("/agent")
      return response.json()
    },
  }))

  const profileQuery = useQuery(() => ({
    queryKey: ["agent-profile", state.selectedRole],
    queryFn: async () => {
      const response = await server().api(`/agent/${state.selectedRole}/profile`)
      return response.json()
    },
  }))

  const agents = createMemo(() => agentsQuery.data?.agents ?? [])
  const profile = createMemo(() => profileQuery.data)

  const selectedAgent = createMemo(() => agents().find(a => a.role === state.selectedRole))

  const agentColors: Record<string, string> = {
    insight: "#10b981",
    strategy: "#8b5cf6",
    product: "#2563eb",
    engineering: "#06b6d4",
    content: "#ec4899",
    operations: "#f59e0b",
    compliance: "#64748b",
    finance: "#ef4444",
  }

  return (
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Agent Profile</h1>
        <div class="text-sm text-gray-500">
          {selectedAgent()?.name || "Engineering Agent"}
        </div>
      </div>

      {/* Agent 选择 */}
      <div class="flex gap-2">
        <For each={agents()}>
          {(agent) => (
            <Button
              size="sm"
              variant={state.selectedRole === agent.role ? "default" : "outline"}
              onClick={() => setState("selectedRole", agent.role)}
              style={{ "background-color": state.selectedRole === agent.role ? agentColors[agent.role] : undefined }}
            >
              {agent.name}
            </Button>
          )}
        </For>
      </div>

      {/* Agent Profile 详情 */}
      <Show when={profile()} fallback={<Spinner />}>
        <div class="grid grid-cols-2 gap-4">
          {/* 基本信息 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">基本信息</h3>
            <div class="space-y-2">
              <div>
                <div class="text-sm text-gray-500">Agent ID</div>
                <div class="font-medium">{profile()?.agent?.id}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">角色</div>
                <div class="font-medium">{profile()?.agent?.role}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">状态</div>
                <div class="font-medium">{profile()?.agent?.status}</div>
              </div>
            </div>
          </div>

          {/* 健康状态 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">健康状态</h3>
            <div class="space-y-2">
              <div>
                <div class="text-sm text-gray-500">状态</div>
                <div class="font-medium">{profile()?.health?.status || "healthy"}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">指标</div>
                <div class="font-medium">
                  {profile()?.health?.metrics ? JSON.stringify(profile().health.metrics) : "无"}
                </div>
              </div>
            </div>
          </div>

          {/* 边界/约束 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">目标与边界</h3>
            <div class="space-y-2">
              <div>
                <div class="text-sm text-gray-500">摘要</div>
                <div class="font-medium">{profile()?.boundary?.summary || "尚未设置边界"}</div>
              </div>
              <Show when={profile()?.boundary?.mission}>
                <div>
                  <div class="text-sm text-gray-500">使命</div>
                  <div class="font-medium">{profile()?.boundary?.mission}</div>
                </div>
              </Show>
            </div>
          </div>

          {/* 任务统计 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">任务统计</h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded bg-gray-100 p-2 text-center">
                <div class="text-sm text-gray-500">Pending</div>
                <div class="font-bold">{profile()?.task_counts?.pending || 0}</div>
              </div>
              <div class="rounded bg-blue-100 p-2 text-center">
                <div class="text-sm text-gray-500">Running</div>
                <div class="font-bold">{profile()?.task_counts?.running || 0}</div>
              </div>
              <div class="rounded bg-green-100 p-2 text-center">
                <div class="text-sm text-gray-500">Done</div>
                <div class="font-bold">{profile()?.task_counts?.done || 0}</div>
              </div>
              <div class="rounded bg-yellow-100 p-2 text-center">
                <div class="text-sm text-gray-500">Ready</div>
                <div class="font-bold">{profile()?.task_counts?.ready || 0}</div>
              </div>
              <div class="rounded bg-red-100 p-2 text-center">
                <div class="text-sm text-gray-500">Failed</div>
                <div class="font-bold">{profile()?.task_counts?.failed || 0}</div>
              </div>
              <div class="rounded bg-gray-100 p-2 text-center">
                <div class="text-sm text-gray-500">Blocked</div>
                <div class="font-bold">{profile()?.task_counts?.blocked || 0}</div>
              </div>
            </div>
          </div>

          {/* 项目穿透 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">项目穿透</h3>
            <Show when={profile()?.projects?.length > 0} fallback={<div class="text-gray-500">暂无项目</div>}>
              <For each={profile()?.projects?.slice(0, 5)}>
                {(project) => (
                  <div class="border-b py-2 last:border-0">
                    <div class="font-medium">{project.goal_title}</div>
                    <div class="text-sm text-gray-500">
                      {project.task_count} tasks · {project.log_count} logs
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* 最近任务 */}
          <div class="rounded-lg border p-4">
            <h3 class="mb-4 font-semibold">最近任务</h3>
            <Show when={profile()?.tasks?.length > 0} fallback={<div class="text-gray-500">暂无任务</div>}>
              <For each={profile()?.tasks?.slice(0, 5)}>
                {(task) => (
                  <div class="border-b py-2 last:border-0">
                    <div class="font-medium">{task.title}</div>
                    <div class="text-sm text-gray-500">
                      {task.status} · {task.goal_id}
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
