'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type Lang, t } from '@/lib/i18n'

/** Swap the language segment of the current path, keeping the reader in place. */
function swapLang(pathname: string, next: Lang): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return `/${next}/`
  segments[0] = next
  return `/${segments.join('/')}/`
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setTheme((document.documentElement.dataset['theme'] as 'light' | 'dark') ?? 'light')
  }, [])

  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset['theme'] = next
    try {
      localStorage.setItem('census-theme', next)
    } catch {
      // A blocked localStorage costs persistence only; the toggle still works.
    }
    setTheme(next)
  }

  return (
    <button type="button" onClick={flip} aria-label="Toggle theme" className="btn btn-plain">
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  )
}

export function Header({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}/`
  const other: Lang = lang === 'zh' ? 'en' : 'zh'

  const links = [
    { href: `/${lang}/plugins/`, key: 'nav.browse' },
    { href: `/${lang}/dsh-plugins-guide/`, key: 'nav.learn' },
    { href: `/${lang}/method/`, key: 'nav.method' },
    { href: `/${lang}/api/`, key: 'nav.api' },
  ]

  return (
    <header className="mx-auto flex max-w-[76rem] items-center gap-2 px-5 py-5 sm:px-8">
      <Link href={`/${lang}/`} className="flex items-center gap-2.5">
        {/* The mark carries its own alpha, so the belly stays negative space and
            reads on the cream ground and the dark one alike. */}
        <Image src="/logo-deepseek.png" alt="" width={28} height={28} className="size-7" priority />

        <span className="hidden text-base font-semibold tracking-tight sm:inline">{t('site.name', lang)}</span>
        <span className="text-base font-semibold tracking-tight sm:hidden">{t('site.short', lang)}</span>
      </Link>

      <nav className="ml-auto flex items-center gap-0.5">
        {links.map((link) => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.key}
              href={link.href}
              className="btn btn-plain"
              style={active ? { color: 'var(--color-ink)' } : undefined}
            >
              {t(link.key, lang)}
            </Link>
          )
        })}
        <Link href={swapLang(pathname, other)} className="btn btn-plain">
          {other === 'zh' ? '中文' : 'EN'}
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  )
}

export function Footer({ lang, generatedAt }: { lang: Lang; generatedAt: string }) {
  return (
    <footer className="mx-auto max-w-[76rem] px-5 pb-10 sm:px-8">
      <div className="card-xl flex flex-col gap-3 p-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-base leading-relaxed text-ink-soft">
          {t('footer.source', lang)} {t('footer.unofficial', lang)}
        </p>
        <p className="text-base text-ink-faint">
          {t('footer.data', lang)}{' '}
          <time dateTime={generatedAt} className="font-mono">
            {generatedAt.slice(0, 10)}
          </time>
        </p>
      </div>
    </footer>
  )
}
