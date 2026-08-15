/**
 * SEO and GEO constants and structured data.
 *
 * GEO (generative engine optimization) is the reason the homepage carries answer-first
 * prose and FAQ markup: AI search engines cite sources rather than rank pages, so the
 * page has to state checkable facts, with numbers, in extractable blocks.
 */

import type { Lang } from './i18n'

/** Canonical origin. Set NEXT_PUBLIC_SITE_URL at build time before deploying. */
export const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://dshplugins.co'

export const SITE_NAME = {
  en: 'DeepSeek Harness Plugins Marketplace',
  zh: 'DeepSeek Harness 插件市场',
} as const

export function canonical(lang: Lang, path = ''): string {
  return `${SITE_URL}/${lang}${path}`
}

/** Facts the structured data and the copy both quote, so they can never drift apart. */
export interface Facts {
  installable: number
  verified: number
  stale: number
  indexed: number
  newestDay: string
  newestCount: number
}

/**
 * WebSite + Organization, emitted once on the homepage. SearchAction points at the
 * catalogue so an engine can surface the site's own search.
 */
export function websiteSchema(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME[lang],
    alternateName: lang === 'zh' ? 'DSH Plugins' : 'DSH 插件',
    url: canonical(lang),
    inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
    description:
      lang === 'zh'
        ? 'DeepSeek Harness（dsh）插件市场：逐个拉取 npm 发布包做结构复核，告诉你哪个插件真的能装。'
        : 'A marketplace of DeepSeek Harness (dsh) plugins, each verified against its published npm tarball so you know which ones actually install.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${canonical(lang, '/plugins')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** The catalogue itself, as a dataset an engine can describe and cite. */
export function datasetSchema(lang: Lang, facts: Facts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${SITE_URL}/#dataset`,
    name: lang === 'zh' ? 'DeepSeek Harness 插件复核数据集' : 'DeepSeek Harness plugin verification dataset',
    description:
      lang === 'zh'
        ? `${facts.indexed} 个 npm 包的机器复核结果，其中 ${facts.installable} 个是可安装的 dsh 插件，${facts.verified} 个通过全部七项结构检查。每日刷新。`
        : `Machine-checked results for ${facts.indexed} npm packages, of which ${facts.installable} are installable dsh plugins and ${facts.verified} pass all seven structural checks. Refreshed daily.`,
    url: canonical(lang, '/plugins'),
    creator: { '@type': 'Organization', name: SITE_NAME.en, url: SITE_URL },
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    variableMeasured: ['installable plugins', 'verified plugins', 'stale dependency ranges', 'packages indexed'],
  }
}

/** Q&A pairs. FAQPage markup is the single highest-yield GEO addition. */
export interface Faq {
  q: { en: string; zh: string }
  a: { en: string; zh: string }
}

export function faqSchema(lang: Lang, faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: lang === 'zh' ? faq.q.zh : faq.q.en,
      acceptedAnswer: { '@type': 'Answer', text: lang === 'zh' ? faq.a.zh : faq.a.en },
    })),
  }
}

/** One plugin rendered as a citable software entry on its detail page. */
export function softwareSchema(plugin: {
  name: string
  version: string
  summary: string
  license: string | null
  repository: string | null
  npmUrl: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: plugin.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    softwareVersion: plugin.version,
    description: plugin.summary,
    license: plugin.license ?? undefined,
    codeRepository: plugin.repository ?? undefined,
    downloadUrl: plugin.npmUrl,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}

/** Render a JSON-LD block. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
