/**
 * The two catalogue languages, primary first.
 *
 * English leads because the corpus does: 621 of 808 plugin summaries are written in
 * English. A Chinese-locale browser still lands on the Chinese side; this only decides
 * the fallback and the document's declared language.
 */
export const LANGS = ['en', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value)
}

/** Pick the reader's side of a bilingual field, falling back to the other. */
export function pick(text: { en: string; zh: string }, lang: Lang): string {
  const own = lang === 'zh' ? text.zh : text.en
  return own !== '' ? own : lang === 'zh' ? text.en : text.zh
}

/** Whether the shown string is a fallback in the other language. */
export function isFallback(text: { en: string; zh: string }, lang: Lang): boolean {
  return (lang === 'zh' ? text.zh : text.en) === ''
}

type Dict = Record<string, { zh: string; en: string }>

/**
 * UI copy. Kept as one flat table so a missing translation is a visible hole in
 * review rather than a silent English string in a Chinese page.
 */
const DICT: Dict = {
  'site.name': { zh: 'DeepSeek Harness 插件', en: 'DeepSeek Harness Plugins' },
  /** Compact form for the header on narrow viewports, where the full name wraps. */
  'site.short': { zh: 'DSH 插件', en: 'DSH Plugins' },
  'site.tagline': {
    zh: 'DeepSeek Harness 插件市场 · 每一条都经过机器复核',
    en: 'The DeepSeek Harness plugins marketplace — every entry machine-checked',
  },
  'nav.browse': { zh: '插件', en: 'Plugins' },
  'nav.learn': { zh: '使用指南', en: 'Guide' },
  'nav.method': { zh: '核验方法', en: 'Method' },
  'nav.api': { zh: '数据 API', en: 'API' },
  'nav.submit': { zh: '收录插件', en: 'Submit' },

  'home.lede': {
    zh: 'dsh 公开 3 天，npm 上已经有 719 个可安装插件。没人知道哪些真的能装。这份目录逐个拉取发布包，复核它声明的东西是否真的在里面。',
    en: 'dsh went public three days ago and npm already carries 719 installable plugins. Nobody knows which ones actually work. This marketplace pulls every published tarball and checks whether what it declares is really inside.',
  },
  'home.readout.installable': { zh: '可安装插件', en: 'Installable plugins' },
  'home.readout.verified': { zh: '通过全部结构检查', en: 'Passing every check' },
  'home.readout.stale': { zh: '依赖版本已过期', en: 'Pinned to a dead version' },
  'home.readout.indexed': { zh: '已索引的包', en: 'Packages indexed' },
  'home.growth': { zh: '每日新增', en: 'Published per day' },
  'home.growth.note': {
    zh: 'dsh 的第一个 npm 包发布于 2026-08-10，GitHub 仓库 08-13 公开。此前不存在任何插件。',
    en: 'The first dsh package hit npm on 2026-08-10; the repository went public on 08-13. No plugin predates that.',
  },
  'home.categories': { zh: '按用途', en: 'By purpose' },
  'home.top': { zh: '精选插件', en: 'Featured plugins' },
  'home.top.note': {
    zh: '排序看的是包装完整度与结构正确性，不是下载量——整个生态还不到 4 天，下载量几乎全是 0。',
    en: 'Ranked by packaging completeness and structural correctness, not downloads — the ecosystem is under four days old and downloads are almost all zero.',
  },
  'home.why': { zh: '为什么需要复核', en: 'Why check at all' },

  'browse.title': { zh: '插件市场', en: 'Plugins Marketplace' },
  'browse.search': { zh: '搜索名称、描述、关键词', en: 'Search names, summaries, keywords' },
  'browse.count': { zh: '条记录', en: 'entries' },
  'browse.filter.all': { zh: '全部', en: 'All' },
  'browse.filter.verified': { zh: '仅通过复核', en: 'Passing only' },
  'browse.filter.ui': { zh: '带界面', en: 'Has UI' },
  'browse.filter.current': { zh: '版本当前', en: 'Version current' },
  'browse.sort': { zh: '排序', en: 'Sort' },
  'browse.sort.score': { zh: '综合评分', en: 'Overall score' },
  'browse.sort.downloads': { zh: '周下载量', en: 'Weekly downloads' },
  'browse.sort.stars': { zh: 'GitHub star', en: 'GitHub stars' },
  'browse.sort.newest': { zh: '最新发布', en: 'Newest' },
  'browse.sort.name': { zh: '名称', en: 'Name' },
  'browse.empty': { zh: '没有符合条件的插件。', en: 'No plugin matches those filters.' },
  'browse.reset': { zh: '清除筛选', en: 'Clear filters' },

  'plugin.install': { zh: '安装', en: 'Install' },
  'plugin.install.note': {
    zh: '把 web 换成你自己的 profile 名。首次使用会自动初始化该 profile。',
    en: 'Swap web for your own profile name. First use initializes the profile for you.',
  },
  'plugin.copy': { zh: '复制', en: 'Copy' },
  'plugin.copied': { zh: '已复制', en: 'Copied' },
  'plugin.checks': { zh: '复核结果', en: 'Checks' },
  'plugin.mounts': { zh: '它挂载了什么', en: 'What it mounts' },
  'plugin.mounts.note': {
    zh: '这些是插件的 cordis.patch.yml 往你的配置树里插入的行。装进去之后，dsh --profile <名字> --dump-config 会原样打印它们。',
    en: "These are the rows the plugin's cordis.patch.yml inserts into your config tree. After installing, dsh --profile <name> --dump-config prints them back.",
  },
  'plugin.compat': { zh: '版本兼容', en: 'Version compatibility' },
  'plugin.compat.note': {
    zh: 'dsh 三天里从 0.0.1-rc.1 走到 0.1.0-rc.6。注意：dsh 库包的当前版本发布在 next 标签上，latest 标签仍停在首日版本。',
    en: 'dsh moved 0.0.1-rc.1 to 0.1.0-rc.6 in three days. Note the dsh library packages promote current releases on the next tag; latest still points at the first-day version.',
  },
  'plugin.meta': { zh: '登记信息', en: 'Record' },
  'plugin.category.reason': { zh: '归类依据', en: 'Filed by' },
  'plugin.nodata': { zh: '作者未提供', en: 'not provided by the author' },
  'plugin.untranslated': { zh: '作者原文（英文）', en: 'Author text (Chinese)' },
  'plugin.back': { zh: '返回插件市场', en: 'Back to plugins' },

  'status.verified': { zh: '通过复核', en: 'Checked' },
  'status.failed': { zh: '存在问题', en: 'Has faults' },
  'status.current': { zh: '版本当前', en: 'Current' },
  'status.stale': { zh: '版本过期', en: 'Stale' },
  'status.undeclared': { zh: '未声明依赖', en: 'Undeclared' },
  'status.unpinned': { zh: '未固定版本', en: 'Unpinned' },
  'status.unknown': { zh: '无法判定', en: 'Unknown' },
  'status.ui': { zh: '含界面', en: 'UI' },

  'kind.bundle': { zh: '可安装插件', en: 'Installable plugin' },
  'kind.client-only': { zh: '浏览器半侧', en: 'Browser half' },
  'kind.library': { zh: '库', en: 'Library' },
  'kind.profile': { zh: 'Profile', en: 'Profile' },

  'learn.title': { zh: 'DeepSeek Harness 插件使用指南', en: 'DeepSeek Harness Plugins Guide' },
  'learn.lede': {
    zh: 'dsh 的插件模型和你见过的大多数不一样：没有特权内核，一切都是可替换的配置层。搞懂这五件事，剩下的都能推出来。',
    en: 'dsh does not have a privileged core — everything is a replaceable config layer. Understand these five things and the rest follows.',
  },
  'learn.next': { zh: '下一篇', en: 'Next' },
  'learn.prev': { zh: '上一篇', en: 'Previous' },
  'learn.toc': { zh: '目录', en: 'Contents' },

  'method.title': { zh: '核验方法', en: 'How entries are checked' },

  'footer.data': { zh: '数据生成于', en: 'Data generated' },
  'footer.source': { zh: '数据来自 npm registry 与 GitHub，逐包复核。', en: 'Sourced from the npm registry and GitHub, checked per package.' },
  'footer.unofficial': {
    zh: '独立项目，与 DeepSeek 无隶属关系。',
    en: 'An independent project, not affiliated with DeepSeek.',
  },
}

/** Translate a key. An unknown key surfaces as the key itself, never as blank text. */
export function t(key: string, lang: Lang): string {
  const entry = DICT[key]
  if (entry === undefined) return key
  return lang === 'zh' ? entry.zh : entry.en
}

/** Build a language-prefixed path. */
export function href(lang: Lang, path = ''): string {
  return `/${lang}${path}`
}
