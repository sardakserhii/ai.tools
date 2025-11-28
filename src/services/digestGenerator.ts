import { complete } from "./llm/index.js";
import type { NewsItemWithTool } from "../db/types.js";

/**
 * Result of digest generation
 */
export interface DigestResult {
    /** English markdown summary */
    summaryMd: string;
    /** Russian markdown summary (same as English, translation disabled) */
    summaryMdRu: string;
    /** Short English summary (for notifications) */
    summaryShort: string;
    /** List of tools mentioned */
    toolsList: string[];
}

/**
 * System prompt for the digest generator - optimized for Telegram
 */
const SYSTEM_PROMPT = `You are an AI news curator specializing in AI tools and technologies.
Your task is to create a daily digest of AI news optimized for Telegram messenger.

FORMATTING RULES (CRITICAL):
- Use simple formatting that works in Telegram
- Use *bold* for emphasis (single asterisks)
- Use _italic_ for tool names or technical terms
- Use emojis to make sections visually distinct
- NO markdown headers (# ## ###) - use emojis and bold instead
- NO inline links [text](url) - put URLs on separate lines
- Keep paragraphs short (2-3 sentences max)
- Use bullet points with • or - for lists
- Add blank lines between sections for readability

STRUCTURE:
1. Opening line with date and brief hook (1 sentence)
2. Main news items grouped by importance/category
3. Each news item: emoji + bold title + brief description + URL on new line
4. Closing thought or call-to-action

TONE:
- Professional but engaging
- Focus on practical implications
- Be concise - Telegram users scroll quickly`;

/**
 * Generate user prompt with news items
 */
function buildUserPrompt(news: NewsItemWithTool[], date: string): string {
    const newsSection = news
        .map((item, index) => {
            const publishedAt = item.published_at
                ? new Date(item.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                  })
                : "Unknown date";

            return `${index + 1}. [${item.tool_name}] ${item.title}
   URL: ${item.url}
   Published: ${publishedAt}
   ${item.snippet ? `Summary: ${item.snippet}` : ""}`;
        })
        .join("\n\n");

    return `Create a Telegram-optimized AI news digest for ${date}.

NEWS ITEMS:
${newsSection}

Remember: Format for Telegram (no markdown headers, simple formatting, emojis for visual structure).
Output ONLY the digest text, ready to be sent to Telegram.`;
}

/**
 * Extract unique tool names from news items
 */
function extractToolsList(news: NewsItemWithTool[]): string[] {
    const toolsSet = new Set(news.map((item) => item.tool_name));
    return Array.from(toolsSet).sort();
}

/**
 * Parse the LLM response - now simplified since we get direct Telegram-ready output
 */
function parseDigestResponse(content: string): {
    summaryMd: string;
    summaryShort: string;
} {
    const summaryMd = content.trim();

    // Extract first meaningful line for short summary
    const lines = summaryMd
        .split("\n")
        .filter((line) => line.trim().length > 0);
    const firstLine = lines[0] || "";
    const summaryShort =
        firstLine.length > 280
            ? firstLine.substring(0, 277) + "..."
            : firstLine;

    return { summaryMd, summaryShort };
}

/**
 * Options for digest generation
 */
export interface DigestOptions {
    /** Include a "You may have missed" section */
    includeMissedSection?: boolean;
    /** Number of missed news items (for prompt) */
    missedNewsCount?: number;
}

/**
 * Generate a daily digest from news items using the configured LLM provider
 * Now generates only English version to save tokens
 *
 * @param news Array of news items with tool information
 * @param date Date string in YYYY-MM-DD format
 * @param options Additional options for generation
 * @returns Generated digest with markdown summary, short summary, and tools list
 */
export async function generateDailyDigest(
    news: NewsItemWithTool[],
    date: string,
    options: DigestOptions = {}
): Promise<DigestResult> {
    const { includeMissedSection = false, missedNewsCount = 0 } = options;

    console.log(
        `[digestGenerator] Generating digest for ${date} with ${news.length} news items`
    );

    if (news.length === 0) {
        console.log("[digestGenerator] No news items to process");
        return {
            summaryMd: `📰 *AI Tools Digest — ${date}*\n\nNo news items were collected for this date.`,
            summaryMdRu: `📰 *AI Tools Digest — ${date}*\n\nNo news items were collected for this date.`,
            summaryShort: `No AI news updates for ${date}.`,
            toolsList: [],
        };
    }

    let userPrompt = buildUserPrompt(news, date);

    // Add instruction for missed section if needed
    if (includeMissedSection && missedNewsCount > 0) {
        const recentCount = news.length - missedNewsCount;
        userPrompt += `\n\nNOTE: The first ${recentCount} items are recent news. The last ${missedNewsCount} items are important news from earlier that the reader may have missed. 
Please structure the digest with:
1. Main section for recent news
2. A separate "📌 You may have missed" section for the older important items`;
    }

    const toolsList = extractToolsList(news);

    try {
        // Generate English digest (no translation to save tokens)
        console.log("[digestGenerator] Generating English digest...");
        const englishResult = await complete({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            maxTokens: 4000,
            temperature: 0.7,
        });

        console.log(
            `[digestGenerator] Digest received from ${englishResult.provider}/${englishResult.model} (${englishResult.content.length} chars)`
        );

        const { summaryMd, summaryShort } = parseDigestResponse(
            englishResult.content
        );

        // Use English for both fields (translation disabled to save tokens)
        console.log("[digestGenerator] Digest generated successfully");

        return {
            summaryMd,
            summaryMdRu: summaryMd, // Same as English
            summaryShort,
            toolsList,
        };
    } catch (error) {
        console.error("[digestGenerator] LLM API error:", error);
        throw error;
    }
}

/**
 * Generate a digest with custom prompt (for advanced use cases)
 */
export async function generateCustomDigest(
    customSystemPrompt: string,
    customUserPrompt: string
): Promise<string> {
    console.log("[digestGenerator] Generating custom digest");

    const result = await complete({
        messages: [
            { role: "system", content: customSystemPrompt },
            { role: "user", content: customUserPrompt },
        ],
        maxTokens: 2000,
        temperature: 0.7,
    });

    return result.content;
}
