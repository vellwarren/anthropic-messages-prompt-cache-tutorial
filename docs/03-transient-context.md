# 03｜临时上下文放在断点之后

聊天应用经常在每轮请求里加入当前时间、RAG 召回、实时状态或临时摘要。这些内容天然会变化，不能塞进带缓存标记的 system block。

本仓库把它们作为第二个 text block，追加在最新 user 消息后面：

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "用户真正输入的话" },
    { "type": "text", "text": "<transient_context>...</transient_context>" }
  ]
}
```

这块内容只存在于发给模型的请求中，不写回聊天数据库。下一轮重新从数据库构造历史时，它自然消失，rolling 断点才能继续前移。

运行本地示例：

```bash
npm run demo:transient
```

它会构造两份临时上下文不同的请求，并证明最高缓存前缀的 SHA-256 相同。该示例不联网、不产生费用。

下一章：[从 demo 到生产](04-production-guardrails.md)。
