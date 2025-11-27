# 🤖 AI News Aggregator

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**An automated news aggregation and digest generation service for AI tools, with Telegram publishing.**

[🇷🇺 Читать на русском](./README.ru.md)

---

## ✨ Features

- 📰 **Multi-source News Aggregation** — Collects news from 30+ AI tools (ChatGPT, Claude, Midjourney, Copilot, etc.)
- 🔄 **Smart Parsing** — RSS/Atom feeds, HTML blogs, and custom parsers for specific sites
- 🤖 **LLM-powered Digests** — Generates daily summaries using Gemini or OpenAI
- 🌍 **Multilingual** — Supports English and Russian digest generation
- 📱 **Telegram Integration** — Automatic publishing to Telegram channels
- ⏰ **Automated Scheduling** — Daily cron jobs via Vercel
- 🔒 **Deduplication** — Hash-based duplicate detection

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 20+, TypeScript 5.8 |
| **Database** | Supabase (PostgreSQL) |
| **Deployment** | Vercel Serverless Functions |
| **LLM Providers** | Google Gemini, OpenAI GPT-4 |
| **Parsing** | Cheerio, fast-xml-parser |
| **Validation** | Zod |

## 📁 Project Structure

```
ai-news-aggregator/
├── api/
│   └── run-daily-digest.ts     # Vercel serverless endpoint
├── scripts/
│   ├── run-pipeline.ts         # Main pipeline runner
│   ├── publish-telegram.ts     # Telegram publisher
│   ├── test-digest.ts          # Digest testing
│   ├── view-digest.ts          # View generated digests
│   └── ...                     # Other utility scripts
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration (Zod)
│   ├── db/
│   │   ├── supabaseClient.ts   # Supabase client
│   │   ├── types.ts            # TypeScript types
│   │   └── queries/            # Database queries
│   ├── services/
│   │   ├── digestGenerator.ts  # LLM digest generation
│   │   ├── fetchToolNews.ts    # News fetching orchestrator
│   │   ├── newsPipeline.ts     # Main aggregation pipeline
│   │   ├── telegramPublisher.ts # Telegram API integration
│   │   ├── llm/                # LLM providers (Gemini, OpenAI)
│   │   └── parsers/            # News parsers
│   └── utils/
│       └── dates.ts            # Date utilities
└── supabase/
    └── migrations/             # Database migrations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com/) project
- (Optional) Telegram Bot for publishing
- (Optional) Gemini or OpenAI API key for digest generation

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-news-aggregator.git
cd ai-news-aggregator

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Provider (at least one)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHANNEL_ID=-1001234567890

# Optional
NODE_ENV=development
PROXY_URL=http://proxy:port
PROXY_ENABLED=false
```

### Database Setup

Apply migrations in your Supabase SQL Editor:

```bash
# Files located in supabase/migrations/
0001_init_schema.sql
0002_add_russian_digest.sql
0003_add_digest_tracking.sql
```

## 📖 Usage

### CLI Commands

| Command | Description |
|---------|-------------|
| `npx tsx scripts/run-pipeline.ts` | Run full pipeline (fetch news + generate digest) |
| `npx tsx scripts/run-pipeline.ts 2025-01-15` | Process specific date |
| `npx tsx scripts/run-pipeline.ts --force` | Force regenerate digest |
| `npx tsx scripts/publish-telegram.ts` | Publish today's digest to Telegram |
| `npx tsx scripts/publish-telegram.ts --test` | Test Telegram connection |
| `npx tsx scripts/view-digest.ts` | View latest digest |
| `npx tsx scripts/view-digest.ts 2025-01-15` | View specific date's digest |

### API Endpoints

```bash
# Trigger pipeline via HTTP
GET /api/run-daily-digest

# With options
GET /api/run-daily-digest?force=true&telegram=true&date=2025-01-15
```

### Automated Scheduling

The service runs automatically via Vercel Cron at 06:00 UTC daily:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/run-daily-digest?telegram=true",
    "schedule": "0 6 * * *"
  }]
}
```

## 🔧 Parsers

The system includes multiple parser types:

### RSS/Atom Parser
Automatically detects and parses standard feeds.

### HTML Blog Parser
Universal fallback parser using multiple CSS selectors.

### Custom Parsers
Specialized parsers for specific sites:

| Parser | Sites |
|--------|-------|
| OpenAI | openai.com/news |
| Anthropic | anthropic.com/news |
| Google | blog.google, ai.google |
| Microsoft | microsoft.com/*/blog |
| HuggingFace | huggingface.co/blog |
| Cursor | cursor.com/blog |
| ElevenLabs | elevenlabs.io/blog |
| Runway | runwayml.com/blog |
| And more... | 15+ custom parsers |

## 📊 Database Schema

### tools
Stores AI tool metadata (name, category, news URL, RSS feed).

### news_items
Individual news articles with deduplication hash.

### daily_digests
Generated summaries in English and Russian.

## 🔌 Integrations

### Telegram Bot Setup

1. Create bot via [@BotFather](https://t.me/botfather)
2. Add bot as admin to your channel
3. Get channel ID via [@userinfobot](https://t.me/userinfobot)
4. Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID`

### LLM Providers

**Gemini (Recommended)**
- Faster and more cost-effective
- Set `GEMINI_API_KEY`

**OpenAI**
- Alternative provider
- Set `OPENAI_API_KEY`

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel Dashboard.

### Self-hosted

```bash
npm run build
npm start
```

## 📈 Pipeline Architecture

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
│ 1. Fetch active tools from Supabase                             │
│ 2. Parse news from each source (RSS/HTML/Custom)                │
│ 3. Deduplicate and store in database                            │
│ 4. Generate digest via LLM (EN + RU)                            │
│ 5. Publish to Telegram                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the AI community
</p>
