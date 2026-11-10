# dsh-web-search-tavily

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/v/dsh-web-search-tavily" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/dm/dsh-web-search-tavily" alt="npm downloads"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily"><img src="https://img.shields.io/github/stars/cnChenKai/dsh-web-search-tavily" alt="GitHub stars"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cnChenKai/dsh-web-search-tavily" alt="License"></a>
</p>

[English](README.md) | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed search provider for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web capability seam (`ctx.web`): it makes the built-in `web_search` tool run on Tavily's search API instead of the shipped DeepSeek route.

**DSH compatibility:** version `0.2.5` was validated with `0.2.2-rc.1` (Node.js 24.9.0 or newer).

## Features

- **Keyless mode** - no API key needed at all: the provider sends the official `X-Tavily-Access-Mode: keyless` header when no key is configured. Responses are identical to keyed ones.
- **Keyed upgrade** - set `TAVILY_API_KEY` in `~/.dsh/.credentials.yaml` or the environment to use the keyed tier (1,000 free credits/month at [app.tavily.com](https://app.tavily.com)). The key is resolved fresh for every search.
- **Official defaults** - `search_depth: basic` (1 credit), `include_answer: false`, `max_results: 5`, `chunks_per_source: 3`, per [Tavily's agent guidance](https://docs.tavily.com/documentation/agents.md).

## Install

Install the npm package into the target DSH profile (replace `web` if needed):

```sh
dsh plugin --profile web add dsh-web-search-tavily@0.2.5
```


The bundle only registers the provider; it does **not** select it or change your existing web configuration. The shipped web profile selects `deepseek-official`. To use Tavily, first inspect the effective `web` entry with `dsh --profile web --dump-config`. Then edit the existing `web` entry in `$DSH_HOME/profiles/web/cordis.patch.yml` (default `~/.dsh/profiles/web/cordis.patch.yml`), or add one if none exists. A patch replaces the **entire** `config` rather than merging it: carry over every existing web setting, changing only `searchProvider`. For example, if your existing fetch provider is `http` and there are no other web settings:

```yaml
- id: web
  config:
    searchProvider: tavily
    fetchProvider: http
```

Keep your actual existing `fetchProvider` and other settings; do not blindly replace your patch with this example. With multiple fetch providers, omitting the selection can cause `WEB_PROVIDER_AMBIGUOUS`. Restart DSH after changing the profile patch.

An API key is optional; without one, the provider uses keyless mode. To use a key, either export `TAVILY_API_KEY` in the environment that starts DSH or add it to the existing versioned credentials file. For a **new** `$DSH_HOME/.credentials.yaml` (default `~/.dsh/.credentials.yaml`), the format is:

```yaml
version: 1
refs:
  TAVILY_API_KEY: "<your-key>"
records: {}
```

For an existing file, add only the `TAVILY_API_KEY` entry under its existing `refs:` mapping; retain the existing `version`, other `refs`, and all `records`. Do not replace the file or add a second `refs` key. Protect the file and never commit secrets.

## License

MIT
