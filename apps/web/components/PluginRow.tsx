import Link from 'next/link'
import { isFallback, type Lang, pick } from '@/lib/i18n'
import { CATEGORY_LABELS, pluginHref } from '@/lib/catalog'
import { CompatMark, Tag, UiMark } from './marks'

export interface RowData {
  name: string
  displayName: { en: string; zh: string }
  summary: { en: string; zh: string }
  category: string
  verified: boolean
  compat: string
  hasUi: boolean
  downloads: number
  stars: number
}

/** One catalogue entry: a large-radius surface separated from the ground by tone alone. */
export function PluginRow({ row, lang }: { row: RowData; lang: Lang; index?: number }) {
  const summary = pick(row.summary, lang)
  const untranslated = isFallback(row.summary, lang) && summary !== ''
  const label = CATEGORY_LABELS.get(row.category)
  const display = pick(row.displayName, lang)

  return (
    <Link href={pluginHref(lang, row.name)} className="card lift group block h-full p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate font-mono text-base font-medium transition-colors group-hover:text-orange">
          {row.name}
        </h3>
        <span
          className="mt-0.5 shrink-0 text-base"
          style={{ color: row.verified ? 'var(--color-success)' : 'var(--color-danger)' }}
          aria-hidden
        >
          {row.verified ? '✓' : '✕'}
        </span>
      </div>

      {display !== row.name && <p className="mt-1 truncate text-sm text-ink-faint">{display}</p>}

      <p className="mt-3 line-clamp-3 min-h-[3.9em] text-base leading-[1.6] text-ink-soft">
        {summary === '' ? <span className="text-ink-faint">—</span> : summary}
        {untranslated && <span className="ml-1.5 align-middle text-sm text-ink-faint">[原文]</span>}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {label !== undefined && <Tag>{pick(label, lang)}</Tag>}
        {row.hasUi && <UiMark lang={lang} />}
        <CompatMark lang={lang} status={row.compat} />
        {row.downloads > 0 && <Tag>↓ {row.downloads.toLocaleString('en-US')}</Tag>}
      </div>
    </Link>
  )
}
