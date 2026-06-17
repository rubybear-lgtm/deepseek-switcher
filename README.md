# deepseek-switcher

CLI tool that switches Claude Code's model API provider between
**DeepSeek** and the default **Anthropic** backend.

No shell profile modifications required. Works in any terminal and shell
(Zsh, Bash, Fish, etc.) out of the box.

---

## Install

```bash
npm install -g rubybear-lgtm/deepseek-switcher
```

This registers the following commands globally:

- `dswitch` -- interactive switcher wizard
- `ccode` / `cld` -- launch Claude Code with the active provider
- `deepclaude` -- launch Claude Code with DeepSeek (direct, ignores active provider)

## Uninstall

```bash
npm uninstall -g deepseek-switcher
```

---

## Usage

### Switch Provider

```bash
dswitch                    # interactive wizard
dswitch switch deepseek    # quick-switch to DeepSeek
dswitch switch anthropic   # quick-switch back to Anthropic
```

### Launch

```bash
ccode          # Claude Code with the active provider
deepclaude     # always Claude Code with DeepSeek
claude         # bypasses the switcher entirely (native Anthropic)
```

Arguments are forwarded directly to Claude Code
(e.g. `ccode --help`, `deepclaude --model deepseek-v4-flash[1m]`).

### Other Commands

| Command | Description |
| :--- | :--- |
| `dswitch status` | Show active provider and API key status |
| `dswitch config` | Configure the DeepSeek API key |
| `dswitch clear` | Clear saved API key |
| `dswitch setup` | Clean up legacy shell integrations |

---

## How It Works

When DeepSeek is active, the launcher sets these environment variables
before spawning `claude`:

| Variable | Value |
| :--- | :--- |
| `ANTHROPIC_BASE_URL` | `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_API_KEY` | Your saved DeepSeek API key |
| `ANTHROPIC_MODEL` | `deepseek-v4-pro[1m]` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `deepseek-v4-pro[1m]` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `deepseek-v4-flash[1m]` |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `deepseek-v4-flash[1m]` |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` |
| `CLAUDE_CODE_EFFORT_LEVEL` | `max` |

When Anthropic is active, all custom environment variables are removed and
Claude Code runs with its default configuration.

API keys and active provider are stored in
`~/.config/deepseek-switcher/config.json`.

---

## License

MIT
