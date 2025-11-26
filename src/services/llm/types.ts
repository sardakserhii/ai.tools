/**
 * Common types for LLM providers
 */

export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface LLMCompletionOptions {
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
}

export interface LLMCompletionResult {
    content: string;
    provider: "openai" | "gemini";
    model: string;
    tokensUsed?: number;
}

export interface LLMProvider {
    name: "openai" | "gemini";
    complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
}
