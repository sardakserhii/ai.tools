import { getActiveTools, getAllTools } from "../src/db/queries/tools.js";
import { getTodayNews } from "../src/db/queries/newsItems.js";
import { formatDateISO } from "../src/utils/dates.js";

async function main() {
    console.log("=== Тест получения данных из базы ===\n");

    // 1. Получаем активные инструменты
    console.log("1. Активные инструменты:");
    const activeTools = await getActiveTools();
    if (activeTools.length === 0) {
        console.log("   Нет активных инструментов в базе");
    } else {
        activeTools.forEach((tool) => {
            console.log(`   - ${tool.name} (${tool.id})`);
            console.log(`     URL: ${tool.site_url}`);
            console.log(`     News URL: ${tool.news_url}`);
        });
    }

    // 2. Получаем все инструменты
    console.log("\n2. Все инструменты (включая неактивные):");
    const allTools = await getAllTools();
    if (allTools.length === 0) {
        console.log("   База инструментов пуста");
    } else {
        allTools.forEach((tool) => {
            const status = tool.is_active ? "✓" : "✗";
            console.log(`   [${status}] ${tool.name} (${tool.id})`);
        });
    }

    // 3. Получаем новости за сегодня
    const today = formatDateISO(new Date());
    console.log(`\n3. Новости за ${today}:`);
    const todayNews = await getTodayNews(today);
    if (todayNews.length === 0) {
        console.log("   Новостей за сегодня нет");
    } else {
        todayNews.forEach((news) => {
            console.log(`   - [${news.importance || "?"}] ${news.title}`);
            console.log(`     Tool: ${news.tool_name}`);
            console.log(`     URL: ${news.url}`);
        });
    }

    console.log("\n=== Готово ===");
}

main().catch(console.error);
