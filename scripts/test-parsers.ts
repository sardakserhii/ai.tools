import { getActiveTools } from "../src/db/queries/tools.js";
import {
    fetchToolNews,
    validateToolNewsUrl,
} from "../src/services/fetchToolNews.js";
import { findParser } from "../src/services/parsers/index.js";

/**
 * Test script to validate news parsing for all tools with news_url
 */
async function main() {
    console.log("🔍 Testing news parsers for all tools...\n");

    const tools = await getActiveTools();
    const toolsWithNews = tools.filter((t) => t.news_url);

    console.log(
        `Found ${toolsWithNews.length} tools with news_url configured\n`
    );
    console.log("=".repeat(60) + "\n");

    const results: {
        tool: string;
        url: string;
        parser: string;
        status: "success" | "no_articles" | "error";
        count: number;
        error?: string;
    }[] = [];

    // Test a few tools (limit to avoid too many requests)
    const testLimit = 10;
    const toolsToTest = toolsWithNews.slice(0, testLimit);

    for (const tool of toolsToTest) {
        console.log(`\n📰 ${tool.name}`);
        console.log(`   URL: ${tool.news_url}`);

        const parser = findParser(tool.news_url!);
        console.log(`   Parser: ${parser.name}`);

        try {
            // Fetch news from last 30 days for testing
            const since = new Date();
            since.setDate(since.getDate() - 30);

            const news = await fetchToolNews(tool, since);

            if (news.length > 0) {
                console.log(`   ✅ Found ${news.length} articles`);
                news.slice(0, 3).forEach((item) => {
                    console.log(`      - ${item.title}`);
                    if (item.publishedAt) {
                        console.log(
                            `        📅 ${item.publishedAt.toISOString().split("T")[0]}`
                        );
                    }
                });
                results.push({
                    tool: tool.name,
                    url: tool.news_url!,
                    parser: parser.name,
                    status: "success",
                    count: news.length,
                });
            } else {
                console.log(`   ⚠️  No articles found`);
                results.push({
                    tool: tool.name,
                    url: tool.news_url!,
                    parser: parser.name,
                    status: "no_articles",
                    count: 0,
                });
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            console.log(`   ❌ Error: ${errorMsg}`);
            results.push({
                tool: tool.name,
                url: tool.news_url!,
                parser: parser.name,
                status: "error",
                count: 0,
                error: errorMsg,
            });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Summary:\n");

    const success = results.filter((r) => r.status === "success");
    const noArticles = results.filter((r) => r.status === "no_articles");
    const errors = results.filter((r) => r.status === "error");

    console.log(`✅ Success: ${success.length}/${results.length}`);
    console.log(`⚠️  No articles: ${noArticles.length}/${results.length}`);
    console.log(`❌ Errors: ${errors.length}/${results.length}`);

    if (success.length > 0) {
        console.log(
            "\n📈 Total articles found:",
            success.reduce((sum, r) => sum + r.count, 0)
        );
    }

    if (errors.length > 0) {
        console.log("\n❌ Errors:");
        errors.forEach((r) => {
            console.log(`   - ${r.tool}: ${r.error}`);
        });
    }

    console.log("\n" + "=".repeat(60));
    console.log(`\nTested ${testLimit} of ${toolsWithNews.length} tools`);
    console.log(
        `Remaining tools not tested: ${toolsWithNews.length - testLimit}`
    );
}

main().catch(console.error);
