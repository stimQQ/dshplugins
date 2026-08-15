# 插件普查 · Plugin Census

一份 DeepSeek Harness（dsh）插件目录：**每一条都逐个拉取发布包机器复核过**，不是收集链接。

A machine-checked catalogue of DeepSeek Harness plugins. Every entry is verified against
the published tarball, not just listed.

## 为什么是复核，不是收集

dsh 的第一个 npm 包发布于 **2026-08-10**，GitHub 仓库 **08-13** 公开。三天之内 npm 上出现
719 个声明 `dsh.bundle` 的可安装插件，来自几百个独立作者，每天还在增加约 240 个。

这意味着 star 和下载量现在几乎全是 0——它们编码的是"谁先发布"，不是"谁好用"。**当前唯一
可用的质量信号是结构性的**：这个包声明的东西，是不是真的在发布包里。

## 仓库结构

```
packages/registry/     数据管道 —— 核心资产,两个终端共用
  src/crawl.ts           npm 关键词检索 → 候选包 + manifest
  src/verify.ts          拉 tarball 逐项复核 → 7 项检查 + 版本兼容
  src/build.ts           富化(下载量/GitHub) + 分类 + 排序 → 站点数据
  src/lib/compat.ts      dsh 依赖区间 vs 当前已发布版本
  src/lib/categorize.ts  分类推导(生态里只有 7 个包自己填了 category)
  data/                  产物,提交进 git,站点无网络即可构建

apps/web/              Next.js 站点(静态导出,中英双语)
  app/globals.css        设计系统 token 层 — citedrank.co 体系
  app/[lang]/            首页 / 浏览 / 详情 / 教学 / 核验方法
  lib/catalog.ts         纯常量与类型 —— 客户端组件只能引这个
  lib/registry.ts        数据加载 —— 仅服务端
  lib/lessons.ts         教学内容(双语成对,缺翻译无法蒙混过关)
```

## 运行

```sh
pnpm install
pnpm registry:crawl && pnpm registry:verify && pnpm registry:build   # 刷新数据
pnpm dev                                                            # 站点 → :3000
pnpm build                                                          # 静态导出到 apps/web/out
```

数据由 `.github/workflows/refresh.yml` 每日自动刷新并提交。

## 设计系统

采用 citedrank.co 体系（`design-system-citedrank-co.md`）：奶油底 `#f1eee7`、橙色主调
`#ff7a00`、圆角卡片 + 柔和阴影、Sora（正文）+ Comfortaa（标题）、2px 基准间距。

两处有记录的扩展：该体系的字号止于 20px，首页 hero 与数字读数需要更大字号，故在其上追加
display 级别；该体系未定义深色主题，故用它自己的 accent-1 `#1d2c2c` 作为深色底推导了一套。

## 七项复核

| 检查 | 失败意味着 |
|---|---|
| `declares-bundle` | 没有 `dsh.bundle.patch`，不会成为 profile 的一层 |
| `patch-shipped` | 声明的 patch 文件没打进 tarball，加载时才报错 |
| `patch-parses` | patch 解析不出任何插件行 |
| `rows-resolvable` | 插件行指向作者本机的绝对路径 —— 装了必坏 |
| `entry-shipped` | 声明的入口模块不在包里 |
| `prebuilt` | 只发了源码，安装要在用户机器上执行构建脚本 |
| `client-half-shipped` | 声明了界面但 `./client` 导出缺失 —— 装完一切正常，界面永不出现 |

版本兼容单独成轴。**参照系必须是"已发布的最高版本"，不是 npm 的 `latest` 标签**：dsh 的库包
把当前版本发在 `next` 上，`latest` 还停在首日的 `0.0.1-rc.1`，拿 `latest` 比会把所有跟上进度
的插件误判成过期。

## 现状

- 索引 1031 个包，其中 719 个可安装，688 个通过全部结构检查
- 359 个带浏览器界面，38 个依赖版本已过期
- 15 个分类全部由规则推导，每条记录都带"归类依据"可复核

## 尚未完成

- **站内插件**：把同一份数据做成 dsh 插件，在 Web UI 里直接浏览安装（网站先行，插件后置）
- **翻译层**：作者描述大多单语言，目前如实标注 `[原文]` 而非机器翻译填充；`build.ts` 的
  `bilingual()` 已为此留好结构
- **运行时复核**：目前是静态检查。真正装进一个 profile 并启动 dsh 看 fiber 是否激活，是
  没有任何同类项目在做的一层

## 声明

独立项目，与 DeepSeek 无隶属关系。数据来自 npm registry 与 GitHub 公开接口。
