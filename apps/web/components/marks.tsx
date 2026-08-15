import { type Lang, t } from '@/lib/i18n'

/**
 * Status marks as tinted capsules. No outlines anywhere — a mark is a fill, and each
 * keeps a glyph so the meaning survives without color.
 */

function tint(color: string, percent = 12): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

export function CheckedMark({ lang, ok }: { lang: Lang; ok: boolean }) {
  const color = ok ? 'var(--color-success)' : 'var(--color-danger)'
  return (
    <span className="pill" style={{ background: tint(color, 14), color }}>
      <span aria-hidden>{ok ? '✓' : '✕'}</span>
      {t(ok ? 'status.verified' : 'status.failed', lang)}
    </span>
  )
}

const COMPAT: Record<string, { glyph: string; color: string }> = {
  current: { glyph: '✓', color: 'var(--color-success)' },
  stale: { glyph: '!', color: 'var(--color-danger)' },
  undeclared: { glyph: '?', color: 'var(--color-ink-faint)' },
  unpinned: { glyph: '~', color: 'var(--color-warning)' },
  unknown: { glyph: '·', color: 'var(--color-ink-faint)' },
}

export function CompatMark({ lang, status }: { lang: Lang; status: string }) {
  const mark = COMPAT[status] ?? COMPAT['unknown']!
  return (
    <span className="pill" style={{ background: tint(mark.color), color: mark.color }}>
      <span aria-hidden>{mark.glyph}</span>
      {t(`status.${status}`, lang)}
    </span>
  )
}

export function UiMark({ lang }: { lang: Lang }) {
  return (
    <span className="pill" style={{ background: tint('var(--color-teal)', 14), color: 'var(--color-teal)' }}>
      <span aria-hidden>▤</span>
      {t('status.ui', lang)}
    </span>
  )
}

/** Neutral capsule for categories and other non-status metadata. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="pill" style={{ background: 'var(--color-ground)', color: 'var(--color-ink-soft)' }}>
      {children}
    </span>
  )
}

export function SectionHead({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-8">
      <h1 className="h-section">{children}</h1>
      {note !== undefined && <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">{note}</p>}
    </div>
  )
}
