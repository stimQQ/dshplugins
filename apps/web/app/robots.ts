import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Every crawler is allowed, AI crawlers explicitly.
 *
 * Generative engines cite sources rather than rank pages, and several of them use a
 * dedicated agent that a default-deny robots policy would silently exclude. Naming
 * them makes the permission auditable rather than incidental.
 */
export const dynamic = 'force-static'

const AI_CRAWLERS = [
  'GPTBot', // OpenAI training + ChatGPT browsing
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'Google-Extended', // Gemini / AI Overviews
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'DeepSeekBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
