import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer, Header } from '@/components/Chrome'
import { isLang, LANGS } from '@/lib/i18n'
import { STATS } from '@/lib/registry'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return {
    alternates: {
      languages: { en: '/en/', 'zh-CN': '/zh/' },
    },
    openGraph: { locale: lang === 'zh' ? 'zh_CN' : 'en_US' },
  }
}

/**
 * Next keeps <html> in the root layout, above this segment, so its `lang` is the
 * site default (English). The Chinese pages correct it here, before first paint.
 */
const SET_LANG = `document.documentElement.lang='zh-CN'`

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLang(lang)) notFound()

  return (
    <div className="relative min-h-dvh">
      {lang === 'zh' && <script dangerouslySetInnerHTML={{ __html: SET_LANG }} />}
      <Header lang={lang} />
      <main>{children}</main>
      <Footer lang={lang} generatedAt={STATS.generatedAt} />
    </div>
  )
}
