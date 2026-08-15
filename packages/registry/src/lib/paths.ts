/** Where each pipeline stage reads and writes. */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

/** Package root: packages/registry. */
export const PACKAGE_ROOT = join(here, '..', '..')

/** Committed pipeline output — the site reads these files directly. */
export const DATA_DIR = join(PACKAGE_ROOT, 'data')

/** Downloaded tarballs and other reproducible scratch; git-ignored. */
export const CACHE_DIR = join(PACKAGE_ROOT, '.cache')

export const RAW_FILE = join(DATA_DIR, 'raw-npm.json')
export const VERIFIED_FILE = join(DATA_DIR, 'verified.json')
export const PLUGINS_FILE = join(DATA_DIR, 'plugins.json')
/** Compact listing index the browse page ships to the browser. */
export const INDEX_FILE = join(DATA_DIR, 'index.json')
export const STATS_FILE = join(DATA_DIR, 'stats.json')
