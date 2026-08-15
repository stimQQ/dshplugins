/**
 * Publish the registry's browse index and stats as static assets.
 *
 * The browse page filters 800+ entries in the browser, so the index travels as a
 * cacheable JSON file rather than inside the HTML payload. The server still renders
 * the first screen of rows, so the page is readable and indexable before this loads.
 */

import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', '..', '..', 'packages', 'registry', 'data')
const target = join(here, '..', 'public', 'data')

await mkdir(target, { recursive: true })
for (const file of ['index.json', 'stats.json']) {
  await copyFile(join(source, file), join(target, file))
  console.log(`copied ${file}`)
}
