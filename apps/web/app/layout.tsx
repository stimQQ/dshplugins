import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SITE_URL } from '@/lib/seo'
import './globals.css'

/**
 * Measurement id, read at build time — the site is a static export, so a
 * `NEXT_PUBLIC_` value is inlined into the bundle rather than read at runtime.
 * Absent (local builds, forks, previews without the var) the tag never ships,
 * so development traffic cannot pollute the property.
 */
const GA_ID = process.env['NEXT_PUBLIC_GA_ID']

/** Inter carries the whole interface; weight, not family, creates hierarchy. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  // Resolves every relative URL in metadata — OG images, canonicals, alternates —
  // against the real origin. Without it Next emits localhost-relative URLs.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'DeepSeek Harness Plugins',
    // Every page title gains the brand suffix without restating it per route.
    template: '%s · DeepSeek Harness Plugins',
  },
  description:
    'The DeepSeek Harness (dsh) plugins marketplace — every entry verified against its published npm tarball. 逐个复核发布包，告诉你哪个插件真的能装。',
}

/** Applies the stored theme before first paint so the page never flashes the wrong ground. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('census-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font variables live on <html>: the theme tokens are declared on :root, and a
    // var() they reference must resolve there too.
    //
    // `lang` is the site default. Next keeps <html> in the root layout, above the
    // [lang] segment, so the Chinese pages correct it from their own layout.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  )
}
