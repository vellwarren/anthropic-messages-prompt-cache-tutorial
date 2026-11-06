import assert from 'node:assert/strict';
import { buildRequestBody, hashCachedPrefix } from '../src/prompt-cache.mjs';

const base = {
  model: 'anthropic/claude-sonnet-4.6',
  stableSystem: '这里代表足够长、逐字稳定的 system prompt。'.repeat(500),
  storedMessages: [
    { role: 'user', content: '我们昨天聊了什么？' },
    { role: 'assistant', content: '聊了缓存前缀。' },
    { role: 'user', content: '那今天继续。' },
  ],
};

const rainy = buildRequestBody({ ...base, transientContext: '东京正在下雨。' });
const sunny = buildRequestBody({ ...base, transientContext: '东京天气晴朗。' });
const rainyHash = hashCachedPrefix(rainy);
const sunnyHash = hashCachedPrefix(sunny);

assert.equal(rainyHash, sunnyHash);
console.log('两次动态上下文不同，但缓存前缀 hash 相同：');
console.log({ rainyHash, sunnyHash });
console.log('\n最新 user 的 content blocks：');
console.dir(rainy.messages.at(-1).content, { depth: null });
