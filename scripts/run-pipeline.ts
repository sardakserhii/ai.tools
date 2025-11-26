import { runDailyDigestPipeline } from "../src/services/newsPipeline.js";

async function main() {
    console.log("🚀 Запуск сбора новостей...\n");

    const result = await runDailyDigestPipeline(new Date());

    console.log("\n========================================");
    console.log("📊 Результаты:");
    console.log("========================================");
    console.log(`✅ Успешно: ${result.ok}`);
    console.log(`📰 Всего новостей: ${result.totalNews}`);
    console.log(`🔧 Инструментов обработано: ${result.toolsProcessed}`);

    if (result.errors.length > 0) {
        console.log(`\n❌ Ошибки (${result.errors.length}):`);
        result.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }
}

main().catch(console.error);
