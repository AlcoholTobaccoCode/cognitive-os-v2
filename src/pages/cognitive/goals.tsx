import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useQuery, useMutation } from "@tanstack/solid-query"
import { Button } from "@opencode-ai/ui/button"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Icon } from "@opencode-ai/ui/icon"
import { useServer } from "@/context/server"

export default function GoalManagement() {
  const server = useServer()
  const [state, setState] = createStore({
    showCreateGoal: false,
    newGoalTitle: "",
    newGoalDescription: "",
    newGoalPriority: "normal",
  })

  const goalsQuery = useQuery(() => ({
    queryKey: ["goals"],
    queryFn: async () => {
      const response = await server().api("/goal")
      return response.json()
    },
  }))

  const createGoalMutation = useMutation(() => ({
    mutationFn: async (data: { title: string; description?: string; priority?: string }) => {
      const response = await server().api("/goal", {
        method: "POST",
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      goalsQuery.refetch()
      setState("showCreateGoal", false)
      setState("newGoalTitle", "")
      setState("newGoalDescription", "")
      setState("newGoalPriority", "normal")
    },
  }))

  const goals = createMemo(() => goalsQuery.data?.goals ?? [])

  const statusCounts = createMemo(() => {
    const counts: Record<string, number> = {}
    for (const goal of goals()) {
      counts[goal.status] = (counts[goal.status] || 0) + 1
    }
    return counts
  })

  const priorityCounts = createMemo(() => {
    const counts: Record<string, number> = {}
    for (const goal of goals()) {
      counts[goal.priority] = (counts[goal.priority] || 0) + 1
    }
    return counts
  })

  return (
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">目标管理</h1>
        <Button onClick={() => setState("showCreateGoal", true)}>
          <Icon name="plus" class="mr-2" />
          创建目标
        </Button>
      </div>

      {/* 状态统计 */}
      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Active</div>
          <div class="text-2xl font-bold">{statusCounts().active || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Completed</div>
          <div class="text-2xl font-bold">{statusCounts().completed || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Failed</div>
          <div class="text-2xl font-bold">{statusCounts().failed || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Total</div>
          <div class="text-2xl font-bold">{goals().length}</div>
        </div>
      </div>

      {/* 优先级统计 */}
      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Critical</div>
          <div class="text-2xl font-bold text-red-500">{priorityCounts().critical || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">High</div>
          <div class="text-2xl font-bold text-orange-500">{priorityCounts().high || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Normal</div>
          <div class="text-2xl font-bold text-blue-500">{priorityCounts().normal || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Low</div>
          <div class="text-2xl font-bold text-gray-500">{priorityCounts().low || 0}</div>
        </div>
      </div>

      {/* 目标列表 */}
      <div class="rounded-lg border">
        <div class="border-b p-4 font-semibold">目标列表</div>
        <div class="p-4">
          <Show when={goals().length > 0} fallback={<div class="text-gray-500">暂无目标</div>}>
            <For each={goals()}>
              {(goal) => (
                <div class="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <div class="font-medium">{goal.title}</div>
                    <div class="text-sm text-gray-500">
                      {goal.description && <div class="mt-1">{goal.description}</div>}
                      <div class="mt-1">
                        状态: {goal.status} · 优先级: {goal.priority}
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `/cognitive/goals/${goal.id}`}>
                      查看
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* 创建目标对话框 */}
      <Show when={state.showCreateGoal}>
        <div class="fixed inset-0 flex items-center justify-center bg-black/50">
          <div class="rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold">创建目标</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium">目标标题</label>
                <input
                  type="text"
                  value={state.newGoalTitle}
                  onInput={(e) => setState("newGoalTitle", e.target.value)}
                  class="mt-1 w-full rounded border px-3 py-2"
                  placeholder="输入目标标题"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">目标描述</label>
                <textarea
                  value={state.newGoalDescription}
                  onInput={(e) => setState("newGoalDescription", e.target.value)}
                  class="mt-1 w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder="输入目标描述"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">优先级</label>
                <select
                  value={state.newGoalPriority}
                  onChange={(e) => setState("newGoalPriority", e.target.value)}
                  class="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div class="flex gap-2">
                <Button onClick={() => setState("showCreateGoal", false)} variant="outline">
                  取消
                </Button>
                <Button onClick={() => {
                  createGoalMutation.mutate({
                    title: state.newGoalTitle,
                    description: state.newGoalDescription,
                    priority: state.newGoalPriority,
                  })
                }}>
                  创建
                </Button>
              </div>
              <Show when={createGoalMutation.isError}>
                <div class="mt-4 rounded bg-red-100 p-4 text-red-700">
                  创建失败: {createGoalMutation.error?.message}
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
