# 🤖 AI News Aggregator

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Автоматизированный сервис агрегации новостей и генерации дайджестов для AI-инструментов с публикацией в Telegram.**

[🇬🇧 Read in English](./README.md)

---

## ✨ Возможности

- 📰 **Агрегация из множества источников** — Сбор новостей от 30+ AI-инструментов (ChatGPT, Claude, Midjourney, Copilot и др.)
- 🔄 **Умный парсинг** — RSS/Atom фиды, HTML-блоги и кастомные парсеры для специфичных сайтов
- 🤖 **LLM-дайджесты** — Генерация ежедневных сводок через Gemini или OpenAI
- 🌍 **Мультиязычность** — Поддержка английского и русского языков
- 📱 **Интеграция с Telegram** — Автоматическая публикация в каналы
- ⏰ **Автоматический запуск** — Ежедневные cron-задачи через Vercel
- 🔒 **Дедупликация** — Определение дубликатов по хешу

## 🛠 Технологии

| Категория | Технологии |
|-----------|------------|
| **Runtime** | Node.js 20+, TypeScript 5.8 |
| **База данных** | Supabase (PostgreSQL) |
| **Деплой** | Vercel Serverless Functions |
| **LLM провайдеры** | Google Gemini, OpenAI GPT-4 |
| **Парсинг** | Cheerio, fast-xml-parser |
| **Валидация** | Zod |

## 📁 Структура проекта

```
ai-news-aggregator/
├── api/
│   └── run-daily-digest.ts     # Vercel serverless endpoint
├── scripts/
│   ├── run-pipeline.ts         # Запуск основного пайплайна
│   ├── publish-telegram.ts     # Публикация в Telegram
│   ├── test-digest.ts          # Тестирование дайджеста
│   ├── view-digest.ts          # Просмотр дайджестов
│   └── ...                     # Другие утилиты
├── src/
│   ├── config/
│   │   └── env.ts              # Конфигурация окружения (Zod)
│   ├── db/
│   │   ├── supabaseClient.ts   # Клиент Supabase
│   │   ├── types.ts            # TypeScript типы
│   │   └── queries/            # Запросы к БД
│   ├── services/
│   │   ├── digestGenerator.ts  # Генерация дайджеста через LLM
│   │   ├── fetchToolNews.ts    # Оркестратор получения новостей
│   │   ├── newsPipeline.ts     # Основной пайплайн агрегации
│   │   ├── telegramPublisher.ts # Интеграция с Telegram API
│   │   ├── llm/                # LLM провайдеры (Gemini, OpenAI)
│   │   └── parsers/            # Парсеры новостей
│   └── utils/
│       └── dates.ts            # Утилиты для работы с датами
└── supabase/
    └── migrations/             # Миграции базы данных
```

## 🚀 Быстрый старт

### Требования

- Node.js 20+
- Проект [Supabase](https://supabase.com/)
- (Опционально) Telegram Bot для публикации
- (Опционально) API ключ Gemini или OpenAI для генерации дайджестов

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/ai-news-aggregator.git
cd ai-news-aggregator

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируйте .env своими данными
```

### Переменные окружения

```env
# Обязательные
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM провайдер (хотя бы один)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# Telegram (опционально)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHANNEL_ID=-1001234567890

# Опционально
NODE_ENV=development
PROXY_URL=http://proxy:port
PROXY_ENABLED=false
```

### Настройка базы данных

Примените миграции в SQL Editor вашего Supabase:

```bash
# Файлы находятся в supabase/migrations/
0001_init_schema.sql
0002_add_russian_digest.sql
0003_add_digest_tracking.sql
```

## 📖 Использование

### Команды CLI

| Команда | Описание |
|---------|----------|
| `npx tsx scripts/run-pipeline.ts` | Запуск полного пайплайна (сбор новостей + генерация дайджеста) |
| `npx tsx scripts/run-pipeline.ts 2025-01-15` | Обработка конкретной даты |
| `npx tsx scripts/run-pipeline.ts --force` | Принудительная регенерация дайджеста |
| `npx tsx scripts/publish-telegram.ts` | Публикация сегодняшнего дайджеста в Telegram |
| `npx tsx scripts/publish-telegram.ts --test` | Тест подключения к Telegram |
| `npx tsx scripts/view-digest.ts` | Просмотр последнего дайджеста |
| `npx tsx scripts/view-digest.ts 2025-01-15` | Просмотр дайджеста за конкретную дату |

### API Endpoints

```bash
# Запуск пайплайна через HTTP
GET /api/run-daily-digest

# С параметрами
GET /api/run-daily-digest?force=true&telegram=true&date=2025-01-15
```

### Автоматический запуск

Сервис автоматически запускается через Vercel Cron в 06:00 UTC ежедневно:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/run-daily-digest?telegram=true",
    "schedule": "0 6 * * *"
  }]
}
```

## 🔧 Парсеры

Система включает несколько типов парсеров:

### RSS/Atom парсер
Автоматически определяет и парсит стандартные фиды.

### HTML Blog парсер
Универсальный fallback-парсер с множеством CSS-селекторов.

### Кастомные парсеры
Специализированные парсеры для конкретных сайтов:

| Парсер | Сайты |
|--------|-------|
| OpenAI | openai.com/news |
| Anthropic | anthropic.com/news |
| Google | blog.google, ai.google |
| Microsoft | microsoft.com/*/blog |
| HuggingFace | huggingface.co/blog |
| Cursor | cursor.com/blog |
| ElevenLabs | elevenlabs.io/blog |
| Runway | runwayml.com/blog |
| И другие... | 15+ кастомных парсеров |

## 📊 Схема базы данных

### tools
Метаданные AI-инструментов (название, категория, URL новостей, RSS-фид).

### news_items
Отдельные новостные статьи с хешем для дедупликации.

### daily_digests
Сгенерированные сводки на английском и русском языках.

## 🔌 Интеграции

### Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Добавьте бота администратором в ваш канал
3. Получите ID канала через [@userinfobot](https://t.me/userinfobot)
4. Настройте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHANNEL_ID`

### LLM провайдеры

**Gemini (Рекомендуется)**
- Быстрее и экономичнее
- Установите `GEMINI_API_KEY`

**OpenAI**
- Альтернативный провайдер
- Установите `OPENAI_API_KEY`

## 🚢 Деплой

### Vercel (Рекомендуется)

```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
vercel --prod
```

Настройте переменные окружения в панели управления Vercel.

### Self-hosted

```bash
npm run build
npm start
```

## 📈 Архитектура пайплайна

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Cron (06:00 UTC)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/run-daily-digest                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               runDailyDigestPipeline()                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Получение активных инструментов из Supabase                  │
│ 2. Парсинг новостей из каждого источника (RSS/HTML/Custom)      │
│ 3. Дедупликация и сохранение в базу данных                      │
│ 4. Генерация дайджеста через LLM (EN + RU)                      │
│ 5. Публикация в Telegram                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 📝 Changelog

### [0.3.0] - 2025-11-26
- ✨ Добавлено 9 новых кастомных парсеров
- 🔧 Полноценная поддержка прокси через https-proxy-agent
- 🔄 Retry логика с экспоненциальным backoff
- 🎭 Ротация User-Agent для обхода блокировок

### [0.2.0] - 2025-11-26
- ✨ Система парсинга новостей (RSS, HTML, Custom)
- 🤖 Генерация дайджестов через LLM
- 📱 Интеграция с Telegram

### [0.1.0] - 2025-11-25
- 🎉 Начальная структура проекта
- 🗃️ Подключение к Supabase
- 🔧 Базовый пайплайн сбора новостей

## 🤝 Вклад в проект

Приветствуются Pull Request'ы! Не стесняйтесь предлагать улучшения.

## 📄 Лицензия

Этот проект лицензирован под MIT License — см. файл [LICENSE](LICENSE) для деталей.

---

<p align="center">
  Сделано с ❤️ для AI-сообщества
</p>
