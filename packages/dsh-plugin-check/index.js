/**
 * Plugin Check — a health check for the plugins a profile already has installed.
 *
 * Every plugin marketplace answers "what could I install". None of them answers
 * "is what I installed still working", which is the question that actually decays:
 * dsh moved 0.0.1-rc.1 to 0.1.0-rc.6 in its first five days, so a plugin that
 * installed cleanly last week can be pinned to a range that no longer resolves.
 *
 * This reads the profiles on disk, asks the public registry what it knows about each
 * installed package, and reports the difference. It changes nothing — no writes, no
 * installs, no upgrades.
 *
 * Written as plain ESM on purpose: the published tarball is the artifact, so there is
 * no build step to forget and no `files` entry that can silently omit `lib/`.
 *
 * @module dsh-plugin-check
 */

import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-plugin-check'
export const inject = ['tools']

/**
 * @typedef {object} Config
 * @property {string} registry - origin of the registry API.
 * @property {number} timeoutMs - how long to wait for the registry before giving up.
 */

/** Where dsh keeps profiles, honouring an explicit DSH_HOME. */
function harnessHome() {
  return process.env['DSH_HOME'] ?? join(homedir(), '.dsh')
}

/**
 * Read every profile's installed dependencies.
 *
 * A profile's package.json is the authority on what is installed: `dependencies`
 * lists what pnpm put there, and `dsh.profile.bundles` lists which of those actually
 * contribute a config layer. In-box bundles are not dependencies and are skipped —
 * they ship with dsh and are not the user's to fix.
 *
 * @returns {Promise<{ profile: string, packages: string[], bundles: string[] }[]>}
 */
async function readProfiles() {
  const root = join(harnessHome(), 'profiles')
  /** @type {string[]} */
  let names
  try {
    names = (await readdir(root, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }

  const profiles = []
  for (const profile of names) {
    try {
      const manifest = JSON.parse(await readFile(join(root, profile, 'package.json'), 'utf8'))
      const packages = Object.keys(manifest.dependencies ?? {})
      const bundles = manifest.dsh?.profile?.bundles ?? []
      if (packages.length > 0) profiles.push({ profile, packages, bundles })
    } catch {
      // A profile without a readable manifest has nothing installed to check.
    }
  }
  return profiles
}

/**
 * Ask the registry about one package.
 * @param {string} registry - API origin.
 * @param {string} packageName - npm package name.
 * @param {AbortSignal} signal - cancels the request once the deadline passes.
 * @returns {Promise<object|null>} the plugin record, or null when unknown.
 */
async function lookup(registry, packageName, signal) {
  const response = await fetch(`${registry}/api/v1/plugins/${packageName}.json`, { signal })
  if (!response.ok) return null
  const body = await response.json()
  return body.plugin ?? null
}

/**
 * Turn a registry record into the findings worth telling a user about.
 * @param {object} plugin - the registry record.
 * @returns {{ level: 'error'|'warn'|'info', message: string }[]}
 */
function diagnose(plugin) {
  const findings = []

  for (const check of plugin.checks ?? []) {
    if (!check.ok) findings.push({ level: 'error', message: `${check.id}: ${check.detail.en}` })
  }

  if (plugin.compat?.status === 'stale') {
    const stale = (plugin.compat.findings ?? []).filter(f => f.status === 'stale')
    for (const finding of stale) {
      findings.push({
        level: 'error',
        message: `depends on ${finding.packageName}@${finding.range}, but npm now ships ${finding.current}`,
      })
    }
  }

  if (plugin.install?.warnsAllowBuilds) {
    findings.push({
      level: 'warn',
      message: 'ships source only — installing runs its build script on this machine, outside any sandbox',
    })
  }

  if (plugin.compat?.status === 'undeclared') {
    findings.push({
      level: 'info',
      message: 'declares no @deepseek-ai/* dependency; it relies on whatever the host hoists',
    })
  }

  return findings
}

/**
 * How to fix each failed check, in the author's terms.
 *
 * Every entry names the edit that resolves it, because a report that only restates
 * the symptom puts the diagnosis back on the author — who by definition could not
 * see it, since none of these fail at publish time.
 */
const REMEDY = {
  'patch-shipped':
    'Add the patch file to the `files` array in package.json. npm publishes only what `files` lists, '
    + 'so the package installs cleanly and the config layer simply is not there. Verify with '
    + '`npm pack --dry-run` before publishing.',
  // rows-resolvable has no single remedy — see rowsRemedy(), which reads the evidence.
  'rows-resolvable': null,
  'patch-parses':
    'The patch file did not parse into any plugin row. It must be a YAML list of operations, each '
    + 'holding an array — for example a top-level `- insert:` whose items carry `id` and `name`.',
  'entry-shipped':
    'The entry module named by `exports["."]` / `main` is missing from the tarball. Build before '
    + 'publishing, and make sure the build output is listed in `files`.',
  prebuilt:
    'The tarball ships source without a built entry, so installing has to run your build script on the '
    + "user's machine — which pnpm 10 refuses until they add an `allowBuilds` entry. Publishing built "
    + 'artifacts removes that step for everyone installing from npm.',
  'client-half-shipped':
    'The package declares `dsh.client` but the `exports["./client"]` target is not in the tarball. This '
    + 'is the quiet one: the plugin installs and boots without error and the UI never appears. Add the '
    + 'client build output to `files`.',
  'declares-bundle':
    'The package declares no `dsh.bundle.patch`, so it contributes no config layer and `dsh plugin add` '
    + 'installs it as a plain dependency.',
}

/**
 * The remedy for `rows-resolvable`, chosen from the rows that actually failed.
 *
 * Three different mistakes produce this one check id and they need opposite fixes, so
 * generic advice would send most authors looking in the wrong place. Measured across
 * the corpus the common case is a row still naming the package as it was called
 * before publish, not the filesystem path the tutorial shows.
 *
 * @param {string[]} rows - the offending row names, from the check's evidence.
 * @param {string} packageName - the published package name.
 * @returns {string} advice naming the specific edit.
 */
function rowsRemedy(rows, packageName) {
  const unscoped = packageName.includes('/') ? packageName.split('/')[1] : packageName
  const paths = rows.filter(row => row.startsWith('.') || row.startsWith('/') || /^[A-Za-z]:[\\/]/.test(row))
  const renamed = rows.filter(row => !paths.includes(row) && (row === unscoped || unscoped.includes(row) || row.includes(unscoped)))
  const others = rows.filter(row => !paths.includes(row) && !renamed.includes(row))

  const parts = []
  if (renamed.length > 0) {
    parts.push(
      `\`${renamed.join('`, `')}\` looks like this package under its pre-publish name. The row must use the `
      + `published name exactly — \`name: ${packageName}\`. Developing unscoped and publishing under a scope `
      + 'without updating cordis.patch.yml is the most common way this happens.',
    )
  }
  if (paths.length > 0) {
    parts.push(
      `\`${paths.join('`, `')}\` is a filesystem path. Paths in a patch resolve on the machine that wrote `
      + 'them, so a published one points nowhere. Reference the package by name instead.',
    )
  }
  if (others.length > 0) {
    parts.push(
      `\`${others.join('`, `')}\` is not this package and is not in \`dependencies\`, so nothing installs it. `
      + 'Either declare it as a dependency or drop the row.',
    )
  }
  return parts.join(' ')
}

/** Why a range goes stale here, which is not obvious and bites almost everyone once. */
const STALE_NOTE =
  'Note the `latest` dist-tag is misleading for the dsh libraries: current releases are promoted on '
  + '`next`, while `latest` still points at the first-day `0.0.1-rc.1`. `npm install @deepseek-ai/dsh-tools` '
  + 'therefore pins you to day one. Install with an explicit version or `@next`, and widen the range.'

/**
 * Draft an issue an author can paste into their own tracker.
 * @param {object} plugin - the registry record.
 * @param {{ level: string, message: string }[]} findings - what diagnose() produced.
 * @param {string} registry - API origin, for the citation link.
 * @returns {{ name: string, repository: string|null, title: string, body: string }}
 */
function draftReport(plugin, findings, registry) {
  const failed = (plugin.checks ?? []).filter(check => !check.ok)
  const stale = (plugin.compat?.findings ?? []).filter(finding => finding.status === 'stale')

  const title = failed.length > 0
    ? `${plugin.name}: published package fails ${failed.length} structural check(s)`
    : `${plugin.name}: dsh dependency ranges no longer resolve`

  const lines = [
    `Reporting this from an automated check of the published tarball for \`${plugin.name}@${plugin.version}\`.`,
    '',
  ]

  if (failed.length > 0) {
    lines.push('## Failing checks', '')
    for (const check of failed) {
      lines.push(`### \`${check.id}\``, '', check.detail.en, '')
      const remedy = check.id === 'rows-resolvable'
        ? rowsRemedy(check.evidence ?? [], plugin.name)
        : REMEDY[check.id]
      if (remedy) lines.push(`**Fix.** ${remedy}`, '')
    }
  }

  if (stale.length > 0) {
    lines.push('## Dependency ranges that no longer resolve', '')
    for (const finding of stale) {
      lines.push(`- \`${finding.packageName}\`: declared \`${finding.range}\`, npm now ships \`${finding.current}\``)
    }
    lines.push('', `**Fix.** ${STALE_NOTE}`, '')
  }

  lines.push(
    '## How this was checked',
    '',
    'The published tarball was downloaded and its contents compared against what package.json declares; '
    + 'dependency ranges were resolved against the highest version npm currently ships, not the `latest` tag.',
    '',
    `Full record: ${registry}/en/p/${plugin.name}/`,
  )

  return { name: plugin.name, repository: plugin.repository ?? null, title, body: lines.join('\n') }
}

/**
 * Register the `plugin_doctor` tool.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 * @param {Config} config - deployment configuration from cordis.yml.
 */
export function apply(ctx, config) {
  const registry = (config?.registry ?? 'https://dshplugins.co').replace(/\/$/, '')
  const timeoutMs = config?.timeoutMs ?? 8000

  ctx.tools.register(defineTool({
    name: 'plugin_check',
    description:
      'Check the health of the dsh plugins already installed in this machine\'s profiles. '
      + 'Reports plugins whose published package is broken (a declared patch or browser half that '
      + 'never shipped, plugin rows pointing at a path that does not exist), plugins pinned to a dsh '
      + 'version npm no longer ships, and plugins that execute code at install time. '
      + 'Read-only: it never installs, upgrades, or removes anything. '
      + 'Use it when a plugin stopped working, after upgrading dsh, or before trusting a profile.',
    parameters: {
      // An optional parameter omits `required` entirely; the schema compiler rejects
      // `required: false` rather than treating it as optional.
      profile: {
        type: 'string',
        description: 'Limit the check to one profile by name. Omit to check every profile.',
      },
      includeHealthy: {
        type: 'boolean',
        description: 'Include plugins with nothing wrong. Defaults to false, reporting only problems.',
      },
      draftReports: {
        type: 'boolean',
        description:
          'Also draft an issue body for each problem plugin, naming the exact edit that fixes it, ready '
          + "to file against that plugin's repository. Defaults to false.",
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          checkedAt: { type: 'string', required: true },
          profiles: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                profile: { type: 'string', required: true },
                installed: { type: 'integer', required: true },
                plugins: {
                  type: 'array',
                  required: true,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string', required: true },
                      status: { type: 'string', required: true, enum: ['ok', 'problem', 'unknown'] },
                      findings: {
                        type: 'array',
                        required: true,
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            level: { type: 'string', required: true, enum: ['error', 'warn', 'info'] },
                            message: { type: 'string', required: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          reports: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                repository: { type: 'string' },
                title: { type: 'string', required: true },
                body: { type: 'string', required: true },
              },
            },
          },
          summary: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              installed: { type: 'integer', required: true },
              problems: { type: 'integer', required: true },
              unknown: { type: 'integer', required: true },
            },
          },
        },
      },
      render: (_args, value) => {
        const { summary } = value
        if (summary.installed === 0) {
          return [{ type: 'text', text: 'No profile on this machine has any plugin installed.' }]
        }
        const lines = [
          `Checked ${summary.installed} installed plugin(s): `
          + `${summary.problems} with problems, ${summary.unknown} not in the registry.`,
        ]
        for (const profile of value.profiles) {
          for (const plugin of profile.plugins) {
            if (plugin.status === 'ok') continue
            lines.push(`\n[${profile.profile}] ${plugin.name}`)
            for (const finding of plugin.findings) lines.push(`  ${finding.level}: ${finding.message}`)
          }
        }
        if (value.reports.length > 0) {
          lines.push(`\nDrafted ${value.reports.length} issue report(s) — each names the edit that fixes it.`)
          for (const report of value.reports) {
            lines.push(`  ${report.name}${report.repository ? ` → ${report.repository}/issues/new` : ' (no repository on file)'}`)
          }
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args) {
      const wanted = typeof args.profile === 'string' ? args.profile : null
      const includeHealthy = args.includeHealthy === true
      const wantReports = args.draftReports === true

      const all = await readProfiles()
      const profiles = wanted === null ? all : all.filter(p => p.profile === wanted)

      const controller = new AbortController()
      const deadline = setTimeout(() => controller.abort(), timeoutMs)

      let installed = 0
      let problems = 0
      let unknown = 0
      const reported = []
      const reports = []

      try {
        for (const entry of profiles) {
          const plugins = []
          for (const packageName of entry.packages) {
            installed++
            /** @type {object|null} */
            let record = null
            try {
              record = await lookup(registry, packageName, controller.signal)
            } catch {
              // Registry unreachable or the request timed out; the package is
              // reported as unknown rather than silently treated as healthy.
            }

            if (record === null) {
              unknown++
              if (includeHealthy) {
                plugins.push({
                  name: packageName,
                  status: 'unknown',
                  findings: [{ level: 'info', message: 'not found in the registry — it may be private, renamed, or too new' }],
                })
              }
              continue
            }

            const findings = diagnose(record)
            if (findings.length === 0) {
              if (includeHealthy) plugins.push({ name: packageName, status: 'ok', findings: [] })
              continue
            }
            problems++
            plugins.push({ name: packageName, status: 'problem', findings })
            if (wantReports) reports.push(draftReport(record, findings, registry))
          }
          reported.push({ profile: entry.profile, installed: entry.packages.length, plugins })
        }
      } finally {
        clearTimeout(deadline)
      }

      return {
        checkedAt: new Date().toISOString(),
        profiles: reported,
        reports,
        summary: { installed, problems, unknown },
      }
    },
    presentCall: args => ({
      card: 'generic',
      title: args.profile ? `Check plugins in profile ${args.profile}` : 'Check installed plugins',
      kind: 'other',
      rawInput: args,
    }),
  }))
}
