import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Browser } from '@/components/Browser'
import { SectionHead } from '@/components/marks'
import { isLang, LANGS, t } from '@/lib/i18n'
import { INDEX_ROWS, STATS } from '@/lib/registry'
import { canonical } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

/**
 * The server ships the first screen of cards in the same default order the client
 * uses, so the catalogue is readable and indexable before the full index loads.
 */
const SEEDED = 36

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params
  const lang = isLang(raw) ? raw : 'en'
  const title =
    lang === 'zh'
      ? `插件市场 · ${STATS.totals.installable} 个可安装 dsh 插件`
      : `Plugins Marketplace — ${STATS.totals.installable} installable dsh plugins`
  const description =
    lang === 'zh'
      ? `浏览 ${STATS.totals.installable} 个 DeepSeek Harness 插件，按用途、是否通过复核、是否带界面、版本是否当前筛选。${STATS.totals.verified} 个通过全部七项结构检查。`
      : `Browse ${STATS.totals.installable} DeepSeek Harness plugins, filtered by purpose, verification status, browser UI, and version currency. ${STATS.totals.verified} pass all seven structural checks.`
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonical(lang, '/plugins'),
      languages: { en: canonical('en', '/plugins'), 'zh-CN': canonical('zh', '/plugins') },
    },
    openGraph: { title, description, url: canonical(lang, '/plugins'), type: 'website' },
  }
}

export default async function Plugins({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()

  return (
    <section className="mx-auto max-w-[76rem] px-5 py-12 sm:px-8">
      <SectionHead
        note={
          lang === 'zh'
            ? `${STATS.totals.installable} 个可安装插件，${STATS.totals.verified} 个通过全部结构检查。默认按综合评分排序——不是按下载量。`
            : `${STATS.totals.installable} installable plugins, ${STATS.totals.verified} passing every structural check. Ordered by overall score, not downloads.`
        }
      >
        {t('browse.title', lang)}
      </SectionHead>
      <Browser lang={lang} initial={INDEX_ROWS.slice(0, SEEDED)} initialCategory="all" />
    </section>
  )
}
