# AI Tools News Aggregator - Documentation

## Обзор проекта

AI Tools News Aggregator — это сервис для автоматического сбора и агрегации новостей от ведущих AI-инструментов. Проект использует Supabase для хранения данных, Gemini для генерации дайджестов, Telegram для публикации и Vercel для деплоя.

## Архитектура

```
ai-tools/
├── api/                    # Vercel serverless functions
│   └── run-daily-digest.ts # Эндпоинт запуска пайплайна (cron 06:00 UTC)
├── scripts/                # Утилитарные скрипты
│   ├── seed-tools.ts       # Наполнение БД инструментами
│   ├── run-pipeline.ts     # Локальный запуск пайплайна
│   ├── generate-digest.ts  # Генерация дайджеста из необработанных новостей
│   ├── publish-telegram.ts # Публикация в Telegram
│   ├── test-parsers.ts     # Тест парсеров
│   ├── test-new-content.ts # Тест URL-based детекции
│   ├── view-digest.ts      # Просмотр дайджеста
│   └── debug-*.ts          # Отладочные скрипты
├── src/
│   ├── config/
│   │   └── env.ts          # Конфигурация окружения
│   ├── db/
│   │   ├── supabaseClient.ts
│   │   ├── types.ts        # TypeScript типы для БД
│   │   └── queries/
│   │       ├── dailyDigest.ts
│   │       ├── newsItems.ts
│   │       └── tools.ts
│   ├── services/
│   │   ├── fetchToolNews.ts     # Получение новостей (legacy)
│   │   ├── newContentChecker.ts # URL-based детекция нового контента
│   │   ├── newsPipeline.ts      # Пайплайн обработки
│   │   ├── digestGenerator.ts   # Генерация дайджеста через LLM
│   │   ├── telegramPublisher.ts # Публикация в Telegram
│   │   ├── llm/                 # LLM провайдеры
│   │   │   ├── index.ts
│   │   │   ├── geminiProvider.ts
│   │   │   └── openaiProvider.ts
│   │   └── parsers/             # Модуль парсеров
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── utils.ts
│   │       ├── rssParser.ts
│   │       ├── htmlBlogParser.ts
│   │       └── customParsers.ts
│   └── utils/
│       └── dates.ts
└── supabase/
    └── migrations/
        ├── 0001_init_schema.sql
        ├── 0002_add_russian_digest.sql
        ├── 0003_add_digest_tracking.sql
        └── 0004_add_last_parsed_tracking.sql
```

## Пайплайн

### Ежедневный запуск (Production)

1. **Vercel Cron** (`api/run-daily-digest.ts`) срабатывает в 06:00 UTC
2. **URL-based детекция** — сравнивает последний распарсенный URL с текущим
3. **Сохранение новостей** — новые статьи сохраняются в `news_items`
4. **Генерация дайджеста** — Gemini 2.5 Flash создаёт summary
5. **Публикация в Telegram** — дайджест отправляется в канал

### URL-based детекция

Вместо фильтрации по дате, система сравнивает URL последней статьи:

- `last_parsed_url` — URL последней обработанной статьи
- `last_parsed_at` — дата последней обработки
- При обнаружении нового URL, все статьи до него считаются новыми

### Ручной запуск

```bash
# Полный пайплайн
npx tsx scripts/run-pipeline.ts

# Только генерация дайджеста (из необработанных новостей)
npx tsx scripts/generate-digest.ts --limit 20

# Генерация и публикация
npx tsx scripts/generate-digest.ts --limit 20 --publish

# Публикация существующего дайджеста
npx tsx scripts/publish-telegram.ts
```

## Парсеры новостей

### Типы парсеров

1. **RSS/Atom Parser** (`rssParser.ts`)
    - Парсит стандартные RSS 2.0 и Atom фиды
    - Автоматически определяется по URL (`/feed`, `/rss`, `.xml`)

2. **HTML Blog Parser** (`htmlBlogParser.ts`)
    - Универсальный парсер для HTML-страниц блогов
    - Использует множество селекторов для поиска статей
    - Является fallback-парсером

3. **Custom Parsers** (`customParsers.ts`)
    - Специализированные парсеры для конкретных сайтов:
        - `OpenAIParser` — openai.com/news
        - `AnthropicParser` — anthropic.com/news
        - `GoogleBlogParser` — blog.google, googleblog.com
        - `MicrosoftBlogParser` — microsoft.com/\*/blog
        - `HuggingFaceParser` — huggingface.co/blog
        - `CursorParser` — cursor.com/blog
        - `ReplitParser` — blog.replit.com
        - `ElevenLabsParser` — elevenlabs.io/blog
        - `N8nParser` — n8n.io/blog
        - `SunoParser` — suno.com/blog
        - `RunwayParser` — runwayml.com/blog
        - `PerplexityParser` — perplexity.ai/hub
        - `XAIParser` — x.ai/blog
        - `DeepLParser` — deepl.com/blog

### Добавление нового парсера

1. Создайте класс, реализующий `NewsParser`:

```typescript
export class MyParser implements NewsParser {
    name = "My Parser";

    canParse(url: string): boolean {
        return url.includes("mysite.com");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        // Логика парсинга
    }
}
```

2. Добавьте в `customParsers.ts` и экспортируйте в `index.ts`

3. Добавьте в массив `getAllParsers()` в `index.ts`

## Конфигурация

### Переменные окружения (.env)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Прокси для обхода блокировок (опционально)
PROXY_URL=http://proxy:port
PROXY_ENABLED=true

# Настройки сетевых запросов
FETCH_TIMEOUT_MS=15000
FETCH_RETRY_COUNT=2
```

### Прокси и сетевые настройки

Система поддерживает HTTP/HTTPS прокси для обхода блокировок:

- **PROXY_ENABLED** — включить/выключить использование прокси
- **PROXY_URL** — адрес прокси-сервера
- **FETCH_TIMEOUT_MS** — таймаут запросов (по умолчанию 15 секунд)
- **FETCH_RETRY_COUNT** — количество повторных попыток при ошибке (по умолчанию 2)

Дополнительно:

- Автоматическая ротация User-Agent для имитации разных браузеров
- Экспоненциальный backoff при повторных попытках (1с, 2с, 4с...)

## Скрипты

```bash
# Запуск полного пайплайна
npx tsx scripts/run-pipeline.ts

# Генерация дайджеста из необработанных новостей
npx tsx scripts/generate-digest.ts --limit 20 --publish

# Публикация в Telegram
npx tsx scripts/publish-telegram.ts

# Тест URL-based детекции
npx tsx scripts/test-new-content.ts

# Просмотр дайджеста
npx tsx scripts/view-digest.ts

# Тестирование парсеров
npx tsx scripts/test-parsers.ts

# Отладка БД
npx tsx scripts/debug-db.ts

# Наполнение БД инструментами
npm run seed

# Применение миграций
npx tsx scripts/run-migrations.ts
```

## База данных

### Таблицы

- `tools` — AI-инструменты (с `last_parsed_url`, `last_parsed_at`)
- `news_items` — новости (с `digest_date` для отслеживания)
- `daily_digests` — ежедневные дайджесты

### Миграции

Миграции находятся в `supabase/migrations/`:

- `0001_init_schema.sql` — базовая схема
- `0002_add_russian_digest.sql` — поле для русского дайджеста
- `0003_add_digest_tracking.sql` — отслеживание включения в дайджест
- `0004_add_last_parsed_tracking.sql` — URL-based детекция

---

# Changelog

## [0.5.0] - 2025-01-19

### Changed

- Рефакторинг проекта — удалены неиспользуемые скрипты
- Перевод на русский убран для экономии токенов LLM
- Все скрипты обновлены для работы только с английским дайджестом

### Removed

- `scripts/test-digest.ts` — устаревший
- `scripts/run-rolling-digest.ts` — дублировал generate-digest.ts
- `scripts/test-fetch-news.ts` — функционал покрыт debug-db.ts

## [0.4.0] - 2025-01-18

### Added

- URL-based детекция нового контента (вместо date-based)
- Миграция `0004_add_last_parsed_tracking.sql`
- Сервис `newContentChecker.ts`
- Скрипт `test-new-content.ts`

### Changed

- `newsPipeline.ts` — добавлена опция `useUrlBasedDetection` (по умолчанию: true)
- Пайплайн теперь сравнивает URL вместо дат

## [0.3.0] - 2025-11-26

### Added

- 9 новых кастомных парсеров:
    - CursorParser, ReplitParser, ElevenLabsParser
    - N8nParser, SunoParser, RunwayParser
    - PerplexityParser, XAIParser, DeepLParser
- Полноценная поддержка прокси через https-proxy-agent
- Retry логика с экспоненциальным backoff
- Ротация User-Agent для обхода блокировок
- Скрипт update-rss-feeds.ts для управления RSS URL в БД
- Настраиваемые параметры: FETCH_TIMEOUT_MS, FETCH_RETRY_COUNT

### Changed

- env.ts расширен новыми опциями конфигурации
- utils.ts улучшен с поддержкой прокси и retry

## [0.2.0] - 2025-11-26

### Added

- Реализована система парсинга новостей:
    - RSS/Atom парсер для фидов
    - Универсальный HTML парсер для блогов
    - Кастомные парсеры для OpenAI, Anthropic, Google, Microsoft, Hugging Face
- Утилиты парсинга: fetchUrl, parseDate, cleanText, normalizeUrl
- Скрипты тестирования: test-parsers.ts, test-fetch-news.ts

### Changed

- fetchToolNews.ts теперь использует реальные парсеры вместо mock-данных

## [0.1.0] - 2025-11-25

### Added

- Начальная структура проекта
- Подключение к Supabase
- Базовый пайплайн сбора новостей (с mock-данными)
- API endpoint для Vercel

---

# Workflow: Обновление документации

> ⚠️ **ВАЖНО**: При каждом добавлении новой функциональности необходимо обновить этот файл!

## Чеклист при добавлении функции:

1. [ ] Обновить раздел "Архитектура" если добавлены новые файлы/папки
2. [ ] Добавить описание в соответствующий раздел документации
3. [ ] Добавить запись в Changelog с датой и описанием
4. [ ] Обновить примеры использования если изменился API

## Формат Changelog:

```markdown
## [версия] - YYYY-MM-DD

### Added

- Новые функции

### Changed

- Изменения в существующем функционале

### Fixed

- Исправления багов

### Removed

- Удаленный функционал
```
