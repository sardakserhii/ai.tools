/**
 * Seed script for populating the tools table
 * Run with: npx tsx scripts/seed-tools.ts
 */

import { supabase } from "../src/db/supabaseClient.js";

interface ToolSeed {
    id: string;
    name: string;
    category: string;
    site_url: string | null;
    news_url: string | null;
    lang: string;
    is_active: boolean;
}

const tools: ToolSeed[] = [
    // LLM Assistants
    {
        id: "chatgpt",
        name: "ChatGPT",
        category: "llm_assistant",
        site_url: "https://chatgpt.com",
        news_url: "https://openai.com/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "claude",
        name: "Claude",
        category: "llm_assistant",
        site_url: "https://claude.ai",
        news_url: "https://www.anthropic.com/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "google-gemini",
        name: "Google Gemini",
        category: "llm_assistant",
        site_url: "https://gemini.google.com",
        news_url: "https://blog.google/products/gemini/",
        lang: "en",
        is_active: true,
    },
    {
        id: "grok",
        name: "Grok",
        category: "llm_assistant",
        site_url: "https://x.ai",
        news_url: "https://x.ai/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "microsoft-copilot",
        name: "Microsoft Copilot",
        category: "llm_assistant",
        site_url: "https://copilot.microsoft.com",
        news_url: "https://www.microsoft.com/en-us/microsoft-copilot/blog/",
        lang: "en",
        is_active: true,
    },
    {
        id: "deepseek",
        name: "DeepSeek",
        category: "llm_assistant",
        site_url: "https://www.deepseek.com/en",
        news_url: "https://deepseek.ai/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "poe",
        name: "Poe",
        category: "llm_assistant",
        site_url: "https://poe.com",
        news_url: "https://poe.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "character-ai",
        name: "Character.ai",
        category: "llm_assistant",
        site_url: "https://character.ai",
        news_url: "https://blog.character.ai/",
        lang: "en",
        is_active: true,
    },
    {
        id: "janitor-ai",
        name: "Janitor AI",
        category: "llm_assistant",
        site_url: "https://janitorai.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },

    // Writing & Search
    {
        id: "perplexity",
        name: "Perplexity",
        category: "writing_search",
        site_url: "https://www.perplexity.ai",
        news_url: "https://www.perplexity.ai/hub",
        lang: "en",
        is_active: true,
    },
    {
        id: "you-com",
        name: "you.com",
        category: "writing_search",
        site_url: "https://you.com",
        news_url: "https://about.you.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "consensus",
        name: "Consensus",
        category: "writing_search",
        site_url: "https://consensus.app",
        news_url: "https://consensus.app/home/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "deepl",
        name: "DeepL",
        category: "writing_search",
        site_url: "https://www.deepl.com",
        news_url: "https://www.deepl.com/en/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "quillbot",
        name: "QuillBot",
        category: "writing_search",
        site_url: "https://quillbot.com",
        news_url: "https://quillbot.com/blog/",
        lang: "en",
        is_active: true,
    },
    {
        id: "grammarly",
        name: "Grammarly",
        category: "writing_search",
        site_url: "https://www.grammarly.com",
        news_url: "https://www.grammarly.com/blog/",
        lang: "en",
        is_active: true,
    },
    {
        id: "gamma",
        name: "Gamma",
        category: "writing_search",
        site_url: "https://gamma.app",
        news_url: "https://gamma.app/insights",
        lang: "en",
        is_active: true,
    },

    // API Multi
    {
        id: "deepai",
        name: "DeepAI",
        category: "api_multi",
        site_url: "https://deepai.org",
        news_url: null,
        lang: "en",
        is_active: true,
    },

    // Coding
    {
        id: "github-copilot",
        name: "GitHub Copilot",
        category: "coding",
        site_url: "https://github.com/features/copilot",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "cursor",
        name: "Cursor",
        category: "coding",
        site_url: "https://cursor.com",
        news_url: "https://cursor.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "replit",
        name: "Replit",
        category: "coding",
        site_url: "https://replit.com",
        news_url: "https://blog.replit.com",
        lang: "en",
        is_active: true,
    },
    {
        id: "codeium",
        name: "Codeium",
        category: "coding",
        site_url: "https://codeium.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "windsurf",
        name: "Windsurf",
        category: "coding",
        site_url: null,
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "aider",
        name: "Aider",
        category: "coding",
        site_url: "https://aider.chat",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "continue",
        name: "Continue",
        category: "coding",
        site_url: "https://continue.dev",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "google-ai-studio",
        name: "Google AI Studio",
        category: "coding",
        site_url: "https://ai.google.dev/aistudio",
        news_url:
            "https://developers.googleblog.com/en/search/?product_categories=Google+AI+Studio",
        lang: "en",
        is_active: true,
    },
    {
        id: "hugging-face",
        name: "Hugging Face",
        category: "coding",
        site_url: "https://huggingface.co",
        news_url: "https://huggingface.co/blog",
        lang: "en",
        is_active: true,
    },

    // Image
    {
        id: "midjourney",
        name: "Midjourney",
        category: "image",
        site_url: "https://www.midjourney.com",
        news_url: "https://www.midjourney.com/updates",
        lang: "en",
        is_active: true,
    },
    {
        id: "dalle",
        name: "DALL·E",
        category: "image",
        site_url: "https://openai.com/dall-e-3",
        news_url: "https://openai.com/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "stable-diffusion",
        name: "Stable Diffusion",
        category: "image",
        site_url: "https://stability.ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "leonardo-ai",
        name: "Leonardo AI",
        category: "image",
        site_url: "https://leonardo.ai",
        news_url: "https://leonardo.ai/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "canva-magic-studio",
        name: "Canva (Magic Studio)",
        category: "image",
        site_url: "https://www.canva.com",
        news_url: "https://www.canva.com/newsroom/news/",
        lang: "en",
        is_active: true,
    },
    {
        id: "remove-bg",
        name: "Remove.bg",
        category: "image",
        site_url: "https://www.remove.bg",
        news_url: "https://www.remove.bg/blog",
        lang: "en",
        is_active: true,
    },

    // Video
    {
        id: "runway",
        name: "Runway",
        category: "video",
        site_url: "https://runwayml.com",
        news_url: "https://runwayml.com/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "luma-ai",
        name: "Luma AI",
        category: "video",
        site_url: "https://lumalabs.ai",
        news_url: "https://lumalabs.ai/blog/news",
        lang: "en",
        is_active: true,
    },
    {
        id: "capcut",
        name: "CapCut",
        category: "video",
        site_url: "https://www.capcut.com",
        news_url: "https://www.capcut.com/explore/Blogs",
        lang: "en",
        is_active: true,
    },
    {
        id: "invideo",
        name: "InVideo",
        category: "video",
        site_url: "https://invideo.io",
        news_url: "https://invideo.io/blog/",
        lang: "en",
        is_active: true,
    },
    {
        id: "filmora",
        name: "Filmora",
        category: "video",
        site_url: "https://filmora.wondershare.com",
        news_url:
            "https://filmora.wondershare.com/whats-new-in-filmora-video-editor.html",
        lang: "en",
        is_active: true,
    },
    {
        id: "heygen",
        name: "HeyGen",
        category: "video",
        site_url: "https://www.heygen.com",
        news_url: "https://www.heygen.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "opusclip",
        name: "OpusClip",
        category: "video",
        site_url: "https://www.opus.pro",
        news_url: "https://www.opus.pro/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "synthesia",
        name: "Synthesia",
        category: "video",
        site_url: "https://www.synthesia.io",
        news_url: "https://www.synthesia.io/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "descript",
        name: "Descript",
        category: "video",
        site_url: "https://www.descript.com",
        news_url: "https://www.descript.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "pictory",
        name: "Pictory",
        category: "video",
        site_url: "https://pictory.ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "fliki",
        name: "Fliki",
        category: "video",
        site_url: "https://fliki.ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "pika",
        name: "Pika",
        category: "video",
        site_url: "https://www.pika.art",
        news_url: null,
        lang: "en",
        is_active: true,
    },

    // Audio
    {
        id: "suno",
        name: "Suno",
        category: "audio",
        site_url: "https://suno.com",
        news_url: "https://suno.com/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "elevenlabs",
        name: "ElevenLabs",
        category: "audio",
        site_url: "https://elevenlabs.io",
        news_url: "https://elevenlabs.io/blog",
        lang: "en",
        is_active: true,
    },
    {
        id: "krisp",
        name: "Krisp",
        category: "audio",
        site_url: "https://krisp.ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "adobe-podcast",
        name: "Adobe Podcast",
        category: "audio",
        site_url: "https://podcast.adobe.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "otter-ai",
        name: "Otter.ai",
        category: "audio",
        site_url: "https://otter.ai",
        news_url: "https://otter.ai/blog",
        lang: "en",
        is_active: true,
    },

    // Automation
    {
        id: "zapier",
        name: "Zapier",
        category: "automation",
        site_url: "https://zapier.com",
        news_url: "https://zapier.com/blog/",
        lang: "en",
        is_active: true,
    },
    {
        id: "n8n",
        name: "n8n",
        category: "automation",
        site_url: "https://n8n.io",
        news_url: "https://blog.n8n.io/",
        lang: "en",
        is_active: true,
    },
    {
        id: "make",
        name: "Make",
        category: "automation",
        site_url: "https://www.make.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "browse-ai",
        name: "browse.ai",
        category: "automation",
        site_url: "https://www.browse.ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },

    // Agent Platforms
    {
        id: "e2b",
        name: "e2b",
        category: "agent_platform",
        site_url: "https://e2b.dev",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "manus",
        name: "Manus",
        category: "agent_platform",
        site_url: "https://manus.im",
        news_url: "https://manus.so/blog",
        lang: "en",
        is_active: true,
    },

    // Catalogs
    {
        id: "futurepedia",
        name: "Futurepedia",
        category: "catalog",
        site_url: "https://www.futurepedia.io",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "futuretools",
        name: "FutureTools",
        category: "catalog",
        site_url: "https://www.futuretools.io",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "theresanaiforthat",
        name: "There's An AI For That",
        category: "catalog",
        site_url: "https://theresanaiforthat.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "aitoolsdirectory",
        name: "AI Tools Directory",
        category: "catalog",
        site_url: "https://aitoolsdirectory.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "insidr-ai",
        name: "Insidr AI Tools Directory",
        category: "catalog",
        site_url: null,
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "aitoolguru",
        name: "AI Tool Guru",
        category: "catalog",
        site_url: "https://aitoolguru.com",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "bitstream-ai",
        name: "Bitstream AI Tools Directory",
        category: "catalog",
        site_url: null,
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "barndoor-ai",
        name: "Barndoor Enterprise AI Tools Directory",
        category: "catalog",
        site_url: null,
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "aixploria",
        name: "AIxploria",
        category: "catalog",
        site_url: null,
        news_url: null,
        lang: "en",
        is_active: true,
    },

    // Awesome Lists
    {
        id: "awesome-eudk",
        name: "eudk/awesome-ai-tools",
        category: "awesome_list",
        site_url: "https://github.com/eudk/awesome-ai-tools",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-mahseema",
        name: "mahseema/awesome-ai-tools",
        category: "awesome_list",
        site_url: "https://github.com/mahseema/awesome-ai-tools",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-ikaijua",
        name: "ikaijua/Awesome-AITools",
        category: "awesome_list",
        site_url: "https://github.com/ikaijua/Awesome-AITools",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-ai-tools-inc",
        name: "ai-tools-inc/awesome-ai-tools",
        category: "awesome_list",
        site_url: "https://github.com/ai-tools-inc/awesome-ai-tools",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-re50urces",
        name: "re50urces/Awesome-AI",
        category: "awesome_list",
        site_url: "https://github.com/re50urces/Awesome-AI",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-awesomelistsio",
        name: "awesomelistsio/awesome-ai",
        category: "awesome_list",
        site_url: "https://github.com/awesomelistsio/awesome-ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-steven2358",
        name: "steven2358/awesome-generative-ai",
        category: "awesome_list",
        site_url: "https://github.com/steven2358/awesome-generative-ai",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-e2b-agents",
        name: "e2b-dev/awesome-ai-agents",
        category: "awesome_list",
        site_url: "https://github.com/e2b-dev/awesome-ai-agents",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-amusi",
        name: "amusi/awesome-ai-awesomeness",
        category: "awesome_list",
        site_url: "https://github.com/amusi/awesome-ai-awesomeness",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-sindresorhus",
        name: "sindresorhus/awesome-chatgpt",
        category: "awesome_list",
        site_url: "https://github.com/sindresorhus/awesome-chatgpt",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-taishi-i",
        name: "taishi-i/awesome-ChatGPT-repositories",
        category: "awesome_list",
        site_url: "https://github.com/taishi-i/awesome-ChatGPT-repositories",
        news_url: null,
        lang: "en",
        is_active: true,
    },
    {
        id: "awesome-tarrysingh",
        name: "TarrySingh/Awesome-ChatGPT-Resources",
        category: "awesome_list",
        site_url: "https://github.com/TarrySingh/Awesome-ChatGPT-Resources",
        news_url: null,
        lang: "en",
        is_active: true,
    },
];

async function seedTools() {
    console.log("🌱 Starting to seed tools...\n");

    const { data, error } = await supabase
        .from("tools")
        .upsert(tools, { onConflict: "id" })
        .select();

    if (error) {
        console.error("❌ Error seeding tools:", error.message);
        process.exit(1);
    }

    console.log(`✅ Successfully seeded ${data?.length ?? 0} tools\n`);

    // Print summary by category
    const summary = tools.reduce(
        (acc, tool) => {
            acc[tool.category] = (acc[tool.category] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    console.log("📊 Tools by category:");
    Object.entries(summary)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
            console.log(`   ${category}: ${count}`);
        });

    // Count tools with news_url
    const withNews = tools.filter((t) => t.news_url).length;
    console.log(`\n📰 Tools with news URL: ${withNews}/${tools.length}`);
}

seedTools().catch(console.error);
