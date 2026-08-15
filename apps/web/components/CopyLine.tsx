'use client'

import { useState } from 'react'
import { type Lang, t } from '@/lib/i18n'

/** A command the reader is meant to run, on a sunk surface with no outline. */
export function CopyLine({ command, lang }: { command: string; lang: Lang }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(command).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => {
        // Clipboard denied; the command stays selectable on screen.
      },
    )
  }

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-5 py-4"
      style={{ background: 'var(--color-ground)' }}
    >
      <span className="select-none font-mono text-base" style={{ color: 'var(--color-orange)' }} aria-hidden>
        $
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-base">{command}</code>
      <button
        type="button"
        onClick={copy}
        className="pill shrink-0 transition-colors"
        style={
          copied
            ? { background: 'var(--color-success)', color: '#fff' }
            : { background: 'var(--color-card)', color: 'var(--color-ink-soft)' }
        }
      >
        {t(copied ? 'plugin.copied' : 'plugin.copy', lang)}
      </button>
    </div>
  )
}
