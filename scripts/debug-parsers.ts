/**
 * Debug script to test parsers directly
 */
import {
    AnthropicParser,
    OpenAIParser,
} from "../src/services/parsers/customParsers.js";

async function main() {
    console.log("Testing Anthropic Parser...\n");

    const anthropicParser = new AnthropicParser();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const tool = { id: "claude", name: "Claude", lang: "en" } as any;

    try {
        const news = await anthropicParser.parse(
            "https://www.anthropic.com/news",
            tool,
            since
        );
        console.log(`Found ${news.length} news items from Anthropic:\n`);
        news.slice(0, 10).forEach((n, i) => {
            console.log(`${i + 1}. ${n.title}`);
            console.log(`   URL: ${n.url}`);
            console.log(
                `   Date: ${n.publishedAt?.toISOString() || "unknown"}`
            );
            console.log();
        });
    } catch (error) {
        console.error("Error:", error);
    }

    console.log("\n---\n");
    console.log("Testing OpenAI Parser...\n");

    const openaiParser = new OpenAIParser();
    const openaiTool = { id: "chatgpt", name: "ChatGPT", lang: "en" } as any;

    try {
        const news = await openaiParser.parse(
            "https://openai.com/news",
            openaiTool,
            since
        );
        console.log(`Found ${news.length} news items from OpenAI:\n`);
        news.slice(0, 10).forEach((n, i) => {
            console.log(`${i + 1}. ${n.title}`);
            console.log(`   URL: ${n.url}`);
            console.log(
                `   Date: ${n.publishedAt?.toISOString() || "unknown"}`
            );
            console.log();
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
