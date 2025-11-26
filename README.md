# AI News Aggregator

An automated news aggregation service for AI tools, built with TypeScript, Supabase (PostgreSQL), and deployed on Vercel serverless functions.

## Overview

This service aggregates news and updates from various AI tools (ChatGPT, Claude, Midjourney, GitHub Copilot, DALL-E, etc.) into a centralized database. The system is designed to:

1. Fetch updates from AI tool news sources
2. Parse and extract relevant news items
3. Classify news importance using LLM (coming soon)
4. Store structured data in Supabase PostgreSQL
5. Generate daily digest summaries (coming soon)

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel Serverless Functions
- **Key Libraries**:
    - `@supabase/supabase-js` - Supabase client
    - `zod` - Runtime type validation
    - `dayjs` - Date manipulation
    - `dotenv` - Environment configuration

## Project Structure

```
├── api/
│   └── run-daily-digest.ts    # Vercel serverless endpoint
├── src/
│   ├── config/
│   │   └── env.ts             # Environment configuration with Zod validation
│   ├── db/
│   │   ├── supabaseClient.ts  # Supabase client initialization
│   │   ├── types.ts           # TypeScript types for DB entities
│   │   └── queries/
│   │       ├── tools.ts       # Tool queries
│   │       ├── newsItems.ts   # News item queries
│   │       └── dailyDigest.ts # Daily digest queries
│   ├── services/
│   │   ├── newsPipeline.ts    # Main aggregation pipeline
│   │   └── fetchToolNews.ts   # News fetcher (mock implementation)
│   └── utils/
│       └── dates.ts           # Date utility functions
├── supabase/
│   └── migrations/
│       └── 0001_init_schema.sql  # Database schema
├── package.json
├── tsconfig.json
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variables template
└── .gitignore
```

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm (or pnpm if available)
- A Supabase project ([create one here](https://supabase.com/dashboard))

### Setup

1. **Clone and install dependencies**:

    ```bash
    npm install
    ```

2. **Configure environment variables**:

    Copy `.env.example` to `.env` and fill in your Supabase credentials:

    ```bash
    cp .env.example .env
    ```

    Edit `.env`:

    ```
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_ANON_KEY=your-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    NODE_ENV=development
    ```

    > ⚠️ **Important**: Never commit the `.env` file or expose the `SUPABASE_SERVICE_ROLE_KEY` in client-side code.

3. **Apply database migrations**:

    Go to your Supabase Dashboard → SQL Editor, and run the contents of:

    ```
    supabase/migrations/0001_init_schema.sql
    ```

    This creates the `tools`, `news_items`, and `daily_digest` tables with sample data.

4. **Run the pipeline locally**:

    ```bash
    npm run dev
    ```

    This executes the daily digest pipeline with mock data.

### Available Scripts

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Run the pipeline locally with tsx |
| `npm run build`     | Compile TypeScript to JavaScript  |
| `npm run typecheck` | Run TypeScript type checking      |
| `npm run lint`      | Run ESLint                        |
| `npm start`         | Run compiled JavaScript           |

## Deployment

### Vercel Setup

1. **Install Vercel CLI** (optional):

    ```bash
    npm i -g vercel
    ```

2. **Link to Vercel project**:

    ```bash
    vercel
    ```

3. **Configure environment variables** in Vercel Dashboard:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `NODE_ENV=production`

4. **Deploy**:
    ```bash
    vercel --prod
    ```

### Cron Job

The `vercel.json` includes a cron job configuration that runs the pipeline daily at 06:00 UTC:

```json
{
    "crons": [
        {
            "path": "/api/run-daily-digest",
            "schedule": "0 6 * * *"
        }
    ]
}
```

> Note: Vercel Cron Jobs require a Pro plan or higher.

### Manual Trigger

You can manually trigger the pipeline via HTTP:

```bash
curl https://your-project.vercel.app/api/run-daily-digest
```

Response:

```json
{
    "ok": true,
    "totalNews": 6,
    "toolsProcessed": 5,
    "date": "2024-01-15",
    "timestamp": "2024-01-15T06:00:00.000Z"
}
```

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    /api/run-daily-digest                        │
│                    (Vercel Serverless Function)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    runDailyDigestPipeline()                     │
│                    (src/services/newsPipeline.ts)               │
├─────────────────────────────────────────────────────────────────┤
│ 1. getActiveTools() → Fetch active AI tools from Supabase      │
│ 2. fetchToolNews() → Fetch news for each tool (mock/MCP)       │
│ 3. transformNewsItems() → Add hashes, prepare for DB           │
│ 4. insertNewsItems() → Upsert to Supabase with deduplication   │
│ 5. [TODO] classifyWithLLM() → Rate importance with AI          │
│ 6. [TODO] generateDigest() → Create daily summary              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### tools

| Column     | Type        | Description                       |
| ---------- | ----------- | --------------------------------- |
| id         | TEXT (PK)   | Tool identifier (e.g., 'chatgpt') |
| name       | TEXT        | Display name                      |
| category   | TEXT        | Category (llm, image-gen, etc.)   |
| site_url   | TEXT        | Main website URL                  |
| news_url   | TEXT        | News/blog URL to scrape           |
| lang       | TEXT        | Primary language (default: 'en')  |
| is_active  | BOOLEAN     | Include in aggregation            |
| created_at | TIMESTAMPTZ | Creation timestamp                |
| updated_at | TIMESTAMPTZ | Last update timestamp             |

### news_items

| Column       | Type           | Description             |
| ------------ | -------------- | ----------------------- |
| id           | BIGSERIAL (PK) | Auto-increment ID       |
| tool_id      | TEXT (FK)      | Reference to tools.id   |
| title        | TEXT           | News headline           |
| url          | TEXT           | Original news URL       |
| published_at | TIMESTAMPTZ    | Original publish date   |
| raw_content  | TEXT           | Full scraped content    |
| snippet      | TEXT           | Short summary           |
| importance   | TEXT           | 'high', 'medium', 'low' |
| tags         | TEXT[]         | Categorization tags     |
| hash         | TEXT (UNIQUE)  | Deduplication hash      |

### daily_digest

| Column        | Type           | Description           |
| ------------- | -------------- | --------------------- |
| id            | BIGSERIAL (PK) | Auto-increment ID     |
| date          | DATE (UNIQUE)  | Digest date           |
| summary_md    | TEXT           | Full markdown summary |
| summary_short | TEXT           | TL;DR summary         |
| tools_list    | TEXT[]         | Tools covered         |

## Future Enhancements

- [ ] Real web scraping with MCP site-news integration
- [ ] LLM-based news importance classification
- [ ] Automated daily digest generation
- [ ] Email/Telegram notifications
- [ ] RSS feed output
- [ ] Admin dashboard

## License

MIT
