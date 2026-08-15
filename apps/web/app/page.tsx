import Link from 'next/link'

/**
 * The static root. There is no server to negotiate a language, so the page picks one
 * from the browser and offers both as plain links for anyone the script misses.
 */
const PICK = `(function(){try{var zh=(navigator.language||'').toLowerCase().indexOf('zh')===0;location.replace(zh?'/zh/':'/en/')}catch(e){}})()`

export default function Root() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PICK }} />
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-md text-lg font-bold text-white"
            style={{ background: 'var(--color-orange)' }}
            aria-hidden
          >
            ✓
          </span>
          <h1 className="h-card">
            DeepSeek Harness Plugins
            <span className="block text-ink-faint">DeepSeek Harness 插件</span>
          </h1>
        </div>
        <div className="flex gap-2.5">
          <Link href="/zh/" className="btn btn-primary">
            中文
          </Link>
          <Link href="/en/" className="btn btn-plain">
            English
          </Link>
        </div>
      </div>
    </>
  )
}
