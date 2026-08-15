import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLang, type Lang, LANGS, t } from '@/lib/i18n'
import { type Block, LESSONS } from '@/lib/lessons'
import { STATS } from '@/lib/registry'
import { canonical, JsonLd, SITE_URL } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

const PATH = '/dsh-plugins-guide'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params
  const lang: Lang = isLang(raw) ? raw : 'en'
  const title =
    lang === 'zh'
      ? 'DeepSeek Harness 插件使用指南 · 从安装到发布'
      : 'DeepSeek Harness Plugins Guide — from install to publish'
  const description =
    lang === 'zh'
      ? 'dsh 插件完整使用指南：插件是什么、怎么安装、配置层与覆盖顺序怎么算、装之前该检查什么、以及怎么打包发布自己的插件。五个部分，一页读完。'
      : 'The complete guide to DeepSeek Harness plugins: what a plugin is, how to install one, how config layers and override order work, what to check before installing, and how to package and publish your own. Five parts on one page.'
  return {
    title: { absolute: title },
    description,
    keywords:
      lang === 'zh'
        ? ['dsh 插件使用指南', 'dsh 插件怎么安装', 'DeepSeek Harness 插件教程', 'dsh plugin add', 'cordis.patch.yml']
        : ['dsh plugins guide', 'how to install dsh plugins', 'DeepSeek Harness plugin tutorial', 'dsh plugin add'],
    alternates: {
      canonical: canonical(lang, PATH),
      languages: { en: canonical('en', PATH), 'zh-CN': canonical('zh', PATH) },
    },
    openGraph: { title, description, url: canonical(lang, PATH), type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/**
 * A block inside a section. Headings here are H3: the page is H1, each of the five
 * parts is an H2, so a block heading sits one level below its part.
 */
function Prose({ block, lang }: { block: Block; lang: Lang }) {
  switch (block.t) {
    case 'h':
      return <h3 className="h-card mt-10 mb-4">{lang === 'zh' ? block.zh : block.en}</h3>
    case 'p':
      return <p className="mb-4 text-base leading-[1.8] text-ink-soft">{lang === 'zh' ? block.zh : block.en}</p>
    case 'list':
      return (
        <ul className="mb-5 space-y-2.5">
          {(lang === 'zh' ? block.zh : block.en).map((item, index) => (
            <li key={index} className="flex gap-3 text-base leading-[1.8] text-ink-soft">
              <span
                className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-full text-sm font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--color-orange) 14%, transparent)',
                  color: 'var(--color-orange)',
                }}
              >
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre
          className="mb-5 overflow-x-auto rounded-2xl p-5 font-mono text-sm leading-[1.7]"
          style={{ background: 'var(--color-ground)' }}
        >
          <code>{block.code}</code>
        </pre>
      )
    case 'note':
      return (
        <p
          className="mb-5 rounded-2xl p-5 text-base leading-[1.8] text-ink-soft"
          style={{ background: 'var(--color-ground)' }}
        >
          {lang === 'zh' ? block.zh : block.en}
        </p>
      )
    case 'warn':
      return (
        <p
          className="mb-5 rounded-2xl p-5 text-base leading-[1.8]"
          style={{
            background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            color: 'var(--color-warning)',
          }}
        >
          {lang === 'zh' ? block.zh : block.en}
        </p>
      )
  }
}

export default async function Guide({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const zh = lang === 'zh'

  const h1 = zh ? 'DeepSeek Harness 插件使用指南' : 'DeepSeek Harness Plugins Guide'

  // A guide that answers "how do I install one" is a HowTo; the install part supplies
  // the steps, and generative engines lift those steps directly.
  const install = LESSONS.find((lesson) => lesson.slug === 'install')
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${SITE_URL}${PATH}/#howto`,
    name: zh ? '怎么安装一个 DeepSeek Harness 插件' : 'How to install a DeepSeek Harness plugin',
    description: zh ? install?.lede.zh : install?.lede.en,
    totalTime: 'PT5M',
    tool: [{ '@type': 'HowToTool', name: 'Node.js ^22.19 || >=24' }],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: zh ? '启动 harness' : 'Start the harness',
        text: zh
          ? '执行 npx @deepseek-ai/dsh web，Web UI 默认在 http://127.0.0.1:3080。'
          : 'Run npx @deepseek-ai/dsh web, which serves the Web UI at http://127.0.0.1:3080.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: zh ? '安装插件' : 'Install the plugin',
        text: zh
          ? '执行 dsh plugin --profile web add <包名>。它把参数转发给 profile 目录里的 pnpm，并在包声明了 dsh.bundle 时把它追加进该 profile 的层列表。'
          : 'Run dsh plugin --profile web add <package>. It forwards to pnpm inside the profile directory and appends the package to that profile’s bundle layer list when it declares dsh.bundle.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: zh ? '启动前先核对' : 'Verify before booting',
        text: zh
          ? '执行 dsh --profile web --dump-config 打印组合出来的配置树。插件没出现在里面，问题就在安装这一步，不在插件代码里。'
          : 'Run dsh --profile web --dump-config to print the composed configuration tree. If the plugin is not in it, the problem is the install, not the plugin code.',
      },
    ],
  }

  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${SITE_URL}${PATH}/#article`,
    headline: h1,
    inLanguage: zh ? 'zh-CN' : 'en',
    url: canonical(lang, PATH),
    dateModified: STATS.generatedAt,
    articleSection: LESSONS.map((lesson) => (zh ? lesson.title.zh : lesson.title.en)),
    proficiencyLevel: 'Beginner',
    about: { '@type': 'SoftwareApplication', name: 'DeepSeek Harness', applicationCategory: 'DeveloperApplication' },
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: zh ? '首页' : 'Home', item: canonical(lang) },
      { '@type': 'ListItem', position: 2, name: h1, item: canonical(lang, PATH) },
    ],
  }

  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={howTo} />
      <JsonLd data={breadcrumb} />

      <div className="mx-auto max-w-[76rem] px-5 sm:px-8">
        {/* Hero */}
        <header className="pt-10 pb-10 sm:pt-16">
          <span
            className="pill"
            style={{
              background: 'color-mix(in srgb, var(--color-orange) 14%, transparent)',
              color: 'var(--color-orange)',
            }}
          >
            {zh ? `${LESSONS.length} 个部分 · 一页读完` : `${LESSONS.length} parts · one page`}
          </span>
          <h1 className="h-hero mt-5 max-w-4xl">{h1}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">
            {zh
              ? 'dsh 没有需要打补丁的特权内核——一切都是可替换的配置层。先搞懂下面这五件事，其余的都能自己推出来。'
              : 'dsh has no privileged core to patch — everything is a replaceable config layer. Understand these five things and the rest follows.'}
          </p>

          {/* In-page navigation. Anchors let search engines surface sitelinks. */}
          <nav aria-label={t('learn.toc', lang)} className="mt-8 flex flex-wrap gap-2">
            {LESSONS.map((lesson, index) => (
              <a
                key={lesson.slug}
                href={`#${lesson.slug}`}
                className="pill"
                style={{ background: 'var(--color-card)', color: 'var(--color-ink-soft)' }}
              >
                <span style={{ color: 'var(--color-orange)' }}>{index + 1}</span>
                {zh ? lesson.title.zh : lesson.title.en}
              </a>
            ))}
          </nav>
        </header>

        {/* Every part, expanded */}
        <div className="flex flex-col gap-4 pb-16">
          {LESSONS.map((lesson, index) => (
            <section key={lesson.slug} id={lesson.slug} className="card-xl scroll-mt-6 p-8 sm:p-12">
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold" style={{ color: 'var(--color-orange)' }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="h-section">{zh ? lesson.title.zh : lesson.title.en}</h2>
              </div>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">
                {zh ? lesson.lede.zh : lesson.lede.en}
              </p>
              <div className="mt-8 max-w-3xl">
                {lesson.blocks.map((block, blockIndex) => (
                  <Prose key={blockIndex} block={block} lang={lang} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Next step */}
        <section className="card-invert mb-16 p-8 sm:p-12">
          <h2 className="h-section max-w-2xl">
            {zh ? '接下来：挑一个插件装上' : 'Next: install one'}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--color-on-invert-soft)' }}>
            {zh
              ? `${STATS.totals.installable} 个可安装插件，${STATS.totals.verified} 个通过全部七项结构复核。每一条都标注了它挂载什么、依赖版本是否还有效、以及安装时会不会在你机器上执行代码。`
              : `${STATS.totals.installable} installable plugins, ${STATS.totals.verified} passing all seven structural checks. Every entry shows what it mounts, whether its dependency range still resolves, and whether installing runs code on your machine.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/${lang}/plugins/`} className="btn btn-primary">
              {zh ? '浏览插件市场' : 'Browse the marketplace'} →
            </Link>
            <Link
              href={`/${lang}/method/`}
              className="btn"
              style={{ background: 'color-mix(in srgb, var(--color-on-invert) 14%, transparent)', color: 'var(--color-on-invert)' }}
            >
              {zh ? '核验方法' : 'How entries are checked'}
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
