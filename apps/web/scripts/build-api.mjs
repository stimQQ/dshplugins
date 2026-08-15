/**
 * Emits the public registry API as static JSON.
 *
 * The site is a static export, so the API is a tree of files rather than handlers.
 * That is deliberate: the whole corpus is regenerated daily and never varies per
 * request, so every response is cacheable at the edge and there is nothing to run.
 *
 * Layout, all under a version prefix so the shape can change without breaking anyone:
 *
 *   /api/v1/meta.json              what exists, which schema, when it was generated
 *   /api/v1/stats.json             ecosystem totals
 *   /api/v1/index.json             compact listing, one line per plugin
 *   /api/v1/plugins.json           the full corpus
 *   /api/v1/plugins/<name>.json    one plugin, scoped names nested by directory
 *   /api/v1/verified.json          names that pass every structural check
 *   /api/v1/stale.json             names whose dsh dependency range no longer resolves
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DATA = join(here, '..', '..', '..', 'packages', 'registry', 'data')
const OUT = join(here, '..', 'public', 'api', 'v1')

/** Bumped only when a field is removed or changes meaning; additions are not breaking. */
const SCHEMA_VERSION = 1

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://dshplugins.co'

async function readJson(name) {
  return JSON.parse(await readFile(join(DATA, name), 'utf8'))
}

async function write(relative, value) {
  const path = join(OUT, relative)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
  return path
}

const plugins = await readJson('plugins.json')
const stats = await readJson('stats.json')
const index = await readJson('index.json')

const listed = plugins.filter((plugin) => plugin.kind === 'bundle' || plugin.kind === 'client-only')

/** Every payload carries its own provenance so a consumer never has to guess. */
const envelope = (data) => ({
  schemaVersion: SCHEMA_VERSION,
  generatedAt: stats.generatedAt,
  source: `${SITE_URL}/api/v1/`,
  license: 'CC-BY-4.0',
  ...data,
})

await write('meta.json', envelope({
  endpoints: {
    stats: '/api/v1/stats.json',
    index: '/api/v1/index.json',
    plugins: '/api/v1/plugins.json',
    plugin: '/api/v1/plugins/{packageName}.json',
    verified: '/api/v1/verified.json',
    stale: '/api/v1/stale.json',
  },
  counts: {
    indexed: plugins.length,
    listed: listed.length,
    installable: stats.totals.installable,
    verified: stats.totals.verified,
  },
  documentation: `${SITE_URL}/en/api/`,
  indexFields: {
    n: 'package name',
    d: 'display name, { en, zh }',
    s: 'summary, { en, zh }',
    c: 'category id',
    k: 'kind: bundle | client-only',
    v: 'passes every structural check',
    x: 'dependency compatibility: current | stale | undeclared | unpinned | unknown',
    u: 'GitHub stars',
    w: 'npm downloads, last week',
    p: 'published date of the indexed version',
    r: 'overall score',
    b: 'ships a browser half',
  },
}))

await write('stats.json', envelope(stats))
await write('index.json', envelope({ plugins: index }))
await write('plugins.json', envelope({ plugins: listed }))

await write('verified.json', envelope({
  plugins: listed.filter((plugin) => plugin.verified).map((plugin) => plugin.name),
}))

await write('stale.json', envelope({
  plugins: listed
    .filter((plugin) => plugin.compat.status === 'stale')
    .map((plugin) => ({
      name: plugin.name,
      findings: plugin.compat.findings.filter((finding) => finding.status === 'stale'),
    })),
}))

// Scoped names nest by directory, matching how the site addresses them.
for (const plugin of listed) {
  await write(`plugins/${plugin.name}.json`, envelope({ plugin }))
}

console.log(`api: ${listed.length} plugin files + 6 collections → public/api/v1/`)
