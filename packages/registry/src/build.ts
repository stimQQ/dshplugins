/**
 * Stage 3 — enrich, categorize, rank, and emit the registry the site reads.
 *
 * Output: data/plugins.json (the corpus) and data/stats.json (the ecosystem numbers
 * the homepage quotes). Both are committed, so the site builds with no network.
 */

import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { categorize, CATEGORIES } from './lib/categorize.ts'
import { type CuratedFile, loadCurated, resolve } from './lib/curated.ts'
import { fetchJson, mapLimit } from './lib/http.ts'
import { INDEX_FILE, PLUGINS_FILE, STATS_FILE, VERIFIED_FILE } from './lib/paths.ts'
import type { GithubInfo, I18nText, NpmManifest, PluginRecord, VerifiedPackage } from './lib/types.ts'

/**
 * Score weights, kept as one table so the site can render the same breakdown it
 * ranks by. Social signals are deliberately capped low: the whole ecosystem is days
 * old, so downloads and stars mostly encode publish time, not quality.
 */
const WEIGHTS = {
  verified: 40,
  compat: { current: 15, unpinned: 8, undeclared: 8, unknown: 5, stale: 0 },
  hasRepository: 5,
  hasLicense: 3,
  hasDescription: 3,
  hasKeywords: 2,
  declaresStoreMetadata: 5,
  mountsRows: 5,
  hasBrowserHalf: 3,
  maxDownloads: 15,
  maxStars: 10,
} as const

/** Text is treated as Chinese when CJK characters make up a meaningful share. */
function isChinese(text: string): boolean {
  const cjk = text.match(/[一-鿿]/g)?.length ?? 0
  return cjk > 0 && cjk / text.length > 0.15
}

/**
 * Build a bilingual field.
 *
 * Three sources, in order: the author's own i18n metadata, a curated hand translation,
 * and the author's single-language text. Nothing is machine-translated here — a side
 * with no source and no curated entry stays empty, and the site shows the original
 * with a language tag rather than a fabricated string.
 *
 * @param declared - the author's `dsh.plugin.summary` i18n map, when present.
 * @param fallback - the author's plain description.
 * @param curated - a hand translation whose snapshot still matches `fallback`.
 */
function bilingual(
  declared: Record<string, string> | undefined,
  fallback: string,
  curated: { toEn: string | null; toZh: string | null },
): I18nText {
  const en = declared?.['en'] ?? declared?.['en-US']
  const zh = declared?.['zh'] ?? declared?.['zh-CN']
  if (en !== undefined || zh !== undefined) {
    return { en: en ?? zh ?? fallback, zh: zh ?? en ?? fallback }
  }
  if (isChinese(fallback)) return { en: curated.toEn ?? '', zh: fallback }
  return { en: fallback, zh: curated.toZh ?? '' }
}

/** `owner/repo` from any of the repository URL forms npm accepts. */
function githubSlug(manifest: NpmManifest): string | null {
  const repository = manifest.repository
  const url = typeof repository === 'string' ? repository : repository?.url
  if (typeof url !== 'string') return null
  const match = url.match(/github\.com[:/]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[#?].*)?$/)
  return match === null ? null : `${match[1]}/${match[2]}`
}

/** A GitHub token from the environment, or the one the `gh` CLI already holds. */
function githubToken(): string | null {
  if (process.env['GITHUB_TOKEN'] !== undefined) return process.env['GITHUB_TOKEN']
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

/**
 * Weekly downloads for every package.
 *
 * npm's bulk endpoint takes up to 128 unscoped names per call but rejects scoped
 * ones, so scoped packages are fetched individually.
 */
async function fetchDownloads(names: string[]): Promise<Map<string, number>> {
  const downloads = new Map<string, number>()
  const unscoped = names.filter((name) => !name.startsWith('@'))
  const scoped = names.filter((name) => name.startsWith('@'))

  const batches: string[][] = []
  for (let index = 0; index < unscoped.length; index += 128) batches.push(unscoped.slice(index, index + 128))

  await mapLimit(batches, 4, async (batch) => {
    const response = await fetchJson<Record<string, { downloads?: number } | null>>(
      `https://api.npmjs.org/downloads/point/last-week/${batch.join(',')}`,
      { allow404: true },
    )
    for (const [name, entry] of Object.entries(response ?? {})) {
      if (entry !== null && typeof entry.downloads === 'number') downloads.set(name, entry.downloads)
    }
  })

  await mapLimit(scoped, 10, async (name) => {
    const response = await fetchJson<{ downloads?: number }>(
      `https://api.npmjs.org/downloads/point/last-week/${name}`,
      { allow404: true },
    )
    if (typeof response?.downloads === 'number') downloads.set(name, response.downloads)
  })

  return downloads
}

/** Repository facts for every plugin that links to GitHub. */
async function fetchGithub(slugs: string[], token: string | null): Promise<Map<string, GithubInfo>> {
  const info = new Map<string, GithubInfo>()
  if (token === null) {
    console.log('  no GitHub token available — skipping repository enrichment')
    return info
  }
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }
  await mapLimit(
    slugs,
    8,
    async (slug) => {
      const repo = await fetchJson<{
        full_name: string
        stargazers_count: number
        forks_count: number
        open_issues_count: number
        pushed_at: string
        topics?: string[]
        archived: boolean
      }>(`https://api.github.com/repos/${slug}`, { headers, allow404: true })
      if (repo === null) return
      info.set(slug, {
        fullName: repo.full_name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        pushedAt: repo.pushed_at,
        topics: repo.topics ?? [],
        archived: repo.archived,
      })
    },
    (done, total) => {
      if (done % 100 === 0 || done === total) console.log(`  github ${done}/${total}`)
    },
  )
  return info
}

/** The transparent composite score; see WEIGHTS for why social signals are capped. */
function score(pkg: VerifiedPackage, downloads: number | null, github: GithubInfo | null): number {
  const { manifest } = pkg
  let total = 0
  if (pkg.verified) total += WEIGHTS.verified
  total += WEIGHTS.compat[pkg.compat.status]
  if (githubSlug(manifest) !== null) total += WEIGHTS.hasRepository
  if (typeof manifest.license === 'string') total += WEIGHTS.hasLicense
  if ((manifest.description ?? '').length > 20) total += WEIGHTS.hasDescription
  if ((manifest.keywords ?? []).length > 0) total += WEIGHTS.hasKeywords
  if (manifest.dsh?.plugin !== undefined) total += WEIGHTS.declaresStoreMetadata
  if (pkg.patchRows.length > 0) total += WEIGHTS.mountsRows
  if (manifest.dsh?.client !== undefined) total += WEIGHTS.hasBrowserHalf
  total += Math.min(WEIGHTS.maxDownloads, Math.log10((downloads ?? 0) + 1) * 5)
  total += Math.min(WEIGHTS.maxStars, Math.log10((github?.stars ?? 0) + 1) * 4)
  return Math.round(total * 10) / 10
}

/** Kinds that get a detail page and therefore need both language sides. */
const LISTED = new Set(['bundle', 'client-only'])

async function main(): Promise<void> {
  const packages = JSON.parse(await readFile(VERIFIED_FILE, 'utf8')) as VerifiedPackage[]

  const curated = await loadCurated()
  console.log(
    `curated translations on file: ${Object.keys(curated.zhToEn).length} zh→en, ${Object.keys(curated.enToZh).length} en→zh`,
  )

  console.log('fetching weekly downloads')
  const downloads = await fetchDownloads(packages.map((pkg) => pkg.name))

  const slugs = [...new Set(packages.map((pkg) => githubSlug(pkg.manifest)).filter((slug): slug is string => slug !== null))]
  console.log(`fetching ${slugs.length} GitHub repositories`)
  const github = await fetchGithub(slugs, githubToken())

  const records: PluginRecord[] = packages.map((pkg) => {
    const { manifest } = pkg
    const slug = githubSlug(manifest)
    const repo = slug === null ? null : github.get(slug) ?? null
    const weekly = downloads.get(pkg.name) ?? null
    const assignment = categorize(manifest, pkg.patchRows)
    const description = manifest.description ?? ''
    const translation = {
      toEn: resolve(curated.zhToEn[pkg.name], description),
      toZh: resolve(curated.enToZh[pkg.name], description),
    }
    const author = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name ?? null

    return {
      name: pkg.name,
      version: pkg.version,
      kind: pkg.kind,
      displayName: bilingual(manifest.dsh?.plugin?.displayName, pkg.name, { toEn: null, toZh: null }),
      summary: bilingual(manifest.dsh?.plugin?.summary, description, translation),
      category: assignment.category,
      categorySource: assignment.source,
      categoryEvidence: assignment.evidence,
      keywords: manifest.keywords ?? [],
      license: manifest.license ?? null,
      author,
      homepage: manifest.homepage ?? null,
      repository: slug === null ? null : `https://github.com/${slug}`,
      publishedAt: pkg.date ?? null,
      verified: pkg.verified,
      checks: pkg.checks,
      compat: pkg.compat,
      requiresBuild: pkg.requiresBuild,
      patchRows: pkg.patchRows,
      error: pkg.error ?? null,
      install: {
        command: `dsh plugin --profile web add ${pkg.name}`,
        warnsAllowBuilds: pkg.requiresBuild,
      },
      npm: {
        url: `https://www.npmjs.com/package/${pkg.name}`,
        downloadsLastWeek: weekly,
        unpackedSize: pkg.tarball?.unpackedSize ?? null,
      },
      github: repo,
      score: score(pkg, weekly, repo),
    } satisfies PluginRecord & Record<string, unknown>
  })

  records.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  await writeFile(PLUGINS_FILE, `${JSON.stringify(records, null, 2)}\n`)

  // The browse page filters in the browser, so it gets a compact index instead of the
  // 3MB corpus: listing fields only, no checks, no patch rows, no manifests.
  const index = records
    .filter((record) => record.kind === 'bundle' || record.kind === 'client-only')
    .map((record) => ({
      n: record.name,
      d: record.displayName,
      s: record.summary,
      c: record.category,
      k: record.kind,
      v: record.verified,
      x: record.compat.status,
      u: record.github?.stars ?? 0,
      w: record.npm.downloadsLastWeek ?? 0,
      p: record.publishedAt,
      r: record.score,
      b: record.checks.some((check) => check.id === 'client-half-shipped' && check.ok),
    }))
  await writeFile(INDEX_FILE, `${JSON.stringify(index)}\n`)

  const bundles = records.filter((record) => record.kind === 'bundle')
  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category.id, bundles.filter((record) => record.category === category.id).length]),
  )
  const byDay: Record<string, number> = {}
  for (const record of bundles) {
    const day = (record.publishedAt ?? '').slice(0, 10)
    if (day !== '') byDay[day] = (byDay[day] ?? 0) + 1
  }

  const stats = {
    generatedAt: new Date().toISOString(),
    totals: {
      indexed: records.length,
      installable: bundles.length,
      verified: bundles.filter((record) => record.verified).length,
      withBrowserHalf: bundles.filter((record) => record.checks.some((check) => check.id === 'client-half-shipped')).length,
      requiresBuild: bundles.filter((record) => record.requiresBuild).length,
    },
    compat: {
      current: bundles.filter((record) => record.compat.status === 'current').length,
      stale: bundles.filter((record) => record.compat.status === 'stale').length,
      undeclared: bundles.filter((record) => record.compat.status === 'undeclared').length,
      unpinned: bundles.filter((record) => record.compat.status === 'unpinned').length,
    },
    byCategory,
    byDay,
    /** How many authors adopted the store-metadata convention we document. */
    declaringStoreMetadata: bundles.filter((record) => record.checks.length > 0 && record.score > 0
      && packages.find((pkg) => pkg.name === record.name)?.manifest.dsh?.plugin !== undefined).length,
  }
  await writeFile(STATS_FILE, `${JSON.stringify(stats, null, 2)}\n`)

  const needEn = records.filter((r) => LISTED.has(r.kind) && r.summary.en === '' && r.summary.zh !== '')
  const needZh = records.filter((r) => LISTED.has(r.kind) && r.summary.zh === '' && r.summary.en !== '')
  const staleEn = Object.keys(curated.zhToEn).filter(
    (name) => resolve(curated.zhToEn[name], packages.find((p) => p.name === name)?.manifest.description ?? '') === null,
  )
  console.log(`\ntranslation coverage: ${needEn.length} still missing en, ${needZh.length} still missing zh`)
  if (staleEn.length > 0) {
    console.log(`  ${staleEn.length} curated zh→en entries are stale (author changed the description):`)
    for (const name of staleEn.slice(0, 10)) console.log(`    ${name}`)
  }

  console.log(`\nindexed ${records.length} packages; ${bundles.length} installable, ${stats.totals.verified} verified`)
  console.log('\ntop 15 by score:')
  for (const record of records.slice(0, 15)) {
    const downloadsLabel = record.npm.downloadsLastWeek ?? 0
    console.log(
      `  ${String(record.score).padStart(5)}  ${record.name.padEnd(42)} ${record.category.padEnd(14)} ↓${downloadsLabel}`,
    )
  }
  console.log(`\nwrote ${PLUGINS_FILE}`)
  console.log(`wrote ${STATS_FILE}`)
  console.log(`wrote ${INDEX_FILE}`)
}

await main()
