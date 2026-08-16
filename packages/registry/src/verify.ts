/**
 * Stage 2 — verify each candidate's manifest claims against its published tarball.
 *
 * Why this stage carries the product: the whole ecosystem is days old, so stars and
 * downloads are all near zero and rank nothing. The only signal available today is
 * structural — does the package actually contain what `dsh plugin add` needs to
 * mount it? Every check here is a fact about the shipped bytes, never a judgement.
 *
 * Output: data/verified.json
 */

import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { list } from 'tar'
import { parse as parseYaml } from 'yaml'
import { buildVersionIndex, checkCompat, dshDependencies, type VersionIndex } from './lib/compat.ts'
import { fetchTarballCached, mapLimit } from './lib/http.ts'
import { RAW_FILE, VERIFIED_FILE } from './lib/paths.ts'
import type { Check, NpmManifest, PatchRow, PluginKind, RawPackage, VerifiedPackage } from './lib/types.ts'

/** npm tarballs place every file under a single `package/` prefix. */
const TAR_PREFIX = 'package/'

/** Skip absurd tarballs rather than stall the run; they are never small plugins. */
const MAX_TARBALL_BYTES = 40 * 1024 * 1024

interface TarballContents {
  paths: Set<string>
  /** Contents of the declared patch file, when it shipped. */
  patchText: string | null
}

/**
 * Read a package tarball: the full file list, plus the text of the declared patch.
 * @param tarballPath - local path of the downloaded .tgz.
 * @param patchRelative - the `dsh.bundle.patch` value, normalized to a package-relative path.
 */
async function readTarball(tarballPath: string, patchRelative: string | null): Promise<TarballContents> {
  const paths = new Set<string>()
  const wanted = patchRelative === null ? null : TAR_PREFIX + patchRelative
  let patchText: string | null = null

  await list({
    file: tarballPath,
    onReadEntry: (entry) => {
      const path = entry.path.replace(/^\.\//, '')
      paths.add(path)
      if (wanted !== null && path === wanted) {
        const chunks: Buffer[] = []
        entry.on('data', (chunk: Buffer) => chunks.push(chunk))
        entry.on('end', () => {
          patchText = Buffer.concat(chunks).toString('utf8')
        })
      }
    },
  })
  return { paths, patchText }
}

/** Strip `./` and any leading slash so a manifest path can be matched against tar entries. */
function normalizeRelative(path: string): string {
  return path.replace(/^\.?\//, '')
}

/**
 * The module entry a loader would import, from `exports['.']`, `main`, or `module`.
 * @returns a package-relative path, or null when the manifest declares no entry.
 */
function entryPath(manifest: NpmManifest): string | null {
  const exports = manifest.exports
  if (typeof exports === 'string') return normalizeRelative(exports)
  if (exports !== null && typeof exports === 'object') {
    const root = (exports as Record<string, unknown>)['.']
    if (typeof root === 'string') return normalizeRelative(root)
    if (root !== null && typeof root === 'object') {
      const conditions = root as Record<string, unknown>
      for (const key of ['import', 'default', 'require', 'node']) {
        const value = conditions[key]
        if (typeof value === 'string') return normalizeRelative(value)
      }
    }
  }
  if (typeof manifest.main === 'string') return normalizeRelative(manifest.main)
  if (typeof manifest.module === 'string') return normalizeRelative(manifest.module)
  return null
}

/**
 * Extract the plugin rows a patch inserts or replaces.
 *
 * A patch file is a YAML list of operations; `insert` carries new rows and any other
 * key addresses existing rows. We only need each row's identity and config keys, so
 * unknown operation shapes are skipped rather than rejected.
 */
function readPatchRows(patchText: string): { rows: PatchRow[]; parsed: boolean } {
  let document: unknown
  try {
    // Plugin patches may use cordis's `!!js` expression tag. We never evaluate it —
    // resolving it to its source text keeps those files parseable instead of failing
    // the package. `!!js` expands to this full tag URI, which is what must be matched.
    document = parseYaml(patchText, {
      customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }],
    })
  } catch {
    return { rows: [], parsed: false }
  }
  if (!Array.isArray(document)) return { rows: [], parsed: false }

  const rows: PatchRow[] = []
  for (const operation of document) {
    if (operation === null || typeof operation !== 'object') continue
    for (const [key, value] of Object.entries(operation as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue
      const op = key === 'insert' ? 'insert' : 'replace'
      for (const row of value) {
        if (row === null || typeof row !== 'object') continue
        const record = row as Record<string, unknown>
        const name = record['name']
        if (typeof name !== 'string') continue
        const config = record['config']
        rows.push({
          id: typeof record['id'] === 'string' ? record['id'] : '',
          name,
          op,
          configKeys: config !== null && typeof config === 'object' ? Object.keys(config) : [],
        })
      }
    }
  }
  return { rows, parsed: true }
}

/**
 * Whether a patch row names something a user's install can actually resolve.
 *
 * Measured across the corpus, the dominant failure is not the filesystem path the
 * tutorial shows local developers — it is a row still naming the package as it was
 * called before publish. Authors develop unscoped, publish under a scope (or rename),
 * and never update cordis.patch.yml, so the row points at a package that does not
 * exist. Sibling packages referenced without being declared as dependencies fail the
 * same way. Paths are the rarer case.
 */
function rowResolvable(row: PatchRow, packageName: string, dependencies: Set<string>): boolean {
  if (row.name.startsWith('/') || /^[A-Za-z]:[\\/]/.test(row.name)) return false
  if (row.name.startsWith('.')) return false
  if (row.name === packageName || row.name.startsWith(`${packageName}/`)) return true
  if (row.name.startsWith('@deepseek-ai/')) return true
  const scope = row.name.startsWith('@') ? row.name.split('/').slice(0, 2).join('/') : row.name.split('/')[0]!
  return dependencies.has(scope)
}

/** Classify by manifest declarations alone — never by README prose or package name. */
function classify(manifest: NpmManifest): PluginKind {
  const dsh = manifest.dsh
  if (dsh?.profile !== undefined) return 'profile'
  if (dsh?.bundle?.patch !== undefined) return 'bundle'
  if (dsh?.client !== undefined) return 'client-only'
  return 'library'
}

/**
 * Run every check against one package.
 *
 * Exported so a package can be checked before it is published: pass a local tarball
 * path as `dist.tarball` and the same seven checks run against the file that `pnpm
 * pack` produced, with no second implementation to drift from this one.
 */
export async function verifyOne(pkg: RawPackage, versions: VersionIndex): Promise<VerifiedPackage> {
  const { manifest } = pkg
  const kind = classify(manifest)
  const compat = checkCompat(manifest, versions)
  const checks: Check[] = []
  const patchDeclared = manifest.dsh?.bundle?.patch
  const patchRelative = typeof patchDeclared === 'string' ? normalizeRelative(patchDeclared) : null

  checks.push({
    id: 'declares-bundle',
    ok: patchRelative !== null,
    detail: patchRelative !== null
      ? { en: `Declares dsh.bundle.patch → ${patchRelative}`, zh: `声明了 dsh.bundle.patch → ${patchRelative}` }
      : { en: 'No dsh.bundle.patch — contributes no profile layer', zh: '没有 dsh.bundle.patch —— 不贡献任何配置层' },
  })

  const tarballUrl = manifest.dist?.tarball
  if (tarballUrl === undefined) {
    return { ...pkg, kind, compat, checks, verified: false, requiresBuild: false, patchRows: [], tarball: null, error: 'no tarball url' }
  }
  if ((manifest.dist?.unpackedSize ?? 0) > MAX_TARBALL_BYTES) {
    return { ...pkg, kind, compat, checks, verified: false, requiresBuild: false, patchRows: [], tarball: null, error: 'tarball too large' }
  }

  let contents: TarballContents
  try {
    // An absolute path is a local tarball (pre-publish self-check); anything else is
    // an npm URL to download.
    const tarballPath = tarballUrl.startsWith('/') ? tarballUrl : await fetchTarballCached(tarballUrl)
    contents = await readTarball(tarballPath, patchRelative)
  } catch (error) {
    return { ...pkg, kind, compat, checks, verified: false, requiresBuild: false, patchRows: [], tarball: null, error: String(error).slice(0, 200) }
  }

  // The patch file must actually ship: `files` omissions are silent until load time.
  const patchShipped = patchRelative !== null && contents.paths.has(TAR_PREFIX + patchRelative)
  if (patchRelative !== null) {
    checks.push({
      id: 'patch-shipped',
      ok: patchShipped,
      detail: patchShipped
        ? { en: 'The patch file ships in the tarball', zh: 'patch 文件确实打进了 tarball' }
        : { en: 'Declared patch file is missing from the published tarball', zh: '声明的 patch 文件没有打包发布，安装后加载会失败' },
    })
  }

  let patchRows: PatchRow[] = []
  if (patchShipped && contents.patchText !== null) {
    const { rows, parsed } = readPatchRows(contents.patchText)
    patchRows = rows
    checks.push({
      id: 'patch-parses',
      ok: parsed && rows.length > 0,
      detail: parsed && rows.length > 0
        ? { en: `Patch parses and mounts ${rows.length} plugin row(s)`, zh: `patch 解析正常，挂载 ${rows.length} 个插件行` }
        : { en: 'Patch file does not parse into any plugin row', zh: 'patch 文件解析不出任何插件行' },
    })

    const dependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ])
    const unresolvable = rows.filter((row) => !rowResolvable(row, pkg.name, dependencies))
    checks.push({
      id: 'rows-resolvable',
      ok: unresolvable.length === 0,
      evidence: unresolvable.map((row) => row.name),
      detail: unresolvable.length === 0
        ? { en: 'Every plugin row resolves to a published package', zh: '每个插件行都能解析到已发布的包' }
        : {
            en: `${unresolvable.length} row(s) name something an install cannot resolve, e.g. ${unresolvable[0]!.name}`,
            zh: `${unresolvable.length} 个插件行指向了安装后无法解析的目标，例如 ${unresolvable[0]!.name}`,
          },
    })
  }

  // Source-only packages force the user to authorize build-script execution.
  const entry = entryPath(manifest)
  const entryShipped = entry !== null && contents.paths.has(TAR_PREFIX + entry)
  const hasPrepare = typeof manifest.scripts?.['prepare'] === 'string'
  const requiresBuild = !entryShipped && hasPrepare
  if (entry !== null) {
    checks.push({
      id: 'entry-shipped',
      ok: entryShipped,
      detail: entryShipped
        ? { en: `Entry module ships: ${entry}`, zh: `入口模块已打包：${entry}` }
        : { en: `Declared entry is missing from the tarball: ${entry}`, zh: `声明的入口模块不在 tarball 里：${entry}` },
    })
  }
  checks.push({
    id: 'prebuilt',
    ok: entryShipped,
    detail: entryShipped
      ? { en: 'Prebuilt — installs without running build scripts', zh: '预构建 —— 安装时无需执行构建脚本' }
      : {
          en: 'Ships source only; installing runs its build script on your machine',
          zh: '只发布了源码；安装会在你的机器上执行它的构建脚本',
        },
  })

  // Half the ecosystem ships a browser half. It loads through `exports['./client']`,
  // a separate build output that is easy to leave out of `files` — the plugin then
  // installs and boots cleanly while its UI silently never appears.
  if (manifest.dsh?.client !== undefined) {
    const clientExport = (manifest.exports as Record<string, unknown> | undefined)?.['./client']
    const clientPath = typeof clientExport === 'string'
      ? normalizeRelative(clientExport)
      : typeof (clientExport as Record<string, string> | undefined)?.['default'] === 'string'
        ? normalizeRelative((clientExport as Record<string, string>)['default']!)
        : null
    const clientShipped = clientPath !== null && contents.paths.has(TAR_PREFIX + clientPath)
    checks.push({
      id: 'client-half-shipped',
      ok: clientShipped,
      detail: clientShipped
        ? { en: `Browser half ships: ${clientPath}`, zh: `浏览器半侧已打包：${clientPath}` }
        : {
            en: 'Declares dsh.client but its ./client export is missing — the UI will not load',
            zh: '声明了 dsh.client，但 ./client 导出不在包里 —— 界面不会出现',
          },
    })
  }

  const verified = kind === 'bundle' && checks.every((check) => check.ok)
  return {
    ...pkg,
    kind,
    compat,
    checks,
    verified,
    requiresBuild,
    patchRows,
    tarball: {
      fileCount: manifest.dist?.fileCount ?? contents.paths.size,
      unpackedSize: manifest.dist?.unpackedSize ?? 0,
    },
  }
}

async function main(): Promise<void> {
  const packages = JSON.parse(await readFile(RAW_FILE, 'utf8')) as RawPackage[]

  // One version lookup per distinct dsh dependency, shared by every package.
  const dependencyNames = new Set<string>()
  for (const pkg of packages) for (const name of Object.keys(dshDependencies(pkg.manifest))) dependencyNames.add(name)
  console.log(`resolving current versions of ${dependencyNames.size} @deepseek-ai/* packages`)
  const versions = await buildVersionIndex(dependencyNames)

  console.log(`verifying ${packages.length} packages against their tarballs\n`)
  const results = await mapLimit(packages, 10, (pkg) => verifyOne(pkg, versions), (done, total) => {
    if (done % 100 === 0 || done === total) console.log(`  ${done}/${total}`)
  })

  const verified: VerifiedPackage[] = []
  let failed = 0
  for (const [index, result] of results.entries()) {
    if (result instanceof Error) {
      failed++
      const pkg = packages[index]!
      verified.push({
        ...pkg,
        kind: classify(pkg.manifest),
        compat: checkCompat(pkg.manifest, versions),
        checks: [],
        verified: false,
        requiresBuild: false,
        patchRows: [],
        tarball: null,
        error: result.message.slice(0, 200),
      })
      continue
    }
    verified.push(result)
  }

  await writeFile(VERIFIED_FILE, `${JSON.stringify(verified, null, 2)}\n`)

  const byKind = new Map<PluginKind, number>()
  for (const pkg of verified) byKind.set(pkg.kind, (byKind.get(pkg.kind) ?? 0) + 1)
  const bundles = verified.filter((p) => p.kind === 'bundle')
  console.log('\nby kind:')
  for (const [kind, count] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(4)}  ${kind}`)
  console.log(`\nbundles fully verified: ${bundles.filter((p) => p.verified).length}/${bundles.length}`)
  console.log(`verification errored:   ${failed}`)

  const compatCounts = new Map<string, number>()
  for (const pkg of bundles) compatCounts.set(pkg.compat.status, (compatCounts.get(pkg.compat.status) ?? 0) + 1)
  console.log('\ndsh dependency compatibility (bundles):')
  for (const [status, count] of [...compatCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${status}`)
  }
  console.log(`\nwrote ${VERIFIED_FILE}`)
}

// Only run as a program. verify.ts exports verifyOne for the pre-publish self-check,
// and importing a module must not execute a full pipeline as a side effect.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
