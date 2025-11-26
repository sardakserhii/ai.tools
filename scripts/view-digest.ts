/**
 * Script to view the daily digest
 * Run with: npx tsx scripts/view-digest.ts [date]
 */

import { getDailyDigest } from "../src/db/queries/dailyDigest.js";
import { formatDateISO } from "../src/utils/dates.js";

async function main() {
    const dateArg = process.argv[2];
    const date = dateArg || formatDateISO(new Date());

    console.log(`\n📰 Fetching digest for: ${date}\n`);

    const digest = await getDailyDigest(date);

    if (!digest) {
        console.log("❌ No digest found for this date.");
        console.log("Run the pipeline first: npx tsx scripts/run-pipeline.ts");
        return;
    }

    console.log("═".repeat(60));
    console.log("📝 DAILY DIGEST");
    console.log("═".repeat(60));
    console.log(digest.summary_md);

    console.log("\n" + "═".repeat(60));
    console.log("📱 SHORT SUMMARY");
    console.log("═".repeat(60));
    console.log(digest.summary_short);

    console.log("\n" + "═".repeat(60));
    console.log("🔧 TOOLS MENTIONED");
    console.log("═".repeat(60));
    console.log(digest.tools_list?.join(", ") || "None");

    console.log("\n" + "═".repeat(60));
    console.log(`📅 Created: ${digest.created_at}`);
    console.log("═".repeat(60) + "\n");
}

main().catch(console.error);
