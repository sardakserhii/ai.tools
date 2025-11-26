import { complete } from "./llm/index.js";
import type { NewsItemWithTool } from "../db/types.js";

/**
 * Result of digest generation
 */
export interface DigestResult {
    summaryMd: string;
    summaryShort: string;
    toolsList: string[];
}

/**
 * System prompt for the digest generator
 */
const SYSTEM_PROMPT = `You are an AI news curator specializing in AI tools and technologies.
Your task is to create a daily digest of AI news in a clear, concise, and engaging format.

Guidelines:
- Write in a professional but accessible tone
- Group news by tool/category when appropriate
- Highlight the most important updates first
- Use markdown formatting for better readability
- Include emojis sparingly to make the digest more engaging
- Focus on what's new and why it matters
- Keep the summary informative but not overwhelming

Output format:
- Start with a brief intro (1-2 sentences about what's notable today)
- List news items with brief descriptions
- End with a short conclusion or takeaway`;

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

    return `Please create a daily AI news digest for ${date}.

Here are today's news items:

${newsSection}

Create:
1. A comprehensive markdown digest (summary_md) - formatted with headers, bullet points, and sections
2. A short summary (summary_short) - 2-3 sentences max, suitable for a tweet or notification`;
}

/**
 * Extract unique tool names from news items
 */
function extractToolsList(news: NewsItemWithTool[]): string[] {
    const toolsSet = new Set(news.map((item) => item.tool_name));
    return Array.from(toolsSet).sort();
}

/**
 * Parse the OpenAI response to extract summaries
 */
function parseDigestResponse(content: string): {
    summaryMd: string;
    summaryShort: string;
} {
    // Try to find explicit sections in the response
    const shortMatch = content.match(
        /(?:summary_short|short summary|tweet|notification)[:\s]*\n*(.+?)(?:\n\n|$)/is
    );

    let summaryShort = "";
    let summaryMd = content;

    if (shortMatch) {
        summaryShort = shortMatch[1].trim();
        // Remove the short summary section from the markdown
        summaryMd = content
            .replace(shortMatch[0], "")
            .trim()
            // Also remove any header that might precede it
            .replace(
                /#+\s*(summary_short|short summary|tweet|notification)\s*\n*/gi,
                ""
            );
    } else {
        // If no explicit short summary, generate one from the first paragraph
        const firstParagraph = content.split("\n\n")[0];
        summaryShort =
            firstParagraph.length > 280
                ? firstParagraph.substring(0, 277) + "..."
                : firstParagraph;
    }

    // Clean up markdown headers for the main summary
    summaryMd = summaryMd
        .replace(/^#+\s*summary_md\s*\n*/im, "")
        .replace(/^#+\s*comprehensive.*digest\s*\n*/im, "")
        .trim();

    return { summaryMd, summaryShort };
}

/**
 * Generate a daily digest from news items using the configured LLM provider
 *
 * @param news Array of news items with tool information
 * @param date Date string in YYYY-MM-DD format
 * @returns Generated digest with markdown summary, short summary, and tools list
 */
export async function generateDailyDigest(
    news: NewsItemWithTool[],
    date: string
): Promise<DigestResult> {
    console.log(
        `[digestGenerator] Generating digest for ${date} with ${news.length} news items`
    );

    if (news.length === 0) {
        console.log("[digestGenerator] No news items to process");
        return {
            summaryMd: `# AI News Digest - ${date}\n\nNo news items were collected for this date.`,
            summaryShort: `No AI news updates for ${date}.`,
            toolsList: [],
        };
    }

    const userPrompt = buildUserPrompt(news, date);
    const toolsList = extractToolsList(news);

    try {
        const result = await complete({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            maxTokens: 2000,
            temperature: 0.7,
        });

        console.log(
            `[digestGenerator] Received response from ${result.provider}/${result.model} (${result.content.length} chars)`
        );

        const { summaryMd, summaryShort } = parseDigestResponse(result.content);

        console.log("[digestGenerator] Digest generated successfully");

        return {
            summaryMd,
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
