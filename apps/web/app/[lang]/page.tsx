import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLang, type Lang, LANGS, pick, t } from '@/lib/i18n'
import { RichText } from '@/components/RichText'
import { AUDIENCES, COMPARE, FAQS, SECTIONS } from '@/lib/homepage'
import { CATEGORIES, LISTED_PLUGINS, STATS } from '@/lib/registry'
import { canonical, datasetSchema, faqSchema, JsonLd, SITE_NAME, websiteSchema } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params
  const lang: Lang = isLang(raw) ? raw : 'en'
  const title =
    lang === 'zh'
      ? 'DeepSeek Harness 插件市场 · 719 个插件，逐个复核'
      : 'DeepSeek Harness Plugins Marketplace — 719 plugins, each verified'
  const description =
    lang === 'zh'
      ? `DeepSeek Harness（dsh）插件市场：719 个可安装插件，688 个通过全部七项结构复核。每个插件都逐个拉取 npm 发布包核对，告诉你哪个真的能装。每日更新。`
      : `A marketplace of 719 installable DeepSeek Harness (dsh) plugins, 688 passing all seven structural checks. Every entry is verified against its published npm tarball, so you know which ones actually install. Updated daily.`
  return {
    // absolute: the homepage title already carries the brand, so it opts out of
    // the layout's "%s · DeepSeek Harness Plugins" template.
    title: { absolute: title },
    description,
    keywords:
      lang === 'zh'
        ? ['DeepSeek Harness 插件', 'dsh 插件', 'dsh plugin', 'DeepSeek Harness', 'agent harness 插件', 'cordis 插件']
        : ['DeepSeek Harness plugins', 'dsh plugins', 'dsh plugin marketplace', 'DeepSeek agent harness', 'cordis plugins'],
    alternates: { canonical: canonical(lang), languages: { en: canonical('en'), 'zh-CN': canonical('zh') } },
    openGraph: {
      title,
      description,
      url: canonical(lang),
      siteName: SITE_NAME[lang],
      type: 'website',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/** Section wrapper. Spacing separates sections; nothing is ruled. */
function Block({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-[76rem] px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  )
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const zh = lang === 'zh'

  const days = Object.entries(STATS.byDay).sort(([a], [b]) => a.localeCompare(b))
  const latest = days.at(-1) ?? ['', 0]
  const facts = {
    installable: STATS.totals.installable,
    verified: STATS.totals.verified,
    stale: STATS.compat.stale,
    indexed: STATS.totals.indexed,
    newestDay: latest[0],
    newestCount: latest[1],
  }

  // Three entries per category — the navigation doubles as a sample of the catalogue.
  const byCategory = CATEGORIES.map((category) => ({
    ...category,
    count: STATS.byCategory[category.id] ?? 0,
    top: LISTED_PLUGINS.filter((plugin) => plugin.category === category.id).slice(0, 3),
  })).filter((category) => category.count > 0)

  const readouts = [
    { value: facts.installable, label: t('home.readout.installable', lang), tone: undefined },
    { value: facts.verified, label: t('home.readout.verified', lang), tone: 'var(--color-success)' },
    { value: facts.stale, label: t('home.readout.stale', lang), tone: 'var(--color-danger)' },
    { value: facts.indexed, label: t('home.readout.indexed', lang), tone: undefined },
  ]

  return (
    <>
      <JsonLd data={websiteSchema(lang)} />
      <JsonLd data={datasetSchema(lang, facts)} />
      <JsonLd data={faqSchema(lang, FAQS)} />

      {/* Hero */}
      <Block className="pt-12 pb-10 sm:pt-20">
        <span className="pill" style={{ background: 'var(--color-orange)', color: '#fff' }}>
          +{facts.newestCount} {zh ? `新增 · ${facts.newestDay}` : `added on ${facts.newestDay}`}
        </span>

        {/* The trailing space is load-bearing: extractors that ignore <br /> would
            otherwise read the H1 as "DeepSeek HarnessPlugins Marketplace". */}
        <h1 className="h-hero mt-6 max-w-5xl">
          DeepSeek Harness{' '}
          <br />
          Plugins <span style={{ color: 'var(--color-orange)' }}>Marketplace</span>
          {zh && <span className="mt-2 block text-ink-soft">DeepSeek Harness 插件市场</span>}
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {zh
            ? `${facts.installable} 个可安装的 dsh 插件，${facts.verified} 个通过全部七项结构复核。每一条都是拉取 npm 发布包逐字节核对出来的——不是收集链接。`
            : `${facts.installable} installable dsh plugins, ${facts.verified} passing all seven structural checks. Every entry is verified against the published npm tarball — not collected from links.`}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/${lang}/plugins/`} className="btn btn-primary">
            {zh ? '浏览全部插件' : 'Browse all plugins'} →
          </Link>
          <Link href={`/${lang}/dsh-plugins-guide/`} className="btn btn-dark">
            {zh ? '怎么用' : 'How to use'}
          </Link>
        </div>
      </Block>

      {/* Four readouts */}
      <Block className="pb-16">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {readouts.map((readout, index) => (
            <div
              key={readout.label}
              className="card rise p-7"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="readout" style={readout.tone === undefined ? undefined : { color: readout.tone }}>
                {readout.value.toLocaleString('en-US')}
              </div>
              <div className="mt-3 text-base text-ink-soft">{readout.label}</div>
            </div>
          ))}
        </div>
      </Block>

      {/* Category navigation, three entries each */}
      <Block id="categories" className="pb-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="h-section">{zh ? '按用途浏览' : 'Browse by purpose'}</h2>
          <Link href={`/${lang}/plugins/`} className="btn btn-plain">
            {zh ? `全部 ${facts.installable} 个` : `All ${facts.installable}`} →
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {byCategory.map((category) => (
            <div key={category.id} className="card flex flex-col p-6">
              <Link
                href={`/${lang}/plugins/?c=${category.id}`}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="h-card">{pick(category.label, lang)}</span>
                <span className="label tabular-nums">{category.count}</span>
              </Link>

              <ul className="mt-4 flex flex-col gap-2.5">
                {category.top.map((plugin) => (
                  <li key={plugin.name}>
                    <Link
                      href={`/${lang}/p/${plugin.name.split('/').map(encodeURIComponent).join('/')}/`}
                      className="group flex items-baseline gap-2"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: plugin.verified ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
                        aria-hidden
                      />
                      <span className="truncate font-mono text-sm text-ink-soft group-hover:text-orange">
                        {plugin.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Block>

      {/* Answer sections */}
      {SECTIONS.map((section, index) => (
        <Block key={section.id} id={section.id} className="pb-4">
          <div className={index % 2 === 1 ? 'card-invert p-8 sm:p-12' : 'card-xl p-8 sm:p-12'}>
            <h2 className="h-section max-w-3xl">{zh ? section.h.zh : section.h.en}</h2>
            <p
              className="mt-5 max-w-3xl text-lg leading-relaxed"
              style={{ color: index % 2 === 1 ? 'var(--color-on-invert)' : 'var(--color-ink)' }}
            >
              <RichText text={zh ? section.lead.zh : section.lead.en} />
            </p>
            <div className="mt-6 grid max-w-5xl gap-5 md:grid-cols-3">
              {(zh ? section.body.zh : section.body.en).map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className="text-base leading-[1.75]"
                  style={{ color: index % 2 === 1 ? 'var(--color-on-invert-soft)' : 'var(--color-ink-soft)' }}
                >
                  <RichText text={paragraph} />
                </p>
              ))}
            </div>
          </div>
        </Block>
      ))}

      {/* Comparison */}
      <Block id="comparison" className="pt-12 pb-16">
        <h2 className="h-section mb-3">
          {zh ? 'dsh 和 Claude Code、OpenClaw、Hermes Agent 的区别' : 'dsh vs Claude Code, OpenClaw, and Hermes Agent'}
        </h2>
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-ink-soft">
          {zh
            ? '四个都是 agent，但只有 dsh 把 agent 循环本身也做成了可替换的插件。下表每一格都能从各自的仓库里核对。'
            : 'All four are agents, but only dsh makes the agent loop itself a replaceable plugin. Every cell below is checkable from each project’s own repository.'}
        </p>

        <div className="card-xl overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[46rem] border-collapse text-base">
            <thead>
              <tr>
                <th className="label p-4 text-left font-medium" />
                <th className="p-4 text-left">
                  <span className="h-card" style={{ color: 'var(--color-orange)' }}>
                    DeepSeek Harness
                  </span>
                </th>
                <th className="h-card p-4 text-left">Claude Code</th>
                <th className="h-card p-4 text-left">OpenClaw</th>
                <th className="h-card p-4 text-left">Hermes Agent</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, index) => (
                <tr key={row.label.en} style={index % 2 === 0 ? { background: 'var(--color-ground)' } : undefined}>
                  <th scope="row" className="label p-4 text-left font-medium">
                    {zh ? row.label.zh : row.label.en}
                  </th>
                  <td className="p-4 font-medium">{zh ? row.dsh.zh : row.dsh.en}</td>
                  <td className="p-4 text-ink-soft">{zh ? row.claudeCode.zh : row.claudeCode.en}</td>
                  <td className="p-4 text-ink-soft">{zh ? row.openclaw.zh : row.openclaw.en}</td>
                  <td className="p-4 text-ink-soft">{zh ? row.hermes.zh : row.hermes.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      {/* Who it is for */}
      <Block id="who" className="pb-16">
        <h2 className="h-section mb-8">{zh ? '适合谁用' : 'Who it is for'}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          {AUDIENCES.map((audience) => (
            <div key={audience.who.en} className="card p-7">
              <span className="text-lg" style={{ color: 'var(--color-orange)' }} aria-hidden>
                {audience.icon}
              </span>
              <h3 className="h-card mt-3">{zh ? audience.who.zh : audience.who.en}</h3>
              <p className="mt-2.5 text-base leading-[1.75] text-ink-soft">
                <RichText text={zh ? audience.text.zh : audience.text.en} />
              </p>
            </div>
          ))}
        </div>
      </Block>

      {/* FAQ */}
      <Block id="faq" className="pb-20">
        <h2 className="h-section mb-8">{zh ? '常见问题' : 'Frequently asked questions'}</h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <details key={faq.q.en} className="card group p-7">
              <summary className="h-card cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="mr-3 inline-block transition-transform group-open:rotate-45" style={{ color: 'var(--color-orange)' }} aria-hidden>
                  +
                </span>
                {zh ? faq.q.zh : faq.q.en}
              </summary>
              <p className="mt-4 max-w-4xl pl-7 text-base leading-[1.8] text-ink-soft">
                <RichText text={zh ? faq.a.zh : faq.a.en} />
              </p>
            </details>
          ))}
        </div>
      </Block>
    </>
  )
}
