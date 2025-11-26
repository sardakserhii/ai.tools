import { config } from "../../config/env.js";
import { OpenAIProvider } from "./openaiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import type {
    LLMProvider,
    LLMCompletionOptions,
    LLMCompletionResult,
} from "./types.js";

export type {
    LLMProvider,
    LLMCompletionOptions,
    LLMCompletionResult,
    LLMMessage,
} from "./types.js";

/**
 * Get the configured LLM provider
 */
export function getLLMProvider(): LLMProvider {
    const provider = config.llmProvider;

    console.log(`[llm] Using provider: ${provider}`);

    switch (provider) {
        case "openai":
            return new OpenAIProvider();
        case "gemini":
            return new GeminiProvider();
        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

/**
 * Convenience function to complete a prompt using the configured provider
 */
export async function complete(
    options: LLMCompletionOptions
): Promise<LLMCompletionResult> {
    const provider = getLLMProvider();
    return provider.complete(options);
}
