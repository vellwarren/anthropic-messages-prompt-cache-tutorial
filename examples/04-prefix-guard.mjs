import assert from 'node:assert/strict';
import { buildRequestBody, hashCachedPrefix } from '../src/prompt-cache.mjs';

const common = {
  model: 'anthropic/claude-sonnet-4.6',
  storedMessages: [
    { role: 'user', content: '第一轮' },
    { role: 'assistant', content: '收到' },
    { role: 'user', content: '第二轮' },
  ],
};

const expected = buildRequestBody({
  ...common,
  stableSystem: '固定规则 A'.repeat(1000),
});
const drifted = buildRequestBody({
  ...common,
  stableSystem: '固定规则 B'.repeat(1000),
});

const expectedHash = hashCachedPrefix(expected);
const actualHash = hashCachedPrefix(drifted);
assert.notEqual(expectedHash, actualHash);

console.log({ expectedHash, actualHash });
console.log('检测到前缀漂移：保温任务此时应该停止，而不是付费重写缓存。');
