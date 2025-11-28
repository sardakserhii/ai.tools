/**
 * Test script for the new content checker
 *
 * Usage:
 *   npx tsx scripts/test-new-content.ts           # Check all tools
 *   npx tsx scripts/test-new-content.ts chatgpt   # Check specific tool
 *   npx tsx scripts/test-new-content.ts --dry     # Don't update last_parsed_url
 */

import { getActiveTools, getToolById } from "../src/db/queries/tools.js";
import {
    checkForNewContent,
    checkAndUpdateLastParsed,
} from "../src/services/newContentChecker.js";

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry");
    const toolId = args.find((arg) => !arg.startsWith("--"));

    console.log("\n========================================");
    console.log("🔍 New Content Checker Test");
    console.log(
        `Mode: ${dryRun ? "DRY RUN (no DB updates)" : "LIVE (will update DB)"}`
    );
    console.log("========================================\n");

    let tools;

    if (toolId) {
        const tool = await getToolById(toolId);
        if (!tool) {
            console.error(`❌ Tool not found: ${toolId}`);
            process.exit(1);
        }
        tools = [tool];
    } else {
        tools = await getActiveTools();
    }

    console.log(`Found ${tools.length} tool(s) to check\n`);

    for (const tool of tools) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📦 ${tool.name} (${tool.id})`);
        console.log(`   News URL: ${tool.news_url || "none"}`);
        console.log(`   Last parsed URL: ${tool.last_parsed_url || "never"}`);
        console.log(`   Last parsed at: ${tool.last_parsed_at || "never"}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        if (!tool.news_url) {
            console.log("⏭️  Skipping - no news_url configured\n");
            continue;
        }

        try {
            const result = dryRun
                ? await checkForNewContent(tool)
                : await checkAndUpdateLastParsed(tool, true);

            if (result.hasNewContent) {
                console.log(
                    `\n✅ NEW CONTENT FOUND! (${result.newItems.length} items)`
                );
                console.log(`   Previous URL: ${result.previousUrl || "none"}`);
                console.log(`   Latest URL: ${result.latestUrl}`);
                console.log(`\n   New items:`);
                for (const item of result.newItems) {
                    console.log(`   - ${item.title}`);
                    console.log(`     ${item.url}`);
                    if (item.publishedAt) {
                        console.log(
                            `     📅 ${item.publishedAt.toISOString()}`
                        );
                    }
                    console.log();
                }
            } else {
                console.log(`\n⏸️  No new content (URL unchanged)`);
                console.log(
                    `   Current latest: ${result.latestUrl || "could not fetch"}`
                );
            }
        } catch (error) {
            console.error(
                `\n❌ Error:`,
                error instanceof Error ? error.message : error
            );
        }
    }

    console.log("\n========================================");
    console.log("✅ Test completed");
    console.log("========================================\n");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
