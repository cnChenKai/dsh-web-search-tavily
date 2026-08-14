# dsh-web-search-tavily

[English](README.md) | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed search provider for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web capability seam (`ctx.web`): it makes the built-in `web_search` tool run on Tavily's search API instead of the shipped DeepSeek route.

## Features

- **Keyless mode** - no API key needed at all: the provider sends the official `X-Tavily-Access-Mode: keyless` header when no key is configured. Responses are identical to keyed ones.
- **Keyed upgrade** - set `TAVILY_API_KEY` in `~/.dsh/.credentials.yaml` or the environment to use the keyed tier (1,000 free credits/month at [app.tavily.com](https://app.tavily.com)). The key is resolved fresh for every search.
- **Official defaults** - `search_depth: basic` (1 credit), `include_answer: false`, `max_results: 5`, `chunks_per_source: 3`, per [Tavily's agent guidance](https://docs.tavily.com/documentation/agents.md).

## Install

```sh
dsh plugin --profile web add dsh-web-search-tavily
```

Then set your API key (optional - keyless mode works without one):

```yaml
# ~/.dsh/.credentials.yaml
TAVILY_API_KEY: tvly-...
```

Select the provider (the bundle patch does this automatically; to switch manually):

```yaml
# your profile's cordis.patch.yml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: tavily
```

## License

MIT
