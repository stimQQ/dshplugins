import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLang, type Lang, LANGS } from '@/lib/i18n'
import { STATS } from '@/lib/registry'
import { canonical, JsonLd, SITE_URL } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

const PATH = '/api'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params
  const lang: Lang = isLang(raw) ? raw : 'en'
  const title =
    lang === 'zh'
      ? 'DeepSeek Harness 插件数据 API · 免费公开'
      : 'DeepSeek Harness plugin data API — free and public'
  const description =
    lang === 'zh'
      ? `719 个 dsh 插件的机器复核数据，静态 JSON、开放 CORS、每日刷新。给插件市场、CLI 和 agent 工具直接消费，无需自建抓取管道。`
      : `Machine-checked data for 719 dsh plugins as static JSON with open CORS, refreshed daily. Built for plugin marketplaces, CLIs, and agent tools to consume directly instead of running their own crawler.`
  return {
    title,
    description,
    alternates: {
      canonical: canonical(lang, PATH),
      languages: { en: canonical('en', PATH), 'zh-CN': canonical('zh', PATH) },
    },
    openGraph: { title, description, url: canonical(lang, PATH), type: 'article' },
  }
}

interface Endpoint {
  path: string
  returns: { en: string; zh: string }
  size: string
}

const ENDPOINTS: Endpoint[] = [
  {
    path: '/api/v1/meta.json',
    returns: { en: 'Endpoint list, schema version, counts, and field documentation.', zh: '端点列表、schema 版本、计数与字段说明。' },
    size: '2 KB',
  },
  {
    path: '/api/v1/stats.json',
    returns: { en: 'Ecosystem totals: installable, verified, compatibility spread, per-category and per-day counts.', zh: '生态总量：可安装数、通过复核数、兼容性分布、分类与每日新增。' },
    size: '1 KB',
  },
  {
    path: '/api/v1/index.json',
    returns: { en: 'Every plugin as a compact row — the listing payload, with single-letter keys documented in meta.json.', zh: '全部插件的精简行——列表用负载，单字母键的含义见 meta.json。' },
    size: '290 KB',
  },
  {
    path: '/api/v1/plugins.json',
    returns: { en: 'The full corpus: every check result, patch row, compatibility finding, and npm and GitHub fact.', zh: '完整语料：每一项检查结果、patch 行、兼容性判定，以及 npm 与 GitHub 数据。' },
    size: '3.4 MB',
  },
  {
    path: '/api/v1/plugins/{packageName}.json',
    returns: { en: 'One plugin. Scoped names nest, so @scope/name lives at /plugins/@scope/name.json.', zh: '单个插件。带 scope 的名字按目录嵌套，@scope/name 在 /plugins/@scope/name.json。' },
    size: '~4 KB',
  },
  {
    path: '/api/v1/verified.json',
    returns: { en: 'Names that pass all seven structural checks — the allowlist, if you want one.', zh: '通过全部七项结构检查的包名——需要白名单时直接用这个。' },
    size: '20 KB',
  },
  {
    path: '/api/v1/stale.json',
    returns: { en: 'Plugins whose declared dsh dependency range no longer admits the published version, with the offending ranges.', zh: '依赖区间已经容不下当前发布版本的插件，附具体是哪几条区间。' },
    size: '8 KB',
  },
]

function Code({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-2xl p-5 font-mono text-sm leading-[1.7]"
      style={{ background: 'var(--color-ground)' }}
    >
      <code>{children}</code>
    </pre>
  )
}

export default async function ApiDocs({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const zh = lang === 'zh'

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${SITE_URL}${PATH}/#api`,
    name: zh ? 'DeepSeek Harness 插件复核数据 API' : 'DeepSeek Harness plugin verification API',
    description: zh
      ? `${STATS.totals.installable} 个 dsh 插件的结构复核与依赖兼容性数据，静态 JSON，开放 CORS，每日刷新。`
      : `Structural verification and dependency compatibility data for ${STATS.totals.installable} dsh plugins as static JSON with open CORS, refreshed daily.`,
    url: canonical(lang, PATH),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: 'DeepSeek Harness Plugins', url: SITE_URL },
    distribution: ENDPOINTS.map((endpoint) => ({
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${SITE_URL}${endpoint.path}`,
    })),
  }

  return (
    <>
      <JsonLd data={dataset} />
      <div className="mx-auto max-w-[76rem] px-5 sm:px-8">
        <header className="pt-10 pb-10 sm:pt-16">
          <span className="pill" style={{ background: 'var(--color-orange)', color: '#fff' }}>
            {zh ? '免费 · 开放 CORS · 每日刷新' : 'Free · open CORS · refreshed daily'}
          </span>
          <h1 className="h-hero mt-5 max-w-4xl">
            {zh ? 'DeepSeek Harness 插件数据 API' : 'DeepSeek Harness plugin data API'}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">
            {zh
              ? `${STATS.totals.installable} 个插件的结构复核结果，作为静态 JSON 提供。如果你在做插件市场、CLI 或 agent 工具，不必再自建抓取和验证管道——直接读这里。`
              : `Structural verification results for ${STATS.totals.installable} plugins, served as static JSON. If you are building a plugin marketplace, a CLI, or an agent tool, you do not need your own crawler and verifier — read this instead.`}
          </p>
        </header>

        {/* Why */}
        <section className="card-invert mb-4 p-8 sm:p-12">
          <h2 className="h-section max-w-3xl">{zh ? '为什么值得用' : 'Why this exists'}</h2>
          <div className="mt-6 grid max-w-5xl gap-6 md:grid-cols-3">
            <p className="text-base leading-[1.75]" style={{ color: 'var(--color-on-invert-soft)' }}>
              {zh
                ? 'GitHub 的 dsh-plugin 话题有 3000 多个仓库，但抽样显示其中大多数并不声明 dsh.bundle——那是热门话题被蹭的结果。按话题抓取会把噪音当插件。'
                : 'The GitHub dsh-plugin topic carries over 3,000 repositories, but sampling shows most of them declare no dsh.bundle at all — a hot topic attracts unrelated projects. Crawling it treats noise as plugins.'}
            </p>
            <p className="text-base leading-[1.75]" style={{ color: 'var(--color-on-invert-soft)' }}>
              {zh
                ? '按 npm 关键词抓要干净得多，但仍然回答不了「装上去会不会坏」。声明的 patch 有没有真的打包、插件行会不会指向作者本机的绝对路径、浏览器半侧是否缺失——这些只有拉发布包才知道。'
                : 'The npm keyword index is far cleaner but still cannot tell you whether a plugin will break on install. Whether the declared patch actually shipped, whether a row points at the author’s own disk, whether the browser half is missing — only the tarball knows.'}
            </p>
            <p className="text-base leading-[1.75]" style={{ color: 'var(--color-on-invert-soft)' }}>
              {zh
                ? `这个 API 每天拉一遍全部发布包做七项检查，并把依赖区间和当前已发布版本比对。${STATS.compat.stale} 个插件的依赖已经过期——这件事没有任何社交信号会告诉你。`
                : `This API pulls every tarball daily, runs seven checks, and compares each dependency range against what npm ships today. ${STATS.compat.stale} plugins are pinned to a range that has moved on — no social signal reveals that.`}
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="card-xl mb-4 p-8 sm:p-12">
          <h2 className="h-section">{zh ? '端点' : 'Endpoints'}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
            {zh
              ? '全部是 GET 静态文件，无鉴权、无速率限制，Access-Control-Allow-Origin 为 *。版本前缀 v1 内不会发生破坏性变更；字段只增不减。'
              : 'All GET, all static, no auth and no rate limit, with Access-Control-Allow-Origin set to *. Nothing breaking changes inside the v1 prefix; fields are added, never removed.'}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {ENDPOINTS.map((endpoint) => (
              <div key={endpoint.path} className="rounded-2xl p-5" style={{ background: 'var(--color-ground)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <code className="font-mono text-base font-medium break-all">{endpoint.path}</code>
                  <span className="label">{endpoint.size}</span>
                </div>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">
                  {zh ? endpoint.returns.zh : endpoint.returns.en}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Usage */}
        <section className="card-xl mb-4 p-8 sm:p-12">
          <h2 className="h-section">{zh ? '怎么用' : 'Using it'}</h2>

          <h3 className="h-card mt-8 mb-4">{zh ? '给插件市场：一次取全量' : 'For a marketplace: fetch the listing'}</h3>
          <Code>{`const res = await fetch('${SITE_URL}/api/v1/index.json')
const { plugins, generatedAt } = await res.json()

// v = passes every structural check, x = dependency compatibility
const safe = plugins.filter((p) => p.v && p.x !== 'stale')`}</Code>

          <h3 className="h-card mt-10 mb-4">{zh ? '给 CLI：装之前先查一个' : 'For a CLI: check one before installing'}</h3>
          <Code>{`const name = '@liustack/modlens'
const res = await fetch(\`${SITE_URL}/api/v1/plugins/\${name}.json\`)
if (res.status === 404) return { known: false }

const { plugin } = await res.json()
const failed = plugin.checks.filter((c) => !c.ok)
// plugin.install.warnsAllowBuilds === true means installing runs
// the package's build script on the user's machine.`}</Code>

          <h3 className="h-card mt-10 mb-4">{zh ? '只要一份白名单' : 'If you only want an allowlist'}</h3>
          <Code>{`curl -s ${SITE_URL}/api/v1/verified.json | jq '.plugins | length'`}</Code>

          <p className="mt-8 max-w-3xl text-base leading-relaxed text-ink-soft">
            {zh
              ? '数据以 CC BY 4.0 提供。请注明来源并链接回本站——不需要申请，也不会有人来收费。发现数据有误请在仓库开 issue，管道每天重跑一次。'
              : 'The data is CC BY 4.0. Attribute it and link back — there is nothing to apply for and nothing to pay. If you find a wrong result, open an issue; the pipeline reruns daily.'}
          </p>
        </section>

        {/* Caveats */}
        <section className="card-xl mb-16 p-8 sm:p-12">
          <h2 className="h-section">{zh ? '这份数据不告诉你什么' : 'What this data does not tell you'}</h2>
          <p className="mt-5 max-w-3xl text-base leading-[1.8] text-ink-soft">
            {zh
              ? '它读的是包装，不是代码。一个通过全部七项的插件，代码可能依然是恶意的、无用的，或者只是不好用。把它当作「装了必坏」的过滤器，而不是安全背书——插件运行在 dsh 进程里，权限和 dsh 一样大。'
              : 'It reads packaging, not code. A plugin passing all seven checks can still be malicious, useless, or simply bad. Treat it as a dead-on-arrival filter, not a safety endorsement — a plugin runs inside the dsh process with everything dsh can reach.'}
          </p>
        </section>
      </div>
    </>
  )
}
