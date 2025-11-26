import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config/env.js";
import type {
    LLMProvider,
    LLMCompletionOptions,
    LLMCompletionResult,
} from "./types.js";

/**
 * Google Gemini LLM Provider
 */
export class GeminiProvider implements LLMProvider {
    name = "gemini" as const;
    private client: GoogleGenerativeAI;
    private model: string;

    constructor() {
        if (!config.geminiApiKey) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        this.client = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = config.geminiModel;
    }

    async complete(
        options: LLMCompletionOptions
    ): Promise<LLMCompletionResult> {
        const { messages, maxTokens = 2000, temperature = 0.7 } = options;

        console.log(`[gemini] Calling API with model: ${this.model}`);

        // Extract system message and combine with user message
        const systemMessage = messages.find((m) => m.role === "system");
        const userMessages = messages.filter((m) => m.role !== "system");

        // Build the full prompt: prepend system instruction to user message
        const lastUserMessage = userMessages[userMessages.length - 1];
        const fullPrompt = systemMessage
            ? `${systemMessage.content}\n\n---\n\n${lastUserMessage.content}`
            : lastUserMessage.content;

        const model = this.client.getGenerativeModel({
            model: this.model,
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature,
            },
        });

        // Use simple generateContent instead of chat for better compatibility
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
            throw new Error("Empty response from Gemini");
        }

        console.log(`[gemini] Response received (${content.length} chars)`);

        return {
            content,
            provider: "gemini",
            model: this.model,
            tokensUsed: response.usageMetadata?.totalTokenCount,
        };
    }
}
