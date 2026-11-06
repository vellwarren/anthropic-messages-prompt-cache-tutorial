# 02｜让缓存边界跟着对话前进

只缓存 system prompt 能省下一部分输入，但长对话最贵的往往是历史消息。

假设当前请求包含：

```text
user 1
assistant 1
user 2  ← 当前输入
```

不要把 rolling 断点放在 `user 2`。它是本轮新内容，上次请求里不存在。示例把标记放在倒数第二条 user，也就是 `user 1`。

下一轮变成：

```text
user 1
assistant 1
user 2  ← 新的 rolling 断点
assistant 2
user 3  ← 当前输入
```

边界就会随对话逐轮前移。对应实现位于 [`buildCachedMessages`](../src/prompt-cache.mjs)。

有两个限制：

- 示例只接受纯文本持久消息，方便把关键机制讲清楚。图片、thinking、tool_use 和 tool_result 需要按各自协议原样保存。
- 不要为了“整理历史”悄悄改写旧消息。标点、空格或工具顺序变化都可能造成 miss。

下一章：[临时上下文为什么不能入库](03-transient-context.md)。
