/** Shared fetch helpers: retry on transient failure, bounded concurrency, disk cache. */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { CACHE_DIR } from './paths.ts'

const USER_AGENT = 'dshplugins-registry (+https://github.com/dshplugins)'

/** Sleep, used only for retry backoff. */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export interface FetchOptions {
  headers?: Record<string, string>
  /** Total attempts including the first. */
  attempts?: number
  /** Treat 404 as an expected outcome and return null instead of throwing. */
  allow404?: boolean
}

/**
 * GET a URL and parse JSON, retrying on 5xx, 429, and network errors.
 * @returns the parsed body, or null when `allow404` and the resource is missing.
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
  const { headers = {}, attempts = 4, allow404 = false } = options
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...headers },
      })
      if (response.status === 404 && allow404) return null
      if (response.status === 429 || response.status >= 500) {
        // Honor Retry-After when the registry sends one; otherwise back off. The
        // status is recorded so an exhausted retry loop reports why, not `undefined`.
        lastError = new Error(`${response.status} ${response.statusText} for ${url}`)
        const retryAfter = Number(response.headers.get('retry-after') ?? 0)
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1))
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`)
      return (await response.json()) as T
    } catch (error) {
      lastError = error
      await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url}: ${String(lastError)}`)
}

/** Download bytes with the same retry policy, for tarballs. */
export async function fetchBuffer(url: string, attempts = 3): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } })
      if (!response.ok) throw new Error(`${response.status} for ${url}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
      await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw new Error(`download failed: ${url}: ${String(lastError)}`)
}

/**
 * Cache a tarball on disk keyed by URL, so re-running verify does not re-download
 * the whole ecosystem. Cache entries are immutable: an npm tarball URL pins a version.
 */
export async function fetchTarballCached(url: string): Promise<string> {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 32)
  const path = join(CACHE_DIR, 'tarballs', `${key}.tgz`)
  try {
    await readFile(path)
    return path
  } catch {
    const buffer = await fetchBuffer(url)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, buffer)
    return path
  }
}

/**
 * Run `worker` over `items` with at most `limit` in flight, preserving input order.
 * A worker that throws yields an `Error` in that slot rather than failing the batch.
 * @param onProgress - called after each settled item with the completed count.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<(R | Error)[]> {
  const results = new Array<R | Error>(items.length)
  let cursor = 0
  let done = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = await worker(items[index]!, index)
      } catch (error) {
        results[index] = error instanceof Error ? error : new Error(String(error))
      }
      onProgress?.(++done, items.length)
    }
  })
  await Promise.all(runners)
  return results
}
