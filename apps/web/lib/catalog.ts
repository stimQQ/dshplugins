/**
 * Catalogue vocabulary: types, the taxonomy, and URL shapes.
 *
 * Deliberately free of data imports. Client components need these constants, and a
 * single import of the registry JSON from a client module would pull the whole
 * corpus into the browser bundle.
 */

import type { Lang } from './i18n'

export interface Check {
  id: string
  ok: boolean
  detail: { en: string; zh: string }
}

export interface CompatFinding {
  packageName: string
  range: string
  current: string | null
  status: string
}

export interface PatchRow {
  id: string
  name: string
  op: string
  configKeys: string[]
}

export interface Plugin {
  name: string
  version: string
  kind: string
  displayName: { en: string; zh: string }
  summary: { en: string; zh: string }
  category: string
  categorySource: string
  categoryEvidence: string
  keywords: string[]
  license: string | null
  author: string | null
  homepage: string | null
  repository: string | null
  publishedAt: string | null
  verified: boolean
  checks: Check[]
  compat: { status: string; findings: CompatFinding[] }
  requiresBuild: boolean
  patchRows: PatchRow[]
  error: string | null
  install: { command: string; warnsAllowBuilds: boolean }
  npm: { url: string; downloadsLastWeek: number | null; unpackedSize: number | null }
  github: { fullName: string; stars: number; forks: number; pushedAt: string; archived: boolean } | null
  score: number
}

/** The compact listing row the browse page filters over. */
export interface IndexRow {
  n: string
  d: { en: string; zh: string }
  s: { en: string; zh: string }
  c: string
  k: string
  v: boolean
  x: string
  u: number
  w: number
  p: string | null
  r: number
  b: boolean
}

export interface Stats {
  generatedAt: string
  totals: { indexed: number; installable: number; verified: number; withBrowserHalf: number; requiresBuild: number }
  compat: { current: number; stale: number; undeclared: number; unpinned: number }
  byCategory: Record<string, number>
  byDay: Record<string, number>
}

/**
 * A package name maps to URL segments directly, so `@scope/pkg` becomes two
 * segments and the address bar keeps the name a reader can recognize.
 */
export function nameToSegments(name: string): string[] {
  return name.split('/')
}

export function pluginHref(lang: Lang, name: string): string {
  return `/${lang}/p/${nameToSegments(name).map(encodeURIComponent).join('/')}/`
}

/** Category ids and labels, mirroring the registry taxonomy. */
export const CATEGORIES: { id: string; label: { en: string; zh: string } }[] = [
  { id: 'llm-provider', label: { en: 'Model providers', zh: '模型提供方' } },
  { id: 'web-ui', label: { en: 'Web UI', zh: 'Web 界面' } },
  { id: 'tools', label: { en: 'Model tools', zh: '模型工具' } },
  { id: 'integration', label: { en: 'Integrations', zh: '集成与桥接' } },
  { id: 'vision', label: { en: 'Vision', zh: '视觉与多模态' } },
  { id: 'memory', label: { en: 'Memory', zh: '记忆与上下文' } },
  { id: 'session', label: { en: 'Sessions', zh: '会话与历史' } },
  { id: 'search', label: { en: 'Search', zh: '搜索与检索' } },
  { id: 'sandbox', label: { en: 'Sandbox', zh: '沙箱与安全' } },
  { id: 'workflow', label: { en: 'Workflow', zh: '工作流' } },
  { id: 'devtools', label: { en: 'Dev tools', zh: '开发者工具' } },
  { id: 'preset', label: { en: 'Presets', zh: 'Preset' } },
  { id: 'skill', label: { en: 'Skills', zh: '技能' } },
  { id: 'observability', label: { en: 'Usage', zh: '用量与可观测' } },
  { id: 'other', label: { en: 'Other', zh: '其他' } },
]

export const CATEGORY_LABELS = new Map(CATEGORIES.map((category) => [category.id, category.label]))
