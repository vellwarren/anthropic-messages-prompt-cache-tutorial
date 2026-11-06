# 04｜从 demo 到生产

示例证明了请求应怎样排列，但生产系统还需要保护成本和正确性。

## 前缀哈希

在发保温请求前，对最高缓存断点之前的 `model + tools + system + messages` 做 SHA-256。若 hash 与上次不同，应停止保温，等待真实用户请求自然重建。

```bash
npm run demo:guard
```

该示例不联网。

## 连续 miss 熔断

保温请求连续出现“大量 creation、read 为 0”时，不要无限重试。记录 miss 次数并自动停用，避免配置漂移造成反复付费写入。

## 并发

缓存只有在首次响应开始后才可供其他请求读取。相同冷前缀的并发请求可能一起 miss；必要时对首次 warm-up 加单飞锁。

## 工具循环

Agent 一轮内会产生 `assistant/tool_use → user/tool_result`。可在最新 `tool_result` 上增加一个短 TTL 断点，让下一次工具循环复用本轮已有内容。不要在每组历史工具结果上无上限累加标记。

## 观测

至少记录：

- `input_tokens`
- `cache_read_input_tokens`
- `cache_creation_input_tokens`
- 5m / 1h cache creation 明细
- 首 token 延迟和总时延

命中率的输入侧分母应包含未缓存输入、cache read 和 cache creation，详见 [`summarizeUsage`](../src/prompt-cache.mjs)。

下一章：[来源、致谢与兼容性](05-attribution-and-compatibility.md)。
