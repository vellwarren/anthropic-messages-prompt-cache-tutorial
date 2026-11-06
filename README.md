# 把长对话留在缓存里

> Anthropic Messages Prompt Cache 的可运行示例，以 ZenMux 作为调用适配器。

本仓库是对 [NyraSeithhh/cache](https://github.com/NyraSeithhh/cache) 所述 Prompt Cache 方案的非官方可运行复现。核心缓存布局归功于原作者；这里提供重新编写的示例代码、测试和工程保护。

很多“API 缓存没生效”并不是少写了一个参数，而是请求里混进了会变化的内容。

Prompt Cache 匹配的是请求前缀。工具、system prompt 和旧消息只要在缓存断点之前发生变化，后面的缓存就可能失效。本仓库把这件事拆成四个小示例，让你能先在本地看懂 Anthropic Messages 请求形状，再选择是否通过附带的 ZenMux 适配器做真实验证。

这不是“相同问题直接返回旧答案”的响应缓存。模型每次仍会生成新回答；复用的是处理长输入时产生的中间状态。

## 它演示什么

- 给稳定 system prompt 添加显式 `cache_control`。
- 把 rolling breakpoint 放在倒数第二条 user 消息，让历史缓存逐轮前移。
- 把时间、RAG 召回和临时记忆放到最新 user 的未缓存尾部。
- 用 `cache_read_input_tokens` / `cache_creation_input_tokens` 判断真实命中。
- 用 SHA-256 检查最高缓存前缀是否漂移。
- 在真实项目里加入 miss 熔断、并发单飞和工具循环断点。

## 请求长什么样

```text
固定且顺序稳定的 tools
固定 system prompt                         ← 缓存断点 A
旧对话历史
倒数第二条 user 消息                      ← 滚动缓存断点 B
当前 user 消息
本轮 transient context（只发给模型，不入库）
```

最关键的一句话：**稳定的放前面，易变的放在最后一个缓存断点之后。**

## 快速开始

需要 Node.js 20 或更新版本。

```bash
npm install
npm run check
```

`npm run check` 只做语法检查和本地测试，不联网、不读取 API key、不会产生费用。

然后运行两个本地演示：

```bash
npm run demo:transient
npm run demo:guard
```

前者证明“临时上下文变化不影响缓存前缀”；后者演示保温任务如何发现前缀漂移并停下来。

## 通过 ZenMux 适配器做真实验证

先复制环境变量模板：

```bash
cp .env.example .env
```

填写：

```dotenv
ZENMUX_API_KEY=你的_key
ZENMUX_MODEL=anthropic/claude-sonnet-4.6
CACHE_TTL=1h
STABLE_CONTEXT_FILE=./examples/stable-context.example.txt
```

再把 `examples/stable-context.example.txt` 换成你自己的长且稳定的 system prompt 或固定资料。短 prompt 达不到模型最低缓存长度时，请求可能成功，但 read 和 creation 都是 0。

基础 system 缓存：

```bash
npm run demo:basic
```

三轮滚动对话：

```bash
npm run demo:rolling
```

这两个命令会真实调用 API 并产生费用。示例会先检查 key 和稳定上下文，避免拿短占位文字做无效测试。

## 怎样看结果

第一轮通常负责创建缓存：

```text
cache_creation_input_tokens > 0
```

第二轮起应出现读取：

```text
cache_read_input_tokens > 0
```

常见情况：

| usage 表现 | 通常意味着 |
|---|---|
| 第一轮 creation 大、read 为 0 | 正常创建缓存 |
| 后续 read 大于 0 | 已命中 |
| read 和 creation 始终为 0 | 内容太短、模型不支持或标记未生效 |
| 每轮 creation 很大、read 为 0 | 前缀在变化，或上游没有复用此前缓存 |

不要只比较总 token。缓存创建、缓存读取和普通输入的计价不同，应该分别记录。

## 教程目录

1. [缓存的不是答案，是前缀](docs/01-prefix-cache.md)
2. [让缓存边界跟着对话前进](docs/02-rolling-breakpoint.md)
3. [临时上下文放在断点之后](docs/03-transient-context.md)
4. [从 demo 到生产](docs/04-production-guardrails.md)
5. [来源、致谢与兼容性](docs/05-attribution-and-compatibility.md)

## 代码目录

```text
src/
  prompt-cache.mjs        请求构造、前缀截取、hash、usage 统计
  zenmux-client.mjs       ZenMux 调用适配器
examples/
  01-system-cache.mjs     两次请求复用固定 system
  02-rolling-chat.mjs     三轮聊天的 rolling breakpoint
  03-transient-context.mjs 动态上下文隔离（本地）
  04-prefix-guard.mjs     前缀漂移保护（本地）
test/
  *.test.mjs              不访问网络的行为测试
```

示例刻意只持久化纯文本 user/assistant 消息。真实 Agent 还需要正确保留图片、thinking、tool_use、tool_result 和签名字段；不要把这个教学层直接当成完整生产网关。

## 来源与致谢

缓存协议和基础语义以 [Anthropic Prompt Caching 文档](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)为准；示例适配器的请求地址与兼容性以 [ZenMux Prompt Cache 文档](https://zenmux.ai/docs/guide/advanced/prompt-cache.html)为准。

多层稳定前缀、倒数第二条 user 的 rolling breakpoint，以及把易变内容隔离到断点之后的组织方式，参考并受启发于 [NyraSeithhh/cache](https://github.com/NyraSeithhh/cache) 的公开说明。本仓库重新实现了代码、测试和生产保护，没有复制其原文图示。

本教程没有加入旧实践中的 `metadata.user_id`。ZenMux 当前 Anthropic Messages API 参考把 `metadata` 标为不支持；缓存是否成功应以返回 usage 为准。

## 安全与费用

- 不要提交 `.env` 或 API key。
- 不要把真实私人对话、记忆或内部 system prompt 放进公开仓库。
- 日志只记录 token 数和短 hash，不记录提示词正文。
- 生产环境需要鉴权、速率限制、费用上限和失败熔断。
- 详细边界见 [SECURITY.md](SECURITY.md)。

## License

本仓库采用 [PolyForm Noncommercial License 1.0.0](LICENSE)，允许非商业学习、实验、修改与分享，不授予商业使用许可。

*Bunny & Elliott ♡*
