/**
 * Category derivation.
 *
 * The ecosystem has no taxonomy: of 719 installable plugins, 7 declare a category.
 * So the registry derives one, from evidence in this order — an author's explicit
 * `dsh.plugin.category` always wins, then what the plugin actually mounts (its patch
 * rows and dsh dependencies, which are facts), then its keywords and name, then its
 * description prose (the weakest evidence, and the easiest to write misleadingly).
 *
 * Every assignment records the rule that fired so a detail page can show its reason
 * and an author can see exactly why their plugin landed where it did.
 */

import type { NpmManifest, PatchRow } from './types.ts'

export interface Category {
  id: string
  label: { en: string; zh: string }
}

/** The registry's taxonomy. Order is the display order on the browse page. */
export const CATEGORIES: Category[] = [
  { id: 'llm-provider', label: { en: 'Model providers', zh: '模型提供方' } },
  { id: 'web-ui', label: { en: 'Web UI', zh: 'Web 界面' } },
  { id: 'tools', label: { en: 'Model tools', zh: '模型工具' } },
  { id: 'integration', label: { en: 'Integrations & bridges', zh: '集成与桥接' } },
  { id: 'vision', label: { en: 'Vision & multimodal', zh: '视觉与多模态' } },
  { id: 'memory', label: { en: 'Memory & context', zh: '记忆与上下文' } },
  { id: 'session', label: { en: 'Sessions & history', zh: '会话与历史' } },
  { id: 'search', label: { en: 'Search & retrieval', zh: '搜索与检索' } },
  { id: 'sandbox', label: { en: 'Sandbox & security', zh: '沙箱与安全' } },
  { id: 'workflow', label: { en: 'Workflow & automation', zh: '工作流与自动化' } },
  { id: 'devtools', label: { en: 'Developer tools', zh: '开发者工具' } },
  { id: 'preset', label: { en: 'Presets & agents', zh: 'Preset 与 agent' } },
  { id: 'skill', label: { en: 'Skills', zh: '技能' } },
  { id: 'observability', label: { en: 'Usage & observability', zh: '用量与可观测' } },
  { id: 'other', label: { en: 'Other', zh: '其他' } },
]

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id))

/** Which evidence produced the category, surfaced on the detail page. */
export type CategorySource = 'declared' | 'dependency' | 'patch-row' | 'keyword' | 'name' | 'description' | 'default'

export interface CategoryAssignment {
  category: string
  source: CategorySource
  /** The matched token, so the reason reads concretely. */
  evidence: string
}

/**
 * Substring rules over lowercase text, in two tiers.
 *
 * Tier 1 names a subject domain; tier 2 names a mechanism. A vision toolkit calls the
 * LLM service and a search plugin registers a tool, so mechanism evidence alone would
 * file both under the wrong heading — the domain has to win when both are present.
 */
const SPECIFIC_RULES: { category: string; tokens: string[] }[] = [
  { category: 'vision', tokens: ['vision', 'ocr', 'screenshot', 'multimodal', 'visual', 'image'] },
  { category: 'search', tokens: ['search', 'tavily', 'exa', 'serp', 'retrieval', 'rag'] },
  { category: 'memory', tokens: ['memory', 'knowledge-base', 'context-manager', 'compaction', 'recall'] },
  { category: 'integration', tokens: ['feishu', 'lark', 'wechat', 'telegram', 'slack', 'discord', 'qq', 'dingtalk', 'gitlab', 'jira', 'notion', 'koishi', 'onebot'] },
  { category: 'session', tokens: ['session', 'history', 'transcript', 'conversation-import', 'chat-import'] },
  { category: 'sandbox', tokens: ['sandbox', 'e2b', 'landlock', 'firejail', 'permission'] },
  { category: 'observability', tokens: ['token-meter', 'telemetry', 'billing', 'quota', 'usage', 'cost', 'audit'] },
  { category: 'workflow', tokens: ['workflow', 'ralph', 'orchestr', 'scheduler', 'cron'] },
  { category: 'skill', tokens: ['skill'] },
  { category: 'preset', tokens: ['preset', 'subagent', 'persona'] },
  { category: 'llm-provider', tokens: ['llm-provider', 'model-provider', 'openai', 'anthropic', 'claude-code', 'gemini', 'ollama', 'openrouter', 'siliconflow'] },
]

const GENERIC_RULES: { category: string; tokens: string[] }[] = [
  { category: 'llm-provider', tokens: ['adapter', 'provider', 'llm', 'model'] },
  { category: 'integration', tokens: ['bridge', 'mcp', 'github', 'webhook'] },
  { category: 'devtools', tokens: ['devtool', 'debug', 'inspector', 'lint', 'profiler', 'diagnostic', 'test'] },
  { category: 'automation', tokens: ['automation', 'pipeline'] },
  { category: 'security', tokens: ['docker', 'security'] },
  { category: 'tools', tokens: ['tool', 'bash', 'terminal', 'filesystem', 'editor', 'lsp'] },
  { category: 'web-ui', tokens: ['web-ui', 'webui', 'theme', 'sidebar', 'gui', 'frontend', 'ui'] },
]

/** Generic rule categories that are aliases of a taxonomy entry. */
const CATEGORY_ALIASES: Record<string, string> = { automation: 'workflow', security: 'sandbox' }

/** dsh dependencies that betray a plugin's role regardless of how it is described. */
const DEPENDENCY_RULES: { category: string; packages: string[] }[] = [
  { category: 'llm-provider', packages: ['@deepseek-ai/dsh-llm'] },
  { category: 'skill', packages: ['@deepseek-ai/dsh-skill'] },
  { category: 'sandbox', packages: ['@deepseek-ai/dsh-sandbox'] },
  { category: 'workflow', packages: ['@deepseek-ai/dsh-workflow', '@deepseek-ai/dsh-jobs'] },
  { category: 'session', packages: ['@deepseek-ai/dsh-session-query'] },
  { category: 'tools', packages: ['@deepseek-ai/dsh-tools'] },
]

/** Find the first matching rule in one tier. */
function matchTier(
  rules: { category: string; tokens: string[] }[],
  texts: string[],
): { category: string; evidence: string } | null {
  const haystack = texts.join(' ').toLowerCase()
  for (const rule of rules) {
    for (const token of rule.tokens) {
      if (haystack.includes(token)) {
        return { category: CATEGORY_ALIASES[rule.category] ?? rule.category, evidence: token }
      }
    }
  }
  return null
}

/**
 * Assign one category to a plugin.
 * @param manifest - the package manifest.
 * @param patchRows - rows the plugin's patch mounts, from verification.
 * @returns the category with the rule that produced it.
 */
export function categorize(manifest: NpmManifest, patchRows: PatchRow[]): CategoryAssignment {
  const declared = manifest.dsh?.plugin?.category
  if (typeof declared === 'string' && CATEGORY_IDS.has(declared)) {
    return { category: declared, source: 'declared', evidence: declared }
  }

  // Domain evidence first, in descending order of how deliberately it was written.
  const identity = [manifest.name, ...(manifest.keywords ?? [])]
  const specificIdentity = matchTier(SPECIFIC_RULES, identity)
  if (specificIdentity !== null) return { ...specificIdentity, source: 'name' }

  const specificRows = matchTier(SPECIFIC_RULES, patchRows.map((row) => `${row.id} ${row.name}`))
  if (specificRows !== null) return { ...specificRows, source: 'patch-row' }

  const specificDescription = matchTier(SPECIFIC_RULES, [manifest.description ?? ''])
  if (specificDescription !== null) return { ...specificDescription, source: 'description' }

  // Only once no domain is named does the mechanism decide.
  const dependencies = new Set(Object.keys({ ...(manifest.dependencies ?? {}), ...(manifest.peerDependencies ?? {}) }))
  for (const rule of DEPENDENCY_RULES) {
    for (const packageName of rule.packages) {
      if (dependencies.has(packageName)) return { category: rule.category, source: 'dependency', evidence: packageName }
    }
  }

  const genericIdentity = matchTier(GENERIC_RULES, identity)
  if (genericIdentity !== null) return { ...genericIdentity, source: 'name' }

  // A browser half with no other signal is a UI plugin — that is what it is.
  if (manifest.dsh?.client !== undefined) {
    return { category: 'web-ui', source: 'dependency', evidence: 'dsh.client' }
  }

  const genericDescription = matchTier(GENERIC_RULES, [manifest.description ?? ''])
  if (genericDescription !== null) return { ...genericDescription, source: 'description' }

  return { category: 'other', source: 'default', evidence: '' }
}
