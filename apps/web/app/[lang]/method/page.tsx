import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SectionHead } from '@/components/marks'
import { isLang, LANGS, t } from '@/lib/i18n'
import { STATS } from '@/lib/registry'
import { canonical } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

/** Each check, stated as the question it answers and what a failure means downstream. */
const CHECKS = [
  {
    id: 'declares-bundle',
    zh: ['这个包声明了配置层吗？', '没有 dsh.bundle.patch 的包不会成为 profile 的一层。它可能是给别的插件 import 的库，也可能是作者以为自己发了个插件。'],
    en: [
      'Does the package declare a config layer?',
      'Without dsh.bundle.patch it never becomes a profile layer. It may be a library other plugins import — or an author who thinks they shipped a plugin.',
    ],
  },
  {
    id: 'patch-shipped',
    zh: ['声明的 patch 文件真的在发布包里吗？', 'package.json 的 files 数组漏掉它不会有任何报错，直到 dsh 启动时找不到这个文件。'],
    en: [
      'Did the declared patch file actually ship?',
      'Omitting it from the files array produces no error at publish time — only at boot, when dsh cannot find it.',
    ],
  },
  {
    id: 'patch-parses',
    zh: ['patch 能解析出插件行吗？', '我们按 YAML 解析它（保留 cordis 的 !!js 表达式标签但不求值），数出它插入或替换了几行。'],
    en: [
      'Does the patch parse into plugin rows?',
      "We parse it as YAML — preserving cordis's !!js expression tag without evaluating it — and count the rows it inserts or replaces.",
    ],
  },
  {
    id: 'rows-resolvable',
    zh: ['每个插件行都能在用户机器上解析吗？', '教程教本地开发者写绝对路径，作者原样发布出去，于是这一行指向的是作者自己的硬盘。这类包装上必坏。'],
    en: [
      "Can every row resolve on a user's machine?",
      'The tutorial tells local developers to write an absolute path; authors publish it verbatim, so the row points at their own disk. These are dead on arrival.',
    ],
  },
  {
    id: 'entry-shipped',
    zh: ['声明的入口模块在包里吗？', '我们按 exports["."]、main、module 的顺序取入口路径，然后在 tarball 的文件列表里找它。'],
    en: [
      'Is the declared entry module present?',
      'We take the entry from exports["."], then main, then module, and look for that path in the tarball listing.',
    ],
  },
  {
    id: 'prebuilt',
    zh: ['安装时需要执行构建脚本吗？', '预构建的包安装过程不跑这个包的任何代码。只发源码的包需要用户授权构建——那等于允许它在你机器上执行代码。'],
    en: [
      'Does installing run a build script?',
      'A prebuilt package executes none of its own code during install. A source-only package needs build authorization — which is permission to run its code on your machine.',
    ],
  },
  {
    id: 'client-half-shipped',
    zh: ['声明了界面，那 ./client 导出发出来了吗？', '半数插件有浏览器半侧，它通过 exports["./client"] 加载。这个产物很容易漏进 files——漏了之后插件装得上、也能启动，界面就是永远不出现。'],
    en: [
      'If it declares a UI, did the ./client export ship?',
      'Half the ecosystem has a browser half loaded through exports["./client"]. That output is easy to leave out of files — and then the plugin installs and boots fine while its UI never appears.',
    ],
  },
]

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params
  const lang = isLang(raw) ? raw : 'en'
  const title = lang === 'zh' ? '核验方法 · 每个插件是怎么被检查的' : 'How every plugin here is checked'
  const description =
    lang === 'zh'
      ? '七项结构复核逐项说明：patch 是否随包发布、插件行能否解析、浏览器半侧是否存在、依赖版本是否还有效。以及为什么不按 star 和下载量排序。'
      : 'The seven structural checks explained: whether the patch ships, whether plugin rows resolve, whether the declared browser half exists, and whether the dsh dependency range still resolves. Plus why nothing is ranked by stars or downloads.'
  return {
    title,
    description,
    alternates: {
      canonical: canonical(lang, '/method'),
      languages: { en: canonical('en', '/method'), 'zh-CN': canonical('zh', '/method') },
    },
    openGraph: { title, description, url: canonical(lang, '/method'), type: 'article' },
  }
}

export default async function Method({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const zh = lang === 'zh'

  return (
    <section className="mx-auto max-w-[76rem] px-5 py-12 sm:px-8">
      <SectionHead
        note={
          zh
            ? '每条记录都来自三步：从 npm 抓候选、拉发布包逐项复核、再富化排序。全部可复现，没有人工评级。'
            : 'Every entry comes from three steps: crawl npm for candidates, pull the tarball and check it, then enrich and rank. Fully reproducible, no human rating.'
        }
      >
        {t('method.title', lang)}
      </SectionHead>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card-xl min-w-0 p-8 sm:p-12">
          <h2 className="h-card mb-4">
            {zh ? '为什么不按 star 和下载量排' : 'Why not rank by stars and downloads'}
          </h2>
          <p className="mb-4 text-base leading-[1.8] text-ink-soft">
            {zh
              ? `dsh 的第一个 npm 包发布于 2026-08-10，仓库 08-13 公开。这份目录里 ${STATS.totals.installable} 个可安装插件全部发布于 08-13 之后——没有一个例外。社交信号还没有时间形成：下载量几乎全是 0，star 主要反映谁先发了推文。`
              : `The first dsh package hit npm on 2026-08-10 and the repository went public on 08-13. All ${STATS.totals.installable} installable plugins here were published after that — no exceptions. Social signals have had no time to form: downloads are almost all zero and stars mostly record who tweeted first.`}
          </p>
          <p className="mb-4 text-base leading-[1.8] text-ink-soft">
            {zh
              ? '所以排序用的是结构性证据：包装是否正确、依赖版本是否还在、元数据是否完整。下载量和 star 仍然计入，但取对数并封顶，避免它们在样本还没意义的时候主导排序。'
              : 'So ranking uses structural evidence instead: whether the packaging is correct, whether the dependency ranges still resolve, whether the metadata is complete. Downloads and stars still count, but log-scaled and capped so they cannot dominate while the sample is meaningless.'}
          </p>

          <h2 className="h-card mt-12 mb-4">
            {zh ? '七项复核' : 'The seven checks'}
          </h2>
          <div className="space-y-3">
            {CHECKS.map((check) => (
              <div key={check.id} className="rounded-2xl p-5" style={{ background: 'var(--color-ground)' }}>
                <div className="font-mono text-base" style={{ color: 'var(--color-orange)' }}>{check.id}</div>
                <div className="mt-1.5 text-base font-medium">{zh ? check.zh[0] : check.en[0]}</div>
                <p className="mt-1.5 text-base leading-[1.75] text-ink-soft">{zh ? check.zh[1] : check.en[1]}</p>
              </div>
            ))}
          </div>

          <h2 className="h-card mt-12 mb-4">
            {zh ? '版本兼容这一项要单独说' : 'Version compatibility, separately'}
          </h2>
          <p className="mb-4 text-base leading-[1.8] text-ink-soft">
            {zh
              ? 'dsh 三天里从 0.0.1-rc.1 走到 0.1.0-rc.6。判断一个插件的依赖区间是否还有效，参照的必须是「已发布的最高版本」，而不是 npm 的 latest 标签——dsh 的库包把当前版本发在 next 标签上，latest 还停在首日的 0.0.1-rc.1。拿 latest 去比，会把所有跟上进度的插件误判成过期。'
              : 'dsh moved 0.0.1-rc.1 → 0.1.0-rc.6 in three days. Judging whether a range still resolves has to reference the highest published version, not npm\'s latest tag: the dsh library packages promote current releases on next while latest still points at the first-day 0.0.1-rc.1. Comparing against latest marks every up-to-date plugin stale.'}
          </p>
          <p className="text-base leading-[1.8] text-ink-soft">
            {zh
              ? `当前分布：${STATS.compat.current} 个版本当前，${STATS.compat.stale} 个已过期，${STATS.compat.undeclared} 个没有声明任何 dsh 依赖（靠宿主提升解析），${STATS.compat.unpinned} 个用了 * 这样的通配区间。`
              : `Current spread: ${STATS.compat.current} current, ${STATS.compat.stale} stale, ${STATS.compat.undeclared} declaring no dsh dependency at all (relying on host hoisting), and ${STATS.compat.unpinned} using a wildcard range.`}
          </p>

          <h2 className="h-card mt-12 mb-4">
            {zh ? '这些检查不告诉你什么' : 'What the checks do not tell you'}
          </h2>
          <p className="text-base leading-[1.8] text-ink-soft">
            {zh
              ? '它们读的是包装，不是代码。一个通过全部七项的插件，代码可能依然是恶意的、无用的，或者只是不好用。复核能排除「装了必坏」，不能替你判断「值不值得装」——插件运行在 dsh 进程里，权限和 dsh 一样大。'
              : 'They read packaging, not code. A plugin passing all seven can still be malicious, useless, or simply bad. Checking rules out dead-on-arrival; it does not decide whether something is worth installing — a plugin runs inside the dsh process with everything dsh can reach.'}
          </p>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-6">
          <div className="label mb-3">{zh ? '数据来源' : 'Sources'}</div>
          <dl>
            {[
              ['npm registry', zh ? 'keywords:dsh-plugin 等 6 条查询' : 'six queries incl. keywords:dsh-plugin'],
              [zh ? '发布包' : 'tarballs', zh ? '逐个下载并读取文件清单' : 'downloaded and listed per package'],
              ['GitHub API', zh ? 'star / 推送时间 / 归档状态' : 'stars, pushed-at, archived'],
              [zh ? '下载量' : 'downloads', zh ? 'npm 周下载量接口' : 'npm weekly downloads endpoint'],
            ].map(([term, detail]) => (
              <div key={term} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="shrink-0 text-base text-ink-faint">{term}</dt>
                <dd className="text-right text-base text-ink-soft">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-base leading-relaxed text-ink-faint">
            {zh
              ? `本次生成索引 ${STATS.totals.indexed} 个包，其中 ${STATS.totals.installable} 个是可安装插件，${STATS.totals.withBrowserHalf} 个带浏览器界面。`
              : `This run indexed ${STATS.totals.indexed} packages: ${STATS.totals.installable} installable plugins, ${STATS.totals.withBrowserHalf} with a browser half.`}
          </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
