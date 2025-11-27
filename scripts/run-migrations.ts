/**
 * Apply database migrations manually
 * Run this if you can't use supabase CLI
 */
import { supabase } from "../src/db/supabaseClient.js";

const migrations = [
    {
        name: "0002_add_russian_digest",
        sql: `ALTER TABLE daily_digest ADD COLUMN IF NOT EXISTS summary_md_ru TEXT;`,
    },
    {
        name: "0003_add_digest_tracking",
        sql: `
            ALTER TABLE news_items 
            ADD COLUMN IF NOT EXISTS digest_date DATE DEFAULT NULL;
            
            CREATE INDEX IF NOT EXISTS idx_news_items_digest_date 
            ON news_items(digest_date) 
            WHERE digest_date IS NULL;
            
            CREATE INDEX IF NOT EXISTS idx_news_items_published_digest 
            ON news_items(published_at DESC, digest_date);
        `,
    },
];

async function main() {
    console.log("🔄 Running database migrations...\n");

    for (const migration of migrations) {
        console.log(`📦 Applying: ${migration.name}`);

        try {
            // Split into separate statements and run each
            const statements = migration.sql
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            for (const statement of statements) {
                const { error } = await supabase.rpc("exec_sql", {
                    sql_query: statement,
                });

                if (error) {
                    // Try direct query if RPC doesn't exist
                    const result = await supabase
                        .from("_migrations_check")
                        .select("*")
                        .limit(1);
                    if (result.error?.message.includes("does not exist")) {
                        // RPC not available, skip this method
                        throw new Error(
                            "Direct SQL not available - use Supabase dashboard"
                        );
                    }
                    console.error(`   ❌ Error: ${error.message}`);
                }
            }

            console.log(`   ✅ Applied successfully`);
        } catch (error) {
            console.error(
                `   ⚠️ ${error instanceof Error ? error.message : error}`
            );
            console.log(
                "   ℹ️  Please run this SQL in Supabase Dashboard > SQL Editor:"
            );
            console.log(`\n${migration.sql}\n`);
        }
    }

    console.log("\n✅ Migration process completed");
    console.log(
        "\nIf you see errors, please run the SQL manually in Supabase Dashboard."
    );
}

main().catch(console.error);
