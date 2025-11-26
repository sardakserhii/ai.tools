import OpenAI from "openai";
import { config } from "../../config/env.js";
import type {
    LLMProvider,
    LLMCompletionOptions,
    LLMCompletionResult,
} from "./types.js";

/**
 * OpenAI LLM Provider
 */
export class OpenAIProvider implements LLMProvider {
    name = "openai" as const;
    private client: OpenAI;
    private model: string;

    constructor() {
        if (!config.openaiApiKey) {
            throw new Error("OPENAI_API_KEY is not configured");
        }

        this.client = new OpenAI({
            apiKey: config.openaiApiKey,
        });
        this.model = config.openaiModel;
    }

    async complete(
        options: LLMCompletionOptions
    ): Promise<LLMCompletionResult> {
        const { messages, maxTokens = 2000, temperature = 0.7 } = options;

        console.log(`[openai] Calling API with model: ${this.model}`);

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            temperature,
            max_tokens: maxTokens,
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        console.log(`[openai] Response received (${content.length} chars)`);

        return {
            content,
            provider: "openai",
            model: this.model,
            tokensUsed: response.usage?.total_tokens,
        };
    }
}
