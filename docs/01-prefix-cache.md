# 01｜缓存的不是答案，是前缀

Prompt Cache 和“相同问题直接返回旧答案”的响应缓存不是一回事。

模型仍会生成一份新回答；被复用的是处理长输入时产生的中间状态。对 Anthropic Messages 风格的请求，可以把逻辑顺序理解为：

```text
tools → system → messages
```

`cache_control` 所在的 block 是缓存断点。从请求开头到断点之间的内容保持一致，下一次请求才可能命中。

因此最重要的工程规则不是“多加几个标记”，而是：

1. 稳定内容放前面。
2. 易变内容放后面。
3. 工具 schema 的内容和顺序都保持稳定。
4. 通过响应 usage 验证，不凭感觉判断。

第一轮通常会看到 `cache_creation_input_tokens > 0`；后续相同前缀应出现 `cache_read_input_tokens > 0`。如果两者一直为 0，先检查缓存长度和模型支持情况。

下一章：[让缓存边界跟着对话前进](02-rolling-breakpoint.md)。
