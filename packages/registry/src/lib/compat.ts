/**
 * Compatibility of a plugin's declared dsh dependencies with what npm ships today.
 *
 * dsh moved 0.0.1-rc.1 -> 0.1.0-rc.6 in its first five days, so a plugin's dependency
 * range is the fastest-decaying fact about it. A range that excludes the current
 * version means the user's install either drags in a second, older copy of the
 * runtime or fails outright — and no social signal reveals this.
 */

import { rcompare, satisfies, valid, validRange } from 'semver'
import { fetchJson } from './http.ts'
import type { NpmManifest } from './types.ts'

/** How a plugin's declared range relates to the currently published version. */
export type CompatStatus =
  /** Range admits the current version. */
  | 'current'
  /** Range is `*` or equivalent: always resolves, never pinned, no guarantee. */
  | 'unpinned'
  /** Range excludes the current version — the highest-value warning we can emit. */
  | 'stale'
  /** No `@deepseek-ai/*` dependency declared at all; relies on host hoisting. */
  | 'undeclared'
  /** Range is unparseable, or the dependency is not a published dsh package. */
  | 'unknown'

export interface CompatFinding {
  packageName: string
  range: string
  /** Highest version npm currently ships for this package. */
  current: string | null
  status: CompatStatus
}

export interface CompatResult {
  status: CompatStatus
  findings: CompatFinding[]
}

/** What npm currently ships for one `@deepseek-ai/*` package. */
export interface PackageVersions {
  /** Highest published version, prereleases included — the real reference point. */
  current: string
  /** The `latest` dist-tag, which for the dsh libraries is not the newest version. */
  latestTag: string | null
  /** The `next` dist-tag, which is where dsh actually promotes current releases. */
  nextTag: string | null
}

export type VersionIndex = Map<string, PackageVersions | null>

interface Packument {
  versions?: Record<string, unknown>
  'dist-tags'?: Record<string, string>
}

/**
 * Resolve what npm currently ships for every referenced `@deepseek-ai/*` package.
 *
 * The reference version is the highest published version, NOT the `latest` dist-tag:
 * dsh publishes its library packages' current releases under `next` and leaves
 * `latest` on the first-day `0.0.1-rc.1`. Comparing ranges against `latest` marks
 * every up-to-date plugin stale, which is backwards.
 *
 * @param packageNames - distinct dependency names to resolve.
 */
export async function buildVersionIndex(packageNames: Iterable<string>): Promise<VersionIndex> {
  const index: VersionIndex = new Map()
  for (const name of packageNames) {
    if (index.has(name)) continue
    const packument = await fetchJson<Packument>(
      `https://registry.npmjs.org/${name.replace('/', '%2f')}`,
      { allow404: true },
    )
    const published = Object.keys(packument?.versions ?? {}).filter((version) => valid(version) !== null)
    if (published.length === 0) {
      index.set(name, null)
      continue
    }
    const tags = packument?.['dist-tags'] ?? {}
    index.set(name, {
      current: published.sort(rcompare)[0]!,
      latestTag: tags['latest'] ?? null,
      nextTag: tags['next'] ?? null,
    })
  }
  return index
}

/** Every `@deepseek-ai/*` dependency a manifest declares, runtime and peer alike. */
export function dshDependencies(manifest: NpmManifest): Record<string, string> {
  const all = { ...(manifest.dependencies ?? {}), ...(manifest.peerDependencies ?? {}) }
  return Object.fromEntries(Object.entries(all).filter(([name]) => name.startsWith('@deepseek-ai/')))
}

/**
 * Classify one plugin against the version index.
 *
 * The package-level status is the worst finding: one stale dependency is enough to
 * break a load, so a plugin is only `current` when every declared range admits today's
 * published version.
 */
export function checkCompat(manifest: NpmManifest, index: VersionIndex): CompatResult {
  const dependencies = dshDependencies(manifest)
  const names = Object.keys(dependencies)
  if (names.length === 0) return { status: 'undeclared', findings: [] }

  const findings: CompatFinding[] = []
  for (const [packageName, range] of Object.entries(dependencies)) {
    const versions = index.get(packageName) ?? null
    const current = versions?.current ?? null
    let status: CompatStatus
    if (current === null || validRange(range) === null) {
      status = 'unknown'
    } else if (range === '*' || range === 'latest' || range === '') {
      status = 'unpinned'
    } else {
      // Prerelease versions only satisfy ranges that mention a prerelease, so
      // includePrerelease keeps `>=0.1.0-rc.5 <0.2.0` style ranges honest.
      status = satisfies(current, range, { includePrerelease: true }) ? 'current' : 'stale'
    }
    findings.push({ packageName, range, current, status })
  }

  const order: CompatStatus[] = ['stale', 'unknown', 'unpinned', 'current']
  const worst = order.find((candidate) => findings.some((finding) => finding.status === candidate))
  return { status: worst ?? 'current', findings }
}
