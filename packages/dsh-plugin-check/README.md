# dsh-plugin-check

Check the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugins you
**already installed**, and draft the issue that fixes each problem.

Every plugin marketplace answers *what could I install*. None of them answers *is what I
installed still working* — which is the question that decays: dsh went `0.0.1-rc.1` →
`0.1.0-rc.6` in its first five days, so a plugin that installed cleanly last week can be
pinned to a range that no longer resolves.

## Install

```sh
dsh plugin --profile web add dsh-plugin-check
```

## Use

Ask the agent to check your plugins. It calls the `plugin_check` tool, which reads the
profiles under `$DSH_HOME`, asks [dshplugins.co](https://dshplugins.co) what it knows about
each installed package, and reports the difference.

```
Checked 6 installed plugin(s): 4 with problems, 0 not in the registry.

[web] @nanmicoder/dsh-agent-teams
  error: depends on @deepseek-ai/dsh-llm@^0.0.1-rc.1, but npm now ships 0.1.0-rc.6

[web] @a834063245/hologram-dsh
  error: rows-resolvable: 1 row(s) name something an install cannot resolve
```

Pass `draftReports: true` and it also writes an issue body per problem plugin, naming the
exact edit that fixes it, ready to file against that plugin's repository.

### What it reports

| Finding | Meaning |
|---|---|
| `patch-shipped` | The declared `cordis.patch.yml` never shipped — the plugin installs and the layer is not there |
| `rows-resolvable` | A patch row names something an install cannot resolve, usually the package's pre-publish name |
| `client-half-shipped` | A declared browser half is missing — it boots fine and the UI never appears |
| `prebuilt` | Source only, so installing runs its build script on your machine |
| stale range | Its dsh dependency range excludes the version npm ships today |

## It is read-only

It never installs, upgrades, or removes anything. Most of what it finds can only be fixed by
the plugin's author, which is why it drafts the report rather than pretending to repair.

It reads packaging, not code: a plugin with nothing reported can still be malicious or
useless. Treat it as a dead-on-arrival filter, not a safety endorsement — a plugin runs
inside the dsh process with everything dsh can reach.

## Configuration

```yaml
- id: plugin-check
  name: dsh-plugin-check
  config:
    registry: https://dshplugins.co   # any host serving the same /api/v1 shape
    timeoutMs: 8000
```

Data comes from the free [dshplugins.co API](https://dshplugins.co/en/api/) (CC BY 4.0),
which downloads every published tarball daily and checks it against what its manifest claims.

MIT
