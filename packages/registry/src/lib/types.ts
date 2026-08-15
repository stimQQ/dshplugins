/**
 * The registry's data model.
 *
 * A record travels through three stages, each stage adding fields and each
 * written to its own file so a failed later stage never destroys earlier work:
 *
 *   crawl  -> RawPackage    what npm's registry says about the package
 *   verify -> VerifiedPackage  what the published tarball actually contains
 *   build  -> PluginRecord   the normalized, display-ready record the site reads
 */

/** The `dsh` section of a plugin's package.json. */
export interface DshManifest {
  /** Official: the patch layer this bundle contributes, relative to package root. */
  bundle?: { patch?: string }
  /** Official: an ordered bundle list — present on profiles, never on plugins. */
  profile?: { bundles?: string[] }
  /** Official: marks a package that ships a browser half. */
  client?: {
    platform?: string
    inject?: string[]
    immediately?: boolean
  }
  /**
   * Not official. Store-display metadata invented by `@ruihuahe/dsh-plugin-marketplace`
   * and the closest thing the ecosystem has to a convention. We read it when present
   * and fall back to npm fields when absent.
   */
  plugin?: {
    schemaVersion?: number
    category?: string
    displayName?: Record<string, string>
    summary?: Record<string, string>
  }
}

/** A package.json as served by `registry.npmjs.org/<name>/latest`. */
export interface NpmManifest {
  name: string
  version: string
  description?: string
  keywords?: string[]
  license?: string
  homepage?: string
  main?: string
  module?: string
  types?: string
  exports?: unknown
  files?: string[]
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  repository?: string | { url?: string; directory?: string }
  author?: string | { name?: string }
  dist?: { tarball?: string; unpackedSize?: number; fileCount?: number }
  dsh?: DshManifest
}

/** Stage 1 output: one npm package that claims to be part of the dsh ecosystem. */
export interface RawPackage {
  name: string
  version: string
  /** Which search queries surfaced this package — useful for tuning the crawl. */
  foundBy: string[]
  /** Publish date of the version the search index knows about. */
  date?: string
  manifest: NpmManifest
}

/** One machine-checkable claim about a package, rendered as a badge row on the site. */
export interface Check {
  /** Stable id so the UI can attach copy and the docs can link to it. */
  id: CheckId
  ok: boolean
  /** Human-readable result, bilingual, shown under the badge. */
  detail: { en: string; zh: string }
  /**
   * The exact values that failed, when naming them helps.
   *
   * A consumer cannot give an author precise advice from prose alone: "rows point at
   * an unpublishable path" reads the same whether the row dropped a scope or wrote a
   * filesystem path, and those need opposite fixes.
   */
  evidence?: string[]
}

export type CheckId =
  | 'declares-bundle'
  | 'patch-shipped'
  | 'patch-parses'
  | 'rows-resolvable'
  | 'prebuilt'
  | 'entry-shipped'
  | 'client-half-shipped'

/** What kind of thing this package is, decided from its manifest, not its README. */
export type PluginKind =
  /** Declares `dsh.bundle` — installable with `dsh plugin add`. */
  | 'bundle'
  /** Declares `dsh.client` but no bundle — a browser half loaded by another bundle. */
  | 'client-only'
  /** Declares `dsh.profile` — a profile, not a plugin. */
  | 'profile'
  /** dsh-adjacent but contributes no layer: a library, an SDK, or a mislabeled package. */
  | 'library'

/** Stage 2 output: the manifest's claims checked against the published tarball. */
export interface VerifiedPackage extends RawPackage {
  kind: PluginKind
  checks: Check[]
  /**
   * Every structural check passed and the package contributes a layer.
   * Deliberately independent of `compat`: a structurally sound plugin pinned to an
   * old rc is a different problem from a malformed one, and they rank differently.
   */
  verified: boolean
  /** How the plugin's declared dsh dependency ranges relate to what npm ships today. */
  compat: import('./compat.ts').CompatResult
  /** Ships source only, so a git/registry install must run a build script. */
  requiresBuild: boolean
  /** Patch rows found in the shipped cordis.patch.yml, for the "what it mounts" panel. */
  patchRows: PatchRow[]
  tarball: { fileCount: number; unpackedSize: number } | null
  /** Populated when verification could not run at all (network, 404, corrupt tarball). */
  error?: string
}

/** One plugin row a bundle's patch inserts into the profile tree. */
export interface PatchRow {
  id: string
  /** The plugin module the row mounts — a package name or a path. */
  name: string
  /** Whether the row arrives via `insert` or replaces an existing row. */
  op: 'insert' | 'replace'
  /** Config keys the row sets, so a detail page can show what is configurable. */
  configKeys: string[]
}

/** A localized string. `zh` falls back to `en` when the source has no translation. */
export interface I18nText {
  en: string
  zh: string
}

/** Stage 3 output: the record the website and the in-product plugin both consume. */
export interface PluginRecord {
  name: string
  version: string
  kind: PluginKind
  displayName: I18nText
  summary: I18nText
  category: string
  /** Which evidence produced the category, so a detail page can explain the placement. */
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
  compat: import('./compat.ts').CompatResult
  requiresBuild: boolean
  patchRows: PatchRow[]
  /** Why verification could not complete, when it could not. */
  error: string | null
  install: {
    /** The copy-paste command, with `<profile>` left for the user to fill. */
    command: string
    /** True when installing this package authorizes build-script execution on the user's machine. */
    warnsAllowBuilds: boolean
  }
  npm: {
    url: string
    downloadsLastWeek: number | null
    unpackedSize: number | null
  }
  github: GithubInfo | null
  /** Composite ranking signal; see build.ts for the formula. */
  score: number
}

export interface GithubInfo {
  fullName: string
  stars: number
  forks: number
  openIssues: number
  pushedAt: string
  topics: string[]
  archived: boolean
}
