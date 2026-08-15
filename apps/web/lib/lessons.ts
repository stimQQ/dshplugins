/**
 * The learn track.
 *
 * Written as data rather than MDX so both languages sit in one place and a missing
 * translation is impossible to ship unnoticed. Every technical claim here is taken
 * from the dsh source and docs at 0.1.0-rc.6, not from inference.
 */

export type Block =
  | { t: 'p'; zh: string; en: string }
  | { t: 'h'; zh: string; en: string }
  | { t: 'code'; code: string; lang?: string }
  | { t: 'note'; zh: string; en: string }
  | { t: 'warn'; zh: string; en: string }
  | { t: 'list'; zh: string[]; en: string[] }

export interface Lesson {
  slug: string
  title: { zh: string; en: string }
  lede: { zh: string; en: string }
  blocks: Block[]
}

export const LESSONS: Lesson[] = [
  {
    slug: 'what-is-a-plugin',
    title: { zh: '插件是什么', en: 'What a plugin is' },
    lede: {
      zh: 'dsh 里没有需要打补丁的内核。模型适配器、工具、会话日志，连 agent 循环本身都是插件——所以每一样都能从配置里换掉。',
      en: 'dsh has no privileged core to patch. Model adapters, tools, the session log, even the agent loop itself are plugins — so every one of them is replaceable from config.',
    },
    blocks: [
      {
        t: 'p',
        zh: '一个插件就是一个导出 apply 函数的模块。框架加载时调用它，传进来一个 ctx（上下文），你通过 ctx 注册能力。',
        en: 'A plugin is a module that exports an apply function. The framework calls it at load time with a ctx (context) through which you register capabilities.',
      },
      {
        t: 'code',
        code: `import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'
export const inject = ['tools']   // 依赖的服务就绪后才会调用 apply

export function apply(ctx: Context) {
  ctx.tools.register(/* ... */)
}`,
      },
      {
        t: 'p',
        zh: 'ctx 是服务的容器。每个服务占一个稳定的键——ctx.tools、ctx.llm、ctx.sessions、ctx.agents——别的插件按键去找服务，而不是 import 具体实现。这就是替换一个提供方就能改变整个产品行为的原因。',
        en: 'ctx is a container of services. Each service occupies a stable key — ctx.tools, ctx.llm, ctx.sessions, ctx.agents — and other plugins look services up by key instead of importing an implementation. That is why swapping one provider changes the whole product.',
      },
      {
        t: 'h',
        zh: '注册是可撤销的',
        en: 'Registration is reversible',
      },
      {
        t: 'p',
        zh: '通过 ctx 注册的一切——事件监听、工具、定时器——在插件卸载时自动清理，你不需要手动 removeListener。需要手动清理的资源用 ctx.effect() 交回一个清理函数。',
        en: 'Everything registered through ctx — listeners, tools, timers — is cleaned up when the plugin unloads; you never write removeListener. For resources that need manual teardown, return a disposer from ctx.effect().',
      },
      {
        t: 'code',
        code: `export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setInterval(() => console.log('heartbeat'), 5000)
    return () => clearInterval(timer)   // 插件卸载时执行
  })
}`,
      },
      {
        t: 'note',
        zh: '这个性质是整个架构的地基：因为没有一个注册是永久的，所以插件可以在运行时挂载和卸载，agent 甚至能在对话中间写一个插件把自己装上去。',
        en: 'This property is the foundation of the architecture: because no registration is permanent, plugins mount and unmount at runtime — the agent can even write a plugin mid-conversation and load it into itself.',
      },
    ],
  },

  {
    slug: 'install',
    title: { zh: '装一个插件', en: 'Installing one' },
    lede: {
      zh: '插件装进 profile，不是装进 dsh。搞清楚 profile 是什么，安装和卸载就都是一条命令。',
      en: 'Plugins install into a profile, not into dsh. Once you know what a profile is, installing and removing are each one command.',
    },
    blocks: [
      {
        t: 'p',
        zh: 'profile 是 $DSH_HOME/profiles/<名字> 下的一个目录，描述一套可启动的组合：它列出自己叠了哪些包，存放自己装的插件，并保存你自己的 cordis.patch.yml。dsh 随发行版带了 web 和 headless 两个模板。',
        en: 'A profile is a directory under $DSH_HOME/profiles/<name> describing one bootable assembly: which bundles it stacks, the plugins it has installed, and your own cordis.patch.yml. dsh ships web and headless as templates.',
      },
      { t: 'h', zh: '先跑起来', en: 'Get it running' },
      {
        t: 'code',
        code: `npx @deepseek-ai/dsh web        # Web UI → http://127.0.0.1:3080`,
      },
      {
        t: 'note',
        zh: '需要 Node ^22.19 或 >=24。低于这个版本 dsh 起不来。',
        en: 'Requires Node ^22.19 or >=24. Below that, dsh will not start.',
      },
      { t: 'h', zh: '装、看、卸', en: 'Install, inspect, remove' },
      {
        t: 'code',
        code: `dsh plugin --profile web add dsh-hello-plugin

# 装完先别启动,看看它往配置树里插了什么:
dsh --profile web --dump-config

dsh plugin --profile web remove dsh-hello-plugin`,
      },
      {
        t: 'p',
        zh: 'dsh plugin 本质是把参数转发给 profile 目录里的 pnpm，所以 pnpm 的子命令都能用（add、remove、update、list）。装完它会检查这个包有没有声明 dsh.bundle——有就把它追加进 profile 的层列表，没有就只当普通依赖装着并打印一条警告。',
        en: 'dsh plugin forwards its arguments to pnpm inside the profile directory, so every pnpm subcommand works (add, remove, update, list). Afterwards it checks whether the package declares dsh.bundle — if so it joins the profile layer list, if not it stays a plain dependency and you get a warning.',
      },
      {
        t: 'note',
        zh: '--dump-config 是你最重要的排查工具。它打印实际组合出来的配置树；你装的插件如果没出现在里面，问题就在安装这一步，不在插件代码里。',
        en: '--dump-config is your most important diagnostic. It prints the actually-composed config tree; if your plugin is not in it, the problem is the install, not the plugin code.',
      },
    ],
  },

  {
    slug: 'layers',
    title: { zh: '层与覆盖', en: 'Layers and overrides' },
    lede: {
      zh: '跑起来的 dsh 是一棵插件树，由若干 patch 层按顺序叠成。理解叠放顺序，你就能改掉任何一行——包括别人插件里的行。',
      en: 'A running dsh is a plugin tree composed of patch layers applied in order. Understand the order and you can change any row — including rows inside someone else’s plugin.',
    },
    blocks: [
      {
        t: 'p',
        zh: '配置在一个空的根之上按这个顺序逐层叠加：',
        en: 'Layers are applied over an empty root in this order:',
      },
      {
        t: 'list',
        zh: [
          'profile 的 dsh.profile.bundles 列出的每个组合包的 patch，按列表顺序——@deepseek-ai/dsh-base 永远是第一层',
          'profile 自己的 cordis.patch.yml',
          '$DSH_HOME/cordis.patch.yml（各 profile 共享的机器本地偏好）',
          '每个 --patch <路径> 覆盖层，按命令行顺序',
        ],
        en: [
          "each bundle patch listed in the profile's dsh.profile.bundles, in list order — @deepseek-ai/dsh-base is always first",
          "the profile's own cordis.patch.yml",
          '$DSH_HOME/cordis.patch.yml, machine-local preferences shared across profiles',
          'each --patch <path> overlay, in argv order',
        ],
      },
      {
        t: 'p',
        zh: '一条 patch 按 id 定位某一行，然后替换它。后叠的层按行胜出。',
        en: 'A patch addresses a row by id and replaces it. Later layers win, row by row.',
      },
      {
        t: 'warn',
        zh: 'patch 替换的是目标行的整个 config 值，不是深度合并各个键。只想改一个字段，也必须把这一行需要的所有键重新写一遍——这是最常见的踩坑点。',
        en: "A patch replaces the target row's entire config value; it does not deep-merge keys. To change one field you must restate every key that row needs. This is the most common way people get bitten.",
      },
      {
        t: 'code',
        code: `# ~/.dsh/profiles/web/cordis.patch.yml
# 覆盖默认模型(必须重述整行 config)
- replace:
    - id: agent-default-model
      name: '@deepseek-ai/dsh-agent-default-model'
      config:
        provider: deepseek-official
        model: deepseek-v4-flash`,
        lang: 'yaml',
      },
      {
        t: 'p',
        zh: '推论有两个。作为插件作者：你的 patch 可以按 id 覆盖前面层的行，但要重述整行；同时也要预期用户会在他自己的层里覆盖你，所以给出的默认值应该是大多数人会保留的那种。作为用户：任何一行你都能改，不需要动别人的包。',
        en: 'Two consequences. As a plugin author: your patch can override earlier rows by id, restating them in full — and expect users to override you from their own layer, so ship defaults most people will keep. As a user: you can change any row without touching anyone else’s package.',
      },
      {
        t: 'h',
        zh: '本地开发时的临时层',
        en: 'A scratch layer while developing',
      },
      {
        t: 'code',
        code: `dsh web --patch ./my-plugin/cordis.yml`,
      },
      {
        t: 'p',
        zh: '临时层里的插件路径必须写绝对路径。patch 文件只贡献配置，不改变 loader 解析模块用的目录。',
        en: 'Plugin paths in a scratch overlay must be absolute. A patch file contributes configuration only; it does not change the directory the loader resolves modules against.',
      },
    ],
  },

  {
    slug: 'safety',
    title: { zh: '装之前该问什么', en: 'What to ask before installing' },
    lede: {
      zh: '插件运行在 dsh 进程里，权限和 dsh 一样大。生态只有几天，装之前值得花一分钟看清楚。',
      en: 'A plugin runs inside the dsh process with everything dsh can reach. The ecosystem is days old — a minute of looking is worth it.',
    },
    blocks: [
      {
        t: 'h',
        zh: '从 npm 装 vs 从 GitHub 装',
        en: 'From npm versus from GitHub',
      },
      {
        t: 'p',
        zh: '从 npm 装的是作者发布时已经构建好的产物，安装过程不执行这个包的任何代码。从 git 装拉到的是源码，pnpm 需要跑这个包的 prepare 脚本才能得到能加载的产物。',
        en: 'An npm install fetches artifacts the author built at publish time; nothing from the package executes during install. A git install fetches source, and pnpm must run the package’s prepare script to produce something loadable.',
      },
      {
        t: 'warn',
        zh: 'pnpm 10 默认拒绝执行 git 依赖的构建脚本，所以第一次 add 会失败。要装成功，你必须在这个 profile 的 pnpm-workspace.yaml 里写 allowBuilds: { 包名: true }。这一步的真实含义是：允许这个包的代码在安装时于你的机器上执行，而且不在 agent 的任何沙箱里。只对源码可信的包这样做，并把 commit 锁死（github:you/plugin#<sha>），否则作者之后的推送可以悄悄改变实际运行的东西。',
        en: 'pnpm 10 refuses to run a git dependency’s build scripts by default, so the first add fails. Authorizing it means writing allowBuilds: { package: true } into that profile’s pnpm-workspace.yaml — which literally means letting that package’s code execute on your machine at install time, outside any sandbox the agent uses. Do it only for source you trust, and pin the commit (github:you/plugin#<sha>) so later pushes cannot silently change what runs.',
      },
      {
        t: 'h',
        zh: '目录里的复核结果怎么读',
        en: 'Reading the catalogue checks',
      },
      {
        t: 'list',
        zh: [
          'patch-shipped 失败：包声明了配置层，但那个文件根本没打进发布包——装上去加载会失败。',
          'rows-resolvable 失败：patch 里的插件行指向作者本机的绝对路径。这是照抄教程发布造成的，装了必然坏。',
          'client-half-shipped 失败：声明了浏览器界面但 ./client 导出缺失。这个最阴——装完一切正常，界面永远不出现。',
          'prebuilt 失败：只发了源码，安装要执行构建脚本（见上）。',
          '版本过期：依赖区间已经排除了当前发布的 dsh 版本。',
        ],
        en: [
          'patch-shipped fails: the package declares a config layer whose file never shipped — loading will fail.',
          "rows-resolvable fails: a patch row points at an absolute path on the author's machine. Copied from the tutorial and published as-is; broken on arrival.",
          'client-half-shipped fails: a declared browser half whose ./client export is missing. The nastiest one — it installs and boots cleanly and the UI simply never appears.',
          'prebuilt fails: source only, so installing runs a build script (see above).',
          'Stale version: the declared range excludes the currently published dsh version.',
        ],
      },
      {
        t: 'note',
        zh: '这些检查看的是包装是否正确，不是代码是否安全，也不代表插件功能好用。它们能排除"装了必坏"，不能替你判断"值不值得装"。',
        en: 'These checks read packaging correctness, not code safety, and not whether the plugin is any good. They rule out dead-on-arrival; they do not tell you whether something is worth installing.',
      },
    ],
  },

  {
    slug: 'write-your-own',
    title: { zh: '写一个并发布', en: 'Write one and publish it' },
    lede: {
      zh: '从一个文件到能被 dsh plugin add 装上的 npm 包，中间只差一份 manifest 和一个 patch 文件。',
      en: 'From one file to a package anyone can dsh plugin add is a manifest and a patch file.',
    },
    blocks: [
      { t: 'h', zh: '三个文件', en: 'Three files' },
      {
        t: 'code',
        code: `hello-plugin/
├── package.json       # 声明 dsh.bundle
├── cordis.patch.yml   # profile 列入这个包时应用的层
└── index.js           # patch 行引用的插件模块`,
      },
      {
        t: 'code',
        code: `{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "keywords": ["dsh-plugin", "deepseek-harness"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}`,
        lang: 'json',
      },
      {
        t: 'code',
        code: `# cordis.patch.yml — 按包名引用,不是相对路径
- insert:
    - id: hello
      name: dsh-hello-plugin`,
        lang: 'yaml',
      },
      {
        t: 'warn',
        zh: 'files 数组必须包含 cordis.patch.yml。漏掉它是这份目录里最常见的失败——包能装上，但那个层根本不存在。',
        en: 'The files array must include cordis.patch.yml. Leaving it out is the most common failure in this catalogue: the package installs and the layer simply is not there.',
      },
      { t: 'h', zh: '发布', en: 'Publish' },
      {
        t: 'code',
        code: `pnpm publish              # 发布时构建好产物,用户安装无需任何构建授权
dsh plugin --profile web add dsh-hello-plugin`,
      },
      {
        t: 'p',
        zh: '发布到 npm 而不是让用户从 git 装，用户就不需要开 allowBuilds。TypeScript 包要么在 publish 前构建好 lib/，要么提供一个自包含的 prepare 脚本——但后者会把构建授权的负担推给每一个用户。',
        en: 'Publishing to npm instead of asking users to install from git means nobody has to enable allowBuilds. A TypeScript package should either build lib/ before publishing or ship a self-contained prepare script — but the latter pushes the authorization burden onto every user.',
      },
      { t: 'h', zh: '让它被找到', en: 'Make it findable' },
      {
        t: 'list',
        zh: [
          'package.json 的 keywords 里加 dsh-plugin —— 这份目录就是按它抓的',
          '给 GitHub 仓库打 dsh-plugin 话题',
          '填 description、license、repository —— 目录评分会算这些,而且这是读者判断的唯一依据',
        ],
        en: [
          'add dsh-plugin to keywords in package.json — that is what this catalogue crawls',
          'add the dsh-plugin topic to the GitHub repository',
          'fill in description, license, repository — the catalogue scores these, and they are all a reader has to go on',
        ],
      },
      {
        t: 'note',
        zh: '双语描述可以写进 dsh.plugin.summary（en / zh-CN 两个键），显示名写 dsh.plugin.displayName。这个约定还不是官方的，目前 719 个插件里只有 7 个填了——填了的会在目录里显示得完整得多。',
        en: 'Bilingual copy goes in dsh.plugin.summary (en and zh-CN keys) with dsh.plugin.displayName for the shown name. The convention is not official yet — 7 of 719 plugins use it — and the ones that do present far better here.',
      },
    ],
  },
]

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug)
}
