import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyLine } from '@/components/CopyLine'
import { CheckedMark, CompatMark, Tag, UiMark } from '@/components/marks'
import { isFallback, isLang, type Lang, LANGS, pick, t } from '@/lib/i18n'
import { CATEGORY_LABELS, getPlugin, LISTED_PLUGINS, nameToSegments, type Plugin } from '@/lib/registry'
import { canonical, JsonLd, softwareSchema } from '@/lib/seo'

export function generateStaticParams() {
  return LANGS.flatMap((lang) => LISTED_PLUGINS.map((plugin) => ({ lang, name: nameToSegments(plugin.name) })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; name: string[] }>
}): Promise<Metadata> {
  const { lang, name } = await params
  const plugin = getPlugin(name.map(decodeURIComponent).join('/'))
  if (plugin === undefined || !isLang(lang)) return {}
  const summary = pick(plugin.summary, lang)
  const path = `/p/${plugin.name.split('/').map(encodeURIComponent).join('/')}`
  return {
    title: plugin.name,
    description: summary.slice(0, 180),
    alternates: { canonical: canonical(lang, path), languages: { en: canonical('en', path), 'zh-CN': canonical('zh', path) } },
  }
}

/** A card section with its own heading. */
function Panel({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card p-7">
      <h2 className="h-card">{title}</h2>
      <div className="mt-4">{children}</div>
      {note !== undefined && <p className="mt-4 text-base leading-relaxed text-ink-faint">{note}</p>}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-base text-ink-faint">{label}</dt>
      <dd className="min-w-0 break-words text-right text-base">{children}</dd>
    </div>
  )
}

function Checks({ plugin, lang }: { plugin: Plugin; lang: Lang }) {
  if (plugin.checks.length === 0) {
    return (
      <p className="text-base text-ink-soft">
        {plugin.error ?? (lang === 'zh' ? '未能完成复核。' : 'Verification did not complete.')}
      </p>
    )
  }
  return (
    <ul className="space-y-2.5">
      {plugin.checks.map((check) => (
        <li key={check.id} className="flex items-start gap-3">
          <span
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
            style={{ background: check.ok ? 'var(--color-success)' : 'var(--color-danger)' }}
            aria-hidden
          >
            {check.ok ? '✓' : '✕'}
          </span>
          <div className="min-w-0">
            <div className="font-mono text-base text-ink-faint">{check.id}</div>
            <div className="mt-0.5 text-base text-ink-soft">{pick(check.detail, lang)}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function PluginPage({
  params,
}: {
  params: Promise<{ lang: string; name: string[] }>
}) {
  const { lang, name } = await params
  if (!isLang(lang)) notFound()
  const plugin = getPlugin(name.map(decodeURIComponent).join('/'))
  if (plugin === undefined) notFound()

  const summary = pick(plugin.summary, lang)
  const untranslated = isFallback(plugin.summary, lang) && summary !== ''
  const category = CATEGORY_LABELS.get(plugin.category)
  const hasUi = plugin.checks.some((check) => check.id === 'client-half-shipped' && check.ok)
  const none = t('plugin.nodata', lang)

  return (
    <article className="mx-auto max-w-[76rem] px-5 py-10 sm:px-8">
      <JsonLd
        data={softwareSchema({
          name: plugin.name,
          version: plugin.version,
          summary,
          license: plugin.license,
          repository: plugin.repository,
          npmUrl: plugin.npm.url,
        })}
      />
      <Link href={`/${lang}/plugins/`} className="btn btn-plain -ml-3">
        ← {t('plugin.back', lang)}
      </Link>

      <header className="mt-4">
        <h1 className="h-section font-mono break-all">{plugin.name}</h1>
        {pick(plugin.displayName, lang) !== plugin.name && (
          <p className="mt-2 text-lg text-ink-soft">{pick(plugin.displayName, lang)}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <CheckedMark lang={lang} ok={plugin.verified} />
          <CompatMark lang={lang} status={plugin.compat.status} />
          {hasUi && <UiMark lang={lang} />}
          <Tag>v{plugin.version}</Tag>
          {category !== undefined && <Tag>{pick(category, lang)}</Tag>}
        </div>
        {summary !== '' && (
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
            {summary}
            {untranslated && (
              <span className="ml-2 align-middle text-base text-ink-faint">[{t('plugin.untranslated', lang)}]</span>
            )}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel title={t('plugin.install', lang)} note={t('plugin.install.note', lang)}>
            <CopyLine command={plugin.install.command} lang={lang} />
            {plugin.install.warnsAllowBuilds && (
              <p
                className="mt-4 rounded-2xl p-4 text-base leading-relaxed"
                style={{
                  background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                  color: 'var(--color-warning)',
                }}
              >
                {lang === 'zh'
                  ? '这个包只发布了源码。安装会在你的机器上执行它的构建脚本，且不在任何沙箱内——只对你信任其源码的包这样做。'
                  : 'This package ships source only. Installing runs its build script on your machine, outside any sandbox — only do this for source you trust.'}
              </p>
            )}
          </Panel>

          <Panel title={t('plugin.checks', lang)}>
            <Checks plugin={plugin} lang={lang} />
          </Panel>

          {plugin.patchRows.length > 0 && (
            <Panel title={t('plugin.mounts', lang)} note={t('plugin.mounts.note', lang)}>
              <div className="space-y-2">
                {plugin.patchRows.map((row, index) => (
                  <div
                    key={`${row.id}-${index}`}
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--color-ground)' }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="label">{row.op}</span>
                      <span className="font-mono text-base font-medium">{row.id === '' ? '—' : row.id}</span>
                      <span className="font-mono text-base break-all text-ink-soft">{row.name}</span>
                    </div>
                    {row.configKeys.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.configKeys.map((key) => (
                          <Tag key={key}>
                            <span className="font-mono">{key}</span>
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {plugin.compat.findings.length > 0 && (
            <Panel title={t('plugin.compat', lang)} note={t('plugin.compat.note', lang)}>
              <div className="space-y-1">
                {plugin.compat.findings.map((finding) => (
                  <div
                    key={finding.packageName}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
                  >
                    <span className="font-mono text-base break-all text-ink-soft">{finding.packageName}</span>
                    <span className="flex items-center gap-2.5">
                      <span className="font-mono text-base">{finding.range}</span>
                      <span className="font-mono text-base text-ink-faint">→ {finding.current ?? '?'}</span>
                      <CompatMark lang={lang} status={finding.status} />
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="min-w-0">
          <Panel title={t('plugin.meta', lang)}>
            <dl>
              <Field label="npm">
                <a
                  href={plugin.npm.url}
                  className="font-mono break-all hover:text-orange"
                  target="_blank"
                  rel="noreferrer"
                >
                  {plugin.name} ↗
                </a>
              </Field>
              {plugin.repository !== null && (
                <Field label="GitHub">
                  <a href={plugin.repository} className="hover:text-orange" target="_blank" rel="noreferrer">
                    {plugin.repository.replace('https://github.com/', '')}
                  </a>
                </Field>
              )}
              <Field label={lang === 'zh' ? '作者' : 'Author'}>{plugin.author ?? none}</Field>
              <Field label={lang === 'zh' ? '许可证' : 'License'}>{plugin.license ?? none}</Field>
              <Field label={lang === 'zh' ? '发布' : 'Published'}>{plugin.publishedAt?.slice(0, 10) ?? none}</Field>
              <Field label={lang === 'zh' ? '周下载' : 'Downloads/wk'}>
                {(plugin.npm.downloadsLastWeek ?? 0).toLocaleString('en-US')}
              </Field>
              {plugin.github !== null && (
                <Field label="Stars">{plugin.github.stars.toLocaleString('en-US')}</Field>
              )}
              <Field label={lang === 'zh' ? '解包体积' : 'Unpacked'}>
                {plugin.npm.unpackedSize === null ? none : `${Math.round(plugin.npm.unpackedSize / 1024)} KB`}
              </Field>
              <Field label={t('plugin.category.reason', lang)}>
                <span className="font-mono text-base">
                  {plugin.categorySource}
                  {plugin.categoryEvidence !== '' && ` · ${plugin.categoryEvidence}`}
                </span>
              </Field>
            </dl>
            {plugin.keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {plugin.keywords.slice(0, 12).map((keyword) => (
                  <Tag key={keyword}>{keyword}</Tag>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </article>
  )
}
