/**
 * Registry data, read at build time from the committed pipeline output.
 *
 * Server components only. A client component that imports this file would drag the
 * whole 3MB corpus into the browser bundle; client code imports `./catalog` instead.
 */

import index from '@registry/data/index.json'
import plugins from '@registry/data/plugins.json'
import stats from '@registry/data/stats.json'
import type { IndexRow, Plugin, Stats } from './catalog'

export const ALL_PLUGINS = plugins as unknown as Plugin[]
export const INDEX_ROWS = index as unknown as IndexRow[]
export const STATS = stats as unknown as Stats

/** Only these kinds get a detail page; a plain library has nothing to install. */
const LISTED_KINDS = new Set(['bundle', 'client-only'])

export const LISTED_PLUGINS = ALL_PLUGINS.filter((plugin) => LISTED_KINDS.has(plugin.kind))

const BY_NAME = new Map(ALL_PLUGINS.map((plugin) => [plugin.name, plugin]))

export function getPlugin(name: string): Plugin | undefined {
  return BY_NAME.get(name)
}

export { CATEGORIES, CATEGORY_LABELS, nameToSegments, pluginHref } from './catalog'
export type { Check, CompatFinding, IndexRow, PatchRow, Plugin, Stats } from './catalog'
