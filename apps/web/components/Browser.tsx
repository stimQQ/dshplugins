'use client'

import { useEffect, useMemo, useState } from 'react'
import { PluginRow, type RowData } from '@/components/PluginRow'
import { type Lang, pick, t } from '@/lib/i18n'
import { CATEGORIES, type IndexRow } from '@/lib/catalog'

type Sort = 'score' | 'downloads' | 'stars' | 'newest' | 'name'

const SORTS: Sort[] = ['score', 'downloads', 'stars', 'newest', 'name']

/** How many cards render before the reader asks for more. */
const PAGE = 36

function toRow(entry: IndexRow): RowData {
  return {
    name: entry.n,
    displayName: entry.d,
    summary: entry.s,
    category: entry.c,
    verified: entry.v,
    compat: entry.x,
    hasUi: entry.b,
    downloads: entry.w,
    stars: entry.u,
  }
}

/** A selectable capsule — the system's one control shape. */
function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pill transition-colors"
      style={
        on
          ? { background: 'var(--color-orange)', color: '#fff' }
          : { background: 'var(--color-ground)', color: 'var(--color-ink-soft)' }
      }
    >
      {children}
    </button>
  )
}

/**
 * The catalogue browser.
 *
 * The server already rendered the first screen from the same ordering, so this
 * component takes over only once the full index arrives — the page is never blank
 * and never depends on JavaScript to be readable.
 */
export function Browser({
  lang,
  initial,
  initialCategory,
}: {
  lang: Lang
  initial: IndexRow[]
  initialCategory: string
}) {
  const [rows, setRows] = useState<IndexRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyUi, setOnlyUi] = useState(false)
  const [onlyCurrent, setOnlyCurrent] = useState(false)
  const [sort, setSort] = useState<Sort>('score')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    let cancelled = false
    void fetch('/data/index.json')
      .then((response) => response.json())
      .then((data: IndexRow[]) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        // Filtering stays unavailable; the server-rendered cards remain on screen.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const source = rows ?? initial

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = source.filter((entry) => {
      if (category !== 'all' && entry.c !== category) return false
      if (onlyVerified && !entry.v) return false
      if (onlyUi && !entry.b) return false
      if (onlyCurrent && entry.x !== 'current') return false
      if (needle === '') return true
      return (
        entry.n.toLowerCase().includes(needle)
        || entry.s.en.toLowerCase().includes(needle)
        || entry.s.zh.includes(needle)
        || entry.d.en.toLowerCase().includes(needle)
        || entry.d.zh.includes(needle)
      )
    })

    const sorted = [...matched]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'downloads':
          return b.w - a.w || b.r - a.r
        case 'stars':
          return b.u - a.u || b.r - a.r
        case 'newest':
          return (b.p ?? '').localeCompare(a.p ?? '') || b.r - a.r
        case 'name':
          return a.n.localeCompare(b.n)
        default:
          return b.r - a.r || a.n.localeCompare(b.n)
      }
    })
    return sorted
  }, [source, query, category, onlyVerified, onlyUi, onlyCurrent, sort])

  const toggles: { on: boolean; set: (value: boolean) => void; key: string }[] = [
    { on: onlyVerified, set: setOnlyVerified, key: 'browse.filter.verified' },
    { on: onlyUi, set: setOnlyUi, key: 'browse.filter.ui' },
    { on: onlyCurrent, set: setOnlyCurrent, key: 'browse.filter.current' },
  ]

  const dirty = query !== '' || category !== 'all' || onlyVerified || onlyUi || onlyCurrent

  return (
    <div>
      {/* Controls */}
      <div className="card mb-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE)
            }}
            placeholder={t('browse.search', lang)}
            className="flex-1 rounded-full px-4 py-2.5 text-base outline-none placeholder:text-ink-faint"
            style={{ background: 'var(--color-ground)' }}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {toggles.map((toggle) => (
              <Chip
                key={toggle.key}
                on={toggle.on}
                onClick={() => {
                  toggle.set(!toggle.on)
                  setLimit(PAGE)
                }}
              >
                {t(toggle.key, lang)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">{t('browse.sort', lang)}</span>
          {SORTS.map((option) => (
            <Chip key={option} on={sort === option} onClick={() => setSort(option)}>
              {t(`browse.sort.${option}`, lang)}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip
            on={category === 'all'}
            onClick={() => {
              setCategory('all')
              setLimit(PAGE)
            }}
          >
            {t('browse.filter.all', lang)}
          </Chip>
          {CATEGORIES.map((entry) => (
            <Chip
              key={entry.id}
              on={category === entry.id}
              onClick={() => {
                setCategory(entry.id)
                setLimit(PAGE)
              }}
            >
              {pick(entry.label, lang)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="text-base text-ink-faint">
          <span className="font-medium text-ink">{filtered.length.toLocaleString('en-US')}</span>{' '}
          {t('browse.count', lang)}
        </span>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCategory('all')
              setOnlyVerified(false)
              setOnlyUi(false)
              setOnlyCurrent(false)
              setLimit(PAGE)
            }}
            className="btn btn-plain"
          >
            {t('browse.reset', lang)}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, limit).map((entry) => (
          <PluginRow key={entry.n} lang={lang} row={toRow(entry)} />
        ))}
      </div>

      {filtered.length === 0 && <p className="py-16 text-base text-ink-soft">{t('browse.empty', lang)}</p>}

      {filtered.length > limit && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setLimit(limit + PAGE * 2)} className="btn btn-primary">
            + {Math.min(PAGE * 2, filtered.length - limit)}
          </button>
        </div>
      )}
    </div>
  )
}
