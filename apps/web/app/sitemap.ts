import type { MetadataRoute } from 'next'
import { LANGS } from '@/lib/i18n'
import { LISTED_PLUGINS, STATS } from '@/lib/registry'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * Both language variants of one path, cross-declared with hreflang alternates.
 *
 * The trailing slash is required: next.config sets `trailingSlash: true`, so a
 * sitemap URL without it redirects once before arriving and disagrees with the
 * page's own canonical.
 */
function entry(path: string, priority: number, changeFrequency: 'daily' | 'weekly'): MetadataRoute.Sitemap {
  return LANGS.map((lang) => ({
    url: `${SITE_URL}/${lang}${path}/`,
    lastModified: STATS.generatedAt,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        LANGS.map((other) => [other === 'zh' ? 'zh-CN' : other, `${SITE_URL}/${other}${path}/`]),
      ),
    },
  }))
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entry('', 1, 'daily'),
    ...entry('/plugins', 0.9, 'daily'),
    ...entry('/dsh-plugins-guide', 0.9, 'weekly'),
    ...entry('/method', 0.7, 'weekly'),
    ...entry('/api', 0.8, 'weekly'),
    ...LISTED_PLUGINS.flatMap((plugin) =>
      entry(`/p/${plugin.name.split('/').map(encodeURIComponent).join('/')}`, plugin.verified ? 0.6 : 0.4, 'weekly'),
    ),
  ]
}
