# 05｜来源、致谢与兼容性

Prompt Cache 的协议与基础行为来自 Anthropic 的公开文档。本仓库讲解的是 Anthropic Messages 的通用请求组织方式，并提供 ZenMux 作为一个实际调用适配器。

本教程的多层稳定前缀、倒数第二条 user 的 rolling breakpoint，以及把易变上下文隔离在断点之后的组织方式，参考并受启发于 [NyraSeithhh/cache](https://github.com/NyraSeithhh/cache) 的公开说明。仓库中的代码、测试、前缀哈希和生产保护均为重新实现，没有复制该仓库的原文图示。

## 为什么示例没有 `metadata.user_id`

一些旧实践建议固定 `metadata.user_id` 来获得网关粘性路由。但 ZenMux 当前 Anthropic Messages API 参考把 `metadata` 标为不支持，因此示例适配器不依赖该字段。改用其他 Anthropic-compatible 网关时，也应分别核对它支持的字段。

路由和模型能力会变化。真正的验收标准始终是响应中的 `cache_read_input_tokens`，而不是客户端请求里“看起来已经加了某个字段”。

## 继续阅读

- [ZenMux Prompt Cache](https://zenmux.ai/docs/guide/advanced/prompt-cache.html)
- [ZenMux Anthropic Messages API](https://zenmux.ai/docs/api/anthropic/create-messages.html)
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
