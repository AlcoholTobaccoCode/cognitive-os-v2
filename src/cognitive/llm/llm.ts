import { Context, Effect, Layer } from "effect"
import { LLM, LLMClient } from "@opencode-ai/llm"
import { OpenAI } from "@opencode-ai/llm/providers"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "cognitive-llm" })

export interface CognitiveLLMServiceInterface {
  generate: (params: {
    system?: string
    prompt: string
    model?: string
    provider?: string
  }) => Effect.Effect<{ text: string; usage?: { input: number; output: number } }>
}

export class CognitiveLLMService extends Context.Service<CognitiveLLMServiceInterface>()("@cognitive/LLMService") {}

export const layer = Layer.effect(
  CognitiveLLMService,
  Effect.gen(function* () {
    // Load API key from environment
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || ""

    if (!apiKey) {
      log.warn("No API key found. LLM calls will fail. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.")
    }

    return CognitiveLLMService.of({
      generate: (params) =>
        Effect.gen(function* () {
          const provider = params.provider || "openai"
          const model = params.model || "gpt-4o-mini"

          log.info("generating LLM response", { provider, model })

          // Configure provider
          const openai = OpenAI.configure({ apiKey })

          // Build request
          const request = LLM.request({
            model: openai.chat(model),
            system: params.system || "You are a helpful AI assistant.",
            prompt: params.prompt,
          })

          // Generate response
          const response = yield* LLMClient.generate({
            request,
            toolExecution: "none",
          })

          // Extract text from response
          const text = response.events
            .filter((e) => e.type === "text")
            .map((e) => e.text)
            .join("")

          log.info("LLM response generated", {
            textLength: text.length,
            usage: response.usage,
          })

          return {
            text,
            usage: response.usage
              ? {
                  input: response.usage.inputTokens ?? 0,
                  output: response.usage.outputTokens ?? 0,
                }
              : undefined,
          }
        }).pipe(
          Effect.catchAll((error) => {
            log.error("LLM generation failed", { error })
            return Effect.succeed({ text: `Error: ${error.message}` })
          }),
        ),
    })
  }),
)

export const defaultLayer = layer
