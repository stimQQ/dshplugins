/**
 * Homepage answer content.
 *
 * Written answer-first with concrete numbers, because generative engines cite
 * extractable claims rather than ranking pages. Every figure here is one the
 * pipeline produced; nothing is estimated.
 */

import type { Faq } from './seo'

export interface Section {
  id: string
  h: { en: string; zh: string }
  /** The one-sentence answer, placed first so an engine can lift it whole. */
  lead: { en: string; zh: string }
  body: { en: string[]; zh: string[] }
}

export const SECTIONS: Section[] = [
  {
    id: 'what-is-a-dsh-plugin',
    h: { en: 'What is a DeepSeek Harness plugin?', zh: '什么是 DeepSeek Harness 插件？' },
    lead: {
      en: 'A dsh plugin is an npm package that declares `dsh.bundle` in its package.json and ships a `cordis.patch.yml` — a config layer that inserts or replaces rows in the harness plugin tree.',
      zh: 'dsh 插件是一个在 package.json 里声明 `dsh.bundle` 并附带 `cordis.patch.yml` 的 npm 包。那个 YAML 是一层配置补丁，往 harness 的插件树里插入或替换若干行。',
    },
    body: {
      en: [
        'DeepSeek Harness (dsh) is an open-source agent harness released by DeepSeek on 10 August 2026. It is built on Cordis and takes one idea to its limit: everything is a plugin. Model adapters, the tool registry, the session log — and the agent loop itself — are all plugins, so all of them can be replaced from configuration.',
        'That is why a dsh plugin is not a callback registered against a plugin API. It is a layer in an ordered stack. Installing one appends its patch to your profile; the patch addresses rows by id, and later layers win. There is no privileged core to hook into, so nothing needs an escape hatch.',
        'A plugin module exports `apply(ctx)`. Through `ctx` it registers services, typed events, tools, and prompt fragments — and every registration is a reversible effect, so unloading a plugin undoes all of it.',
      ],
      zh: [
        'DeepSeek Harness（dsh）是 DeepSeek 于 2026 年 8 月 10 日发布的开源 agent harness，基于 Cordis 构建，把一个想法推到了极限：一切皆插件。模型适配器、工具注册表、会话日志——连 agent loop 本身——全都是插件，因此全都能从配置里替换掉。',
        '所以 dsh 插件不是注册在某个插件 API 上的回调，而是一个有序叠放的配置层。安装一个插件，就是把它的 patch 追加进你的 profile；patch 按 id 定位行，后叠的层胜出。这里没有需要 hook 的特权内核，因此也不需要任何逃生舱口。',
        '插件模块导出 `apply(ctx)`，通过 `ctx` 注册服务、类型化事件、工具和提示词片段——每一次注册都是可撤销的副作用，卸载插件时全部自动回滚。',
      ],
    },
  },
  {
    id: 'why-use-plugins',
    h: { en: 'Why use dsh plugins?', zh: '为什么要用 dsh 插件？' },
    lead: {
      en: 'Because replacing one provider changes the whole product: point the filesystem and process providers at a remote sandbox and Bash, PTY, and LSP all move with them — no per-tool fork required.',
      zh: '因为替换一个提供方就能改变整个产品：把文件系统和进程提供方指向远程沙箱，Bash、PTY、LSP 会一起搬过去——不需要为每个工具做一份 fork。',
    },
    body: {
      en: [
        'dsh models each capability as a seam with three roles: a Service Definition that declares the interface, a Service Provider that implements it, and a Consumer — usually the model-facing tool — that uses it. Extensions depend on the definition and never on a provider, so a provider swap is invisible to everything downstream.',
        'The practical payoff is scope. 719 installable plugins already exist, and they cover ground a single vendor would take years to reach: 137 Web UI plugins, 99 model providers, 73 vision and multimodal plugins, 56 search plugins, 51 usage and cost meters, 45 skill packs.',
        'The harness also lets an agent modify its own runtime. The `cordis_define` tool has the model write a plugin during a conversation and mount it live, then unmount it — possible only because every registration is reversible.',
      ],
      zh: [
        'dsh 把每项能力建模成一条 seam，包含三个角色：声明接口的 Service Definition、实现它的 Service Provider、以及使用它的 Consumer（通常是面向模型的工具）。扩展只依赖定义、绝不依赖具体提供方，所以换提供方对下游完全透明。',
        '实际收益是覆盖面。目前已有 719 个可安装插件，触及的领域是单一厂商要花数年才能覆盖的：137 个 Web 界面插件、99 个模型提供方、73 个视觉与多模态插件、56 个搜索插件、51 个用量与成本计量、45 个技能包。',
        'harness 还允许 agent 修改自己的运行时。`cordis_define` 工具让模型在对话过程中现写一个插件并实时挂载，之后再卸下——这只有在每次注册都可撤销的前提下才可能成立。',
      ],
    },
  },
  {
    id: 'how-to-install',
    h: { en: 'How do you install a dsh plugin?', zh: '怎么安装 dsh 插件？' },
    lead: {
      en: 'Run `dsh plugin --profile <name> add <package>`. It forwards to pnpm inside the profile directory, then appends the package to that profile’s bundle layer list if it declares `dsh.bundle`.',
      zh: '执行 `dsh plugin --profile <名字> add <包名>`。它把参数转发给 profile 目录里的 pnpm，如果这个包声明了 `dsh.bundle`，就把它追加进该 profile 的层列表。',
    },
    body: {
      en: [
        'Start the harness first with `npx @deepseek-ai/dsh web`, which serves the Web UI at 127.0.0.1:3080. dsh requires Node ^22.19 or >=24.',
        'After installing, run `dsh --profile <name> --dump-config` before booting. It prints the composed configuration tree; if your plugin is not in it, the problem is the install, not the plugin code.',
        'Prefer npm installs over git installs. An npm package ships artifacts the author already built, so nothing from the package executes during installation. A git install fetches source and needs `allowBuilds` authorization in the profile’s pnpm-workspace.yaml — which means letting that package run code on your machine, outside any sandbox the agent uses.',
      ],
      zh: [
        '先用 `npx @deepseek-ai/dsh web` 启动，Web UI 默认在 127.0.0.1:3080。dsh 要求 Node ^22.19 或 >=24。',
        '装完先别启动，执行 `dsh --profile <名字> --dump-config`。它打印实际组合出来的配置树；你的插件如果没出现在里面，问题在安装这一步，不在插件代码里。',
        '优先从 npm 装，不要从 git 装。npm 包是作者发布时构建好的产物，安装过程不执行这个包的任何代码；从 git 装拉到的是源码，需要在 profile 的 pnpm-workspace.yaml 里开 `allowBuilds`——那等于允许这个包在你机器上执行代码，且不在 agent 的任何沙箱内。',
      ],
    },
  },
]

/** Comparison rows. Every claim is checkable from each project's own repository. */
export interface CompareRow {
  label: { en: string; zh: string }
  dsh: { en: string; zh: string }
  claudeCode: { en: string; zh: string }
  openclaw: { en: string; zh: string }
  hermes: { en: string; zh: string }
}

export const COMPARE: CompareRow[] = [
  {
    label: { en: 'What it is', zh: '是什么' },
    dsh: { en: 'Agent harness where every part is a plugin', zh: '一切皆插件的 agent harness' },
    claudeCode: { en: 'Anthropic’s official coding agent', zh: 'Anthropic 官方编码 agent' },
    openclaw: { en: 'Personal AI assistant and multi-channel gateway', zh: '个人 AI 助手与多渠道网关' },
    hermes: { en: 'Self-improving agent that grows its own skills', zh: '自我进化、自己长出技能的 agent' },
  },
  {
    label: { en: 'Extension model', zh: '扩展模型' },
    dsh: { en: 'Ordered config layers; rows addressed by id', zh: '有序配置层，按 id 定位行' },
    claudeCode: { en: 'Skills, MCP servers, hooks, subagents', zh: 'Skill、MCP、hooks、subagent' },
    openclaw: { en: 'Extensions and provider plugins', zh: '扩展与提供方插件' },
    hermes: { en: 'Skills learned and refined from experience', zh: '从经验中习得并打磨的技能' },
  },
  {
    label: { en: 'Is the agent loop replaceable?', zh: 'agent 循环可替换吗' },
    dsh: { en: 'Yes — it is itself a plugin', zh: '可以，它本身就是插件' },
    claudeCode: { en: 'No', zh: '不可以' },
    openclaw: { en: 'No', zh: '不可以' },
    hermes: { en: 'No', zh: '不可以' },
  },
  {
    label: { en: 'Primary language', zh: '主要语言' },
    dsh: { en: 'TypeScript', zh: 'TypeScript' },
    claudeCode: { en: 'TypeScript', zh: 'TypeScript' },
    openclaw: { en: 'TypeScript', zh: 'TypeScript' },
    hermes: { en: 'Python', zh: 'Python' },
  },
  {
    label: { en: 'Best when you want to', zh: '最适合的场景' },
    dsh: { en: 'Rebuild the harness itself', zh: '改造 harness 本身' },
    claudeCode: { en: 'Ship code in a terminal today', zh: '今天就在终端里写代码' },
    openclaw: { en: 'Reach an assistant from any channel', zh: '从任意渠道触达一个助手' },
    hermes: { en: 'Let an agent accumulate capability', zh: '让 agent 自己积累能力' },
  },
]

/** Reader profiles — the "who is it for" block. */
export const AUDIENCES = [
  {
    icon: '⚙',
    who: { en: 'Harness builders', zh: '改造 harness 的人' },
    text: {
      en: 'You want to replace the agent loop, the tool pipeline, or the session store rather than work around them. No other harness lets you swap those from config.',
      zh: '你想替换掉 agent 循环、工具流水线或会话存储，而不是绕过它们。没有别的 harness 允许你从配置里换掉这些。',
    },
  },
  {
    icon: '◧',
    who: { en: 'Web UI extenders', zh: '扩展 Web 界面的人' },
    text: {
      en: '359 of 719 plugins ship a browser half through `dsh.client`, so the GUI is extensible by the same mechanism as the backend — one package, both halves.',
      zh: '719 个插件里有 359 个通过 `dsh.client` 附带浏览器半侧，所以 GUI 和后端用的是同一套扩展机制——一个包，两个半侧。',
    },
  },
  {
    icon: '⌘',
    who: { en: 'Teams switching from another agent', zh: '从别的 agent 迁移过来的团队' },
    text: {
      en: 'Bridges already exist: 10 packages target Claude Code compatibility, 10 target Codex, and dedicated plugins import chat history from Claude Code, Codex, ChatGPT, Cursor, and Gemini.',
      zh: '桥接已经有了：10 个包做 Claude Code 兼容，10 个做 Codex，还有专门的插件把 Claude Code、Codex、ChatGPT、Cursor、Gemini 的聊天记录导入进来。',
    },
  },
  {
    icon: '◈',
    who: { en: 'Plugin authors', zh: '插件作者' },
    text: {
      en: 'The ecosystem is four days old and adding ~240 plugins a day. Only 7 of 719 fill in store metadata, so a well-packaged plugin is visible immediately.',
      zh: '生态只有 4 天，每天新增约 240 个插件。719 个里只有 7 个填了展示元数据，所以一个包装得当的插件立刻就能被看见。',
    },
  },
]

/** FAQ — also emitted as FAQPage structured data. */
export const FAQS: Faq[] = [
  {
    q: {
      en: 'How many DeepSeek Harness plugins are there?',
      zh: 'DeepSeek Harness 有多少个插件？',
    },
    a: {
      en: 'As of 15 August 2026 there are 719 installable dsh plugins on npm — packages that declare `dsh.bundle` and therefore contribute a config layer. A further 312 dsh-related packages are indexed as libraries or browser halves, for 1,031 total. The first one was published on 13 August 2026, three days after dsh itself reached npm.',
      zh: '截至 2026 年 8 月 15 日，npm 上有 719 个可安装的 dsh 插件——即声明了 `dsh.bundle`、因而贡献一层配置的包。另有 312 个相关包被索引为库或浏览器半侧，共计 1031 个。第一个插件发布于 2026 年 8 月 13 日，比 dsh 本身上 npm 晚三天。',
    },
  },
  {
    q: { en: 'Are DeepSeek Harness plugins safe to install?', zh: 'dsh 插件安装安全吗？' },
    a: {
      en: 'A plugin runs inside the dsh process with everything dsh can reach, so treat installing one as running the author’s code. Structural checks catch packaging faults — 688 of 719 plugins pass all seven — but they read packaging, not behaviour. Prefer npm installs, which execute no package code during installation; a git install requires `allowBuilds` authorization, which does execute the package’s build script on your machine outside any sandbox.',
      zh: '插件运行在 dsh 进程里，权限和 dsh 一样大，所以安装它等同于运行作者的代码。结构复核能查出打包缺陷——719 个里有 688 个通过全部七项——但它读的是包装，不是行为。优先从 npm 安装，安装过程不执行包内任何代码；从 git 安装需要开启 `allowBuilds`，那会在你机器上执行该包的构建脚本，且不在任何沙箱内。',
    },
  },
  {
    q: {
      en: 'What is the difference between DeepSeek Harness and Claude Code?',
      zh: 'DeepSeek Harness 和 Claude Code 有什么区别？',
    },
    a: {
      en: 'Claude Code is Anthropic’s official coding agent, extended through skills, MCP servers, hooks, and subagents — but its agent loop is fixed. DeepSeek Harness makes the loop itself a plugin, so it can be replaced from configuration along with model adapters, the tool registry, and the session log. Claude Code is the better choice for shipping code today; dsh is the better choice for rebuilding the harness itself.',
      zh: 'Claude Code 是 Anthropic 官方的编码 agent，通过 skill、MCP、hooks 和 subagent 扩展，但它的 agent 循环是固定的。DeepSeek Harness 把循环本身也做成插件，因此可以连同模型适配器、工具注册表、会话日志一起从配置里替换。今天就要写代码，选 Claude Code；要改造 harness 本身，选 dsh。',
    },
  },
  {
    q: { en: 'How do I publish a dsh plugin?', zh: '怎么发布一个 dsh 插件？' },
    a: {
      en: 'Publish an npm package with three files: a package.json declaring `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`, the patch file itself, and the plugin module it references. The patch file must appear in the package’s `files` array — omitting it is the most common failure in this catalogue, because the package installs cleanly and the layer simply is not there. Add `dsh-plugin` to your keywords so the catalogue finds you.',
      zh: '发布一个包含三个文件的 npm 包：声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 的 package.json、patch 文件本身、以及它引用的插件模块。patch 文件必须出现在包的 `files` 数组里——漏掉它是这份目录里最常见的失败，因为包能正常装上，而那个层根本不存在。keywords 里加上 `dsh-plugin`，目录就能抓到你。',
    },
  },
  {
    q: {
      en: 'Why do plugin rankings here ignore downloads and stars?',
      zh: '这里的排序为什么不看下载量和 star？',
    },
    a: {
      en: 'Because every plugin in the ecosystem is less than a week old, so downloads and stars encode publication order rather than quality — they are near zero for almost every entry. Ranking instead uses structural evidence: whether the declared patch actually ships, whether patch rows resolve on a user’s machine, whether the declared browser half is present, and whether the plugin’s dsh dependency range still admits the currently published version.',
      zh: '因为生态里每个插件都不到一周，下载量和 star 编码的是发布先后而不是质量——绝大多数条目都接近 0。排序改用结构性证据：声明的 patch 是否真的打包发布、patch 行在用户机器上能否解析、声明的浏览器半侧是否存在，以及插件的 dsh 依赖区间是否还能接纳当前已发布的版本。',
    },
  },
]
