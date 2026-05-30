import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useQuery, useMutation } from "@tanstack/solid-query"
import { Button } from "@opencode-ai/ui/button"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Icon } from "@opencode-ai/ui/icon"
import { useServer } from "@/context/server"

export default function DeviceManagement() {
  const server = useServer()
  const [state, setState] = createStore({
    showCreatePairing: false,
    newDeviceName: "",
    newDeviceKind: "macos",
  })

  const devicesQuery = useQuery(() => ({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await server().api("/device")
      return response.json()
    },
  }))

  const executionRequestsQuery = useQuery(() => ({
    queryKey: ["execution-requests"],
    queryFn: async () => {
      const response = await server().api("/execution")
      return response.json()
    },
  }))

  const createPairingMutation = useMutation(() => ({
    mutationFn: async (data: { name: string; kind: string; capabilities: string[] }) => {
      const response = await server().api("/device/pairing-codes", {
        method: "POST",
        body: JSON.stringify(data),
      })
      return response.json()
    },
  }))

  const devices = createMemo(() => devicesQuery.data?.devices ?? [])
  const requests = createMemo(() => executionRequestsQuery.data?.requests ?? [])

  const statusCounts = createMemo(() => {
    const counts: Record<string, number> = {}
    for (const req of requests()) {
      counts[req.status] = (counts[req.status] || 0) + 1
    }
    return counts
  })

  return (
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">设备与执行</h1>
        <Button onClick={() => setState("showCreatePairing", true)}>
          <Icon name="plus" class="mr-2" />
          绑定设备
        </Button>
      </div>

      {/* 状态统计 */}
      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Queued</div>
          <div class="text-2xl font-bold">{statusCounts().queued || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Assigned</div>
          <div class="text-2xl font-bold">{statusCounts().assigned || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Succeeded</div>
          <div class="text-2xl font-bold">{statusCounts().succeeded || 0}</div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-gray-500">Failed</div>
          <div class="text-2xl font-bold">{statusCounts().failed || 0}</div>
        </div>
      </div>

      {/* 在线设备 */}
      <div class="rounded-lg border">
        <div class="border-b p-4 font-semibold">在线设备</div>
        <div class="p-4">
          <Show when={devices().length > 0} fallback={<div class="text-gray-500">暂无设备；启动 device-client 后会显示在这里</div>}>
            <For each={devices()}>
              {(device) => (
                <div class="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <div class="font-medium">{device.name}</div>
                    <div class="text-sm text-gray-500">
                      {device.id} · {device.kind} · {device.status}
                    </div>
                  </div>
                  <div class="text-sm text-gray-500">
                    {device.capabilities_json?.join(", ")}
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* 执行请求 */}
      <div class="rounded-lg border">
        <div class="border-b p-4 font-semibold">执行请求</div>
        <div class="p-4">
          <Show when={requests().length > 0} fallback={<div class="text-gray-500">暂无执行请求</div>}>
            <For each={requests().slice(0, 10)}>
              {(request) => (
                <div class="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <div class="font-medium">
                      {request.kind} · {request.status}
                    </div>
                    <div class="text-sm text-gray-500">
                      {request.id} · {request.agent_role} · {request.device_id || "unassigned"}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Show when={request.status === "queued" || request.status === "assigned"}>
                      <Button size="sm" variant="outline">取消</Button>
                    </Show>
                    <Show when={request.status === "failed" || request.status === "cancelled" || request.status === "timeout"}>
                      <Button size="sm">重试</Button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* 本机 Runner */}
      <div class="rounded-lg border">
        <div class="border-b p-4 font-semibold">本机 Runner</div>
        <div class="p-4">
          <code class="block rounded bg-gray-100 p-2 text-sm">
            python3 apps/device-client/cognitive_device_client.py --server http://127.0.0.1:8711 --device-id local-runner --device-token &lt;token&gt;
          </code>
        </div>
      </div>

      {/* 创建配对码对话框 */}
      <Show when={state.showCreatePairing}>
        <div class="fixed inset-0 flex items-center justify-center bg-black/50">
          <div class="rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold">绑定设备</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium">设备名称</label>
                <input
                  type="text"
                  value={state.newDeviceName}
                  onInput={(e) => setState("newDeviceName", e.target.value)}
                  class="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Local Runner"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">设备类型</label>
                <select
                  value={state.newDeviceKind}
                  onChange={(e) => setState("newDeviceKind", e.target.value)}
                  class="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="macos">macOS</option>
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                  <option value="browser">Browser</option>
                </select>
              </div>
              <div class="flex gap-2">
                <Button onClick={() => setState("showCreatePairing", false)} variant="outline">
                  取消
                </Button>
                <Button onClick={() => {
                  createPairingMutation.mutate({
                    name: state.newDeviceName || "Local Runner",
                    kind: state.newDeviceKind,
                    capabilities: ["shell"],
                  })
                  setState("showCreatePairing", false)
                }}>
                  生成配对码
                </Button>
              </div>
              <Show when={createPairingMutation.data}>
                <div class="mt-4 rounded bg-gray-100 p-4">
                  <div class="font-medium">配对码</div>
                  <code class="block text-sm">{createPairingMutation.data?.pairing_code}</code>
                  <div class="mt-2 text-sm text-gray-500">
                    配对码只显示一次，请复制到设备本机执行。
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
