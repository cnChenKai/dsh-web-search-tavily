# dsh-web-search-tavily

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/v/dsh-web-search-tavily" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-web-search-tavily"><img src="https://img.shields.io/npm/dm/dsh-web-search-tavily" alt="npm downloads"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily"><img src="https://img.shields.io/github/stars/cnChenKai/dsh-web-search-tavily" alt="GitHub stars"></a>
  <a href="https://github.com/cnChenKai/dsh-web-search-tavily/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cnChenKai/dsh-web-search-tavily" alt="License"></a>
</p>

[English](README.md) | [中文](README.zh.md)

基于 [Tavily](https://tavily.com) 的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 搜索 Provider，让内置的 `web_search` 工具走 Tavily 搜索 API（`ctx.web` 能力接缝）。

**DSH 兼容性：** 已按 `0.2.2-rc.1` 验证（Node.js 需为 24.9.0 或更高版本）。当前源码不一定已发布到 npm。

## 特性

- **免密钥（keyless）**：无需任何 API key——未配置密钥时自动发送官方的 `X-Tavily-Access-Mode: keyless` 请求头，响应与带 key 完全一致。
- **密钥升级**：在 `~/.dsh/.credentials.yaml` 或环境中设置 `TAVILY_API_KEY` 即用付费档（免费档每月 1,000 积分，见 [app.tavily.com](https://app.tavily.com)），每次搜索实时解析密钥。
- **官方推荐默认值**：`search_depth: basic`（1 积分）、`include_answer: false`、`max_results: 5`、`chunks_per_source: 3`，遵循 [Tavily agent 指南](https://docs.tavily.com/documentation/agents.md)。

## 安装

无需发布即可安装当前源码。在仓库目录运行（需要时将 `web` 替换为目标 profile）：

```sh
npm pack
dsh plugin --profile web add "$(pwd)/dsh-web-search-tavily-0.2.5.tgz"
```

npm 上的包可能仍是旧版且不兼容；按包名安装前请检查已发布版本。

Bundle 只注册 Provider，**不会**自动选择它，也不会更改现有 web 配置。DSH 自带的 web profile 选择的是 `deepseek-official`。如需使用 Tavily，先运行 `dsh --profile web --dump-config` 检查生效的 `web` 条目，然后编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`（默认 `~/.dsh/profiles/web/cordis.patch.yml`）中已有的 `web` 条目；没有时再添加。补丁会**整体替换** `config`，不会合并：须保留所有原有 web 设置，仅改 `searchProvider`。例如，原 fetch provider 为 `http` 且没有其他 web 设置时：

```yaml
- id: web
  config:
    searchProvider: tavily
    fetchProvider: http
```

请保留实际使用的 `fetchProvider` 和其他设置，不要直接用示例覆盖原补丁。存在多个 fetch provider 时，遗漏选择可能导致 `WEB_PROVIDER_AMBIGUOUS`。修改 profile 补丁后重启 DSH。

API key 可选；没有密钥时使用 keyless 模式。如需使用密钥，可在启动 DSH 的环境中导出 `TAVILY_API_KEY`，或将其加入已有的版本化凭据文件。**新建** `$DSH_HOME/.credentials.yaml`（默认 `~/.dsh/.credentials.yaml`）的格式如下：

```yaml
version: 1
refs:
  TAVILY_API_KEY: "<your-key>"
records: {}
```

若文件已存在，仅在原有 `refs:` 下添加 `TAVILY_API_KEY`，保留原有 `version`、其他 `refs` 和全部 `records`；不要覆盖文件或添加第二个 `refs`。保护文件且不要提交密钥。

## License

MIT
