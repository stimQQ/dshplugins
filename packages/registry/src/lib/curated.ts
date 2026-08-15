/**
 * Curated translations.
 *
 * Plugin summaries are written by their authors in one language. Rather than machine-
 * translate them at build time, translations are written once, by hand, with the
 * package name, keywords, and mounted rows in view — the context that decides whether
 * `视觉代理` is "a vision proxy" or "a vision agent", and that keeps product names
 * like 锤子便签 from becoming "hammer sticky notes".
 *
 * Each entry stores a snapshot of the source text it was translated from. When an
 * author republishes with a new description the snapshot stops matching, and the
 * pipeline drops the stale translation instead of silently showing a summary that no
 * longer describes the package.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PACKAGE_ROOT } from './paths.ts'

export const CURATED_FILE = join(PACKAGE_ROOT, 'curated', 'translations.json')

export interface CuratedEntry {
  /** The author's text this translation was made from. */
  source: string
  /** The translation. */
  target: string
}

/** `packageName` -> translation, one direction per file section. */
export interface CuratedFile {
  /** Chinese author text translated into English. */
  zhToEn: Record<string, CuratedEntry>
  /** English author text translated into Chinese. */
  enToZh: Record<string, CuratedEntry>
}

export interface CuratedIndex {
  file: CuratedFile
  /** Names whose stored source no longer matches the published description. */
  stale: string[]
  /** Names with a translation that still matches. */
  applied: string[]
}

const EMPTY: CuratedFile = { zhToEn: {}, enToZh: {} }

export async function loadCurated(): Promise<CuratedFile> {
  try {
    const raw = await readFile(CURATED_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<CuratedFile>
    return { zhToEn: parsed.zhToEn ?? {}, enToZh: parsed.enToZh ?? {} }
  } catch {
    return EMPTY
  }
}

/**
 * Resolve one package's translation.
 *
 * @param entry - the stored translation, if any.
 * @param current - the description as published today.
 * @returns the translation when its snapshot still matches, else null.
 */
export function resolve(entry: CuratedEntry | undefined, current: string): string | null {
  if (entry === undefined) return null
  if (entry.source.trim() !== current.trim()) return null
  return entry.target
}
