/**
 * Pre-publish self-check.
 *
 * Runs the registry's own seven checks against a tarball on disk, so a package is
 * held to the same standard it will be measured by once published. Reuses verifyOne
 * directly — a second implementation would drift from the pipeline it mirrors.
 *
 * Usage: tsx src/check-local.ts <path-to-tgz> <path-to-package.json>
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildVersionIndex, dshDependencies } from './lib/compat.ts'
import type { NpmManifest } from './lib/types.ts'
import { verifyOne } from './verify.ts'

const [tarball, manifestPath] = process.argv.slice(2)
if (tarball === undefined || manifestPath === undefined) {
  console.error('usage: tsx src/check-local.ts <tgz> <package.json>')
  process.exit(2)
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as NpmManifest
manifest.dist = { tarball: resolve(tarball) }

const versions = await buildVersionIndex(Object.keys(dshDependencies(manifest)))
const result = await verifyOne(
  { name: manifest.name, version: manifest.version, foundBy: ['local'], manifest },
  versions,
)

console.log(`\n${result.name}@${result.version}  kind=${result.kind}\n`)
for (const check of result.checks) {
  console.log(`  ${check.ok ? '✓' : '✗'} ${check.id}: ${check.detail.en}`)
}
console.log(`\n  compat: ${result.compat.status}`)
for (const finding of result.compat.findings) {
  console.log(`    ${finding.packageName} ${finding.range} → ${finding.current} [${finding.status}]`)
}
console.log(`\n  verified: ${result.verified}`)
if (!result.verified) {
  console.error('\nFAILED — not fit to publish.')
  process.exit(1)
}
console.log('\nPASSED — meets the standard this registry measures by.')
