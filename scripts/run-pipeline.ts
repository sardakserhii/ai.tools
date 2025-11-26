import { runDailyDigestPipeline } from "../src/services/newsPipeline.js";

async function main() {
    // Парсинг аргументов командной строки
    const args = process.argv.slice(2);
    let targetDate: Date | undefined;
    let forceRegenerate = false;

    for (const arg of args) {
        if (arg === "--force" || arg === "-f") {
            forceRegenerate = true;
        } else if (arg.match(/^\d{4}-\d{2}-\d{2}$/)) {
            targetDate = new Date(arg);
        }
    }

    console.log("🚀 Запуск сбора новостей...\n");
    if (targetDate) {
        console.log(
            `📅 Целевая дата: ${targetDate.toISOString().split("T")[0]}`
        );
    } else {
        console.log("📅 Режим: сбор новостей за вчера");
    }
    if (forceRegenerate) {
        console.log("🔄 Принудительная регенерация дайджеста");
    }
    console.log("");

    const result = await runDailyDigestPipeline({
        targetDate,
        forceRegenerate,
    });

    console.log("\n========================================");
    console.log("📊 Результаты:");
    console.log("========================================");
    console.log(`✅ Успешно: ${result.ok}`);
    console.log(`📰 Всего новостей: ${result.totalNews}`);
    console.log(`🔧 Инструментов обработано: ${result.toolsProcessed}`);

    if (result.digestGenerated) {
        console.log(`📝 Дайджест: сгенерирован через LLM`);
    } else if (result.digestFromCache) {
        console.log(`📝 Дайджест: взят из кэша (LLM не вызывался)`);
    }

    if (result.errors.length > 0) {
        console.log(`\n❌ Ошибки (${result.errors.length}):`);
        result.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    console.log("\n💡 Использование:");
    console.log(
        "   npx tsx scripts/run-pipeline.ts           # Новости за вчера"
    );
    console.log(
        "   npx tsx scripts/run-pipeline.ts 2025-01-15 # Новости за конкретную дату"
    );
    console.log(
        "   npx tsx scripts/run-pipeline.ts --force   # Принудительно регенерировать дайджест"
    );
}

main().catch(console.error);
