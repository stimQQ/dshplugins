/**
 * Stage 1 — crawl npm for candidate dsh plugins.
 *
 * npm's keyword index is the ecosystem's cleanest source: a package published for
 * dsh nearly always carries `dsh-plugin` or `deepseek-harness` in its keywords, and
 * unlike the GitHub topic (3k repos, mostly unrelated projects riding a trend) the
 * index is not worth squatting. We over-collect here and let the manifest decide
 * what is real — classification belongs to verify.ts, not to the search query.
 *
 * Output: data/raw-npm.json
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { fetchJson, mapLimit } from './lib/http.ts'
import { DATA_DIR, RAW_FILE } from './lib/paths.ts'
import type { NpmManifest, RawPackage } from './lib/types.ts'

/** Search queries run against npm, in the order their results are attributed. */
const QUERIES = [
  'keywords:dsh-plugin',
  'keywords:deepseek-harness',
  'keywords:dsh-bundle',
  'keywords:dsh',
  'keywords:cordis',
  'deepseek harness plugin',
] as const

/** Keywords that make a package a candidate even when its manifest has no `dsh` section. */
const DSH_KEYWORDS = new Set([
  'dsh',
  'dsh-plugin',
  'dsh-bundle',
  'dsh-preset',
  'deepseek-harness',
  'deepseek harness',
  'cordis',
])

/** npm caps a single search response at 250 objects. */
const PAGE_SIZE = 250

interface SearchResponse {
  total: number
  objects: { package: { name: string; version: string; date?: string } }[]
}

/** Page through one npm search query. */
async function search(query: string): Promise<Map<string, { version: string; date?: string }>> {
  const found = new Map<string, { version: string; date?: string }>()
  let from = 0
  for (;;) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${PAGE_SIZE}&from=${from}`
    const page = await fetchJson<SearchResponse>(url)
    if (!page || page.objects.length === 0) break
    for (const object of page.objects) {
      const { name, version, date } = object.package
      if (!found.has(name)) found.set(name, { version, date })
    }
    from += page.objects.length
    // A text query returns thousands of loosely-related packages; keyword queries
    // are exhaustive well before this. The cap bounds the crawl either way.
    if (from >= Math.min(page.total, 1000)) break
    await sleep(400) // stay under the registry's sustained-paging throttle
  }
  return found
}

/**
 * A candidate is worth a record when it declares `dsh` or carries a dsh keyword.
 * Everything else the text query dragged in is dropped here.
 */
function isCandidate(manifest: NpmManifest): boolean {
  if (manifest.dsh !== undefined) return true
  return (manifest.keywords ?? []).some((keyword) => DSH_KEYWORDS.has(keyword.toLowerCase()))
}

async function main(): Promise<void> {
  const foundBy = new Map<string, string[]>()
  const seen = new Map<string, { version: string; date?: string }>()

  for (const query of QUERIES) {
    // npm rate-limits sustained paging. One throttled query must not cost the
    // whole crawl: the queries overlap heavily, so a dropped one loses little.
    let hits: Map<string, { version: string; date?: string }>
    try {
      hits = await search(query)
    } catch (error) {
      console.log(`  ${query.padEnd(28)} FAILED (${String(error).slice(0, 60)})`)
      continue
    }
    for (const [name, meta] of hits) {
      if (!seen.has(name)) seen.set(name, meta)
      foundBy.set(name, [...(foundBy.get(name) ?? []), query])
    }
    console.log(`  ${query.padEnd(28)} ${hits.size} packages`)
  }
  console.log(`\ncandidates before manifest filter: ${seen.size}`)

  const names = [...seen.keys()]
  const manifests = await mapLimit(
    names,
    8,
    async (name) => fetchJson<NpmManifest>(`https://registry.npmjs.org/${name.replace('/', '%2f')}/latest`, { allow404: true }),
    (done, total) => {
      if (done % 100 === 0 || done === total) console.log(`  manifests ${done}/${total}`)
    },
  )

  const packages: RawPackage[] = []
  let dropped = 0
  for (const [index, result] of manifests.entries()) {
    const name = names[index]!
    if (result instanceof Error || result === null) {
      dropped++
      continue
    }
    if (!isCandidate(result)) {
      dropped++
      continue
    }
    packages.push({
      name,
      version: result.version,
      foundBy: foundBy.get(name) ?? [],
      date: seen.get(name)?.date,
      manifest: result,
    })
  }

  packages.sort((a, b) => a.name.localeCompare(b.name))
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(RAW_FILE, `${JSON.stringify(packages, null, 2)}\n`)

  const withDsh = packages.filter((p) => p.manifest.dsh !== undefined).length
  console.log(`\nkept ${packages.length} candidates (dropped ${dropped})`)
  console.log(`  declaring a dsh manifest section: ${withDsh}`)
  console.log(`wrote ${RAW_FILE}`)
}

// Only run as a program. verify.ts exports verifyOne for the pre-publish self-check,
// and importing a module must not execute a full pipeline as a side effect.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
