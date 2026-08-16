# dsh-web-search-tavily

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/v/dsh-web-search-tavily" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/dm/dsh-web-search-tavily" alt="npm downloads"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily"><img src="https://img.shields.io/github/stars/cnChenKai/dsh-web-search-tavily" alt="GitHub stars"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cnChenKai/dsh-web-search-tavily" alt="License"></a>
</p>

[English](README.md) | [中文](README.zh.md)

基于 [Tavily](https://tavily.com) 的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 搜索 Provider，让内置的 `web_search` 工具走 Tavily 搜索 API（`ctx.web` 能力接缝）。

## 特性

- **免密钥（keyless）**：无需任何 API key——未配置密钥时自动发送官方的 `X-Tavily-Access-Mode: keyless` 请求头，响应与带 key 完全一致。
- **密钥升级**：在 `~/.dsh/.credentials.yaml` 或环境中设置 `TAVILY_API_KEY` 即用付费档（免费档每月 1,000 积分，见 [app.tavily.com](https://app.tavily.com)），每次搜索实时解析密钥。
- **官方推荐默认值**：`search_depth: basic`（1 积分）、`include_answer: false`、`max_results: 5`、`chunks_per_source: 3`，遵循 [Tavily agent 指南](https://docs.tavily.com/documentation/agents.md)。

## 安装

```sh
dsh plugin --profile web add dsh-web-search-tavily
```

设置 API key（可选，keyless 模式无需）：

```yaml
# ~/.dsh/.credentials.yaml
TAVILY_API_KEY: tvly-...
```

切换 Provider（bundle 补丁会自动完成；手动切换方式）：

```yaml
# 你的 profile 的 cordis.patch.yml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: tavily
```

## License

MIT
