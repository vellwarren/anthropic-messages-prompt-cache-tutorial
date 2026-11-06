import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCachedMessages,
  buildRequestBody,
  getHighestCachedPrefix,
  hashCachedPrefix,
  summarizeUsage,
} from '../src/prompt-cache.mjs';

const history = [
  { role: 'user', content: '第一问' },
  { role: 'assistant', content: '第一答' },
  { role: 'user', content: '第二问' },
];

function body(overrides = {}) {
  return buildRequestBody({
    model: 'anthropic/claude-sonnet-4.6',
    stableSystem: '固定规则'.repeat(1000),
    storedMessages: history,
    ...overrides,
  });
}

test('rolling breakpoint is placed on the second-to-last user message', () => {
  const messages = buildCachedMessages(history, { ttl: '1h' });
  assert.deepEqual(messages[0].content[0].cache_control, {
    type: 'ephemeral',
    ttl: '1h',
  });
  assert.equal(messages[2].content[0].cache_control, undefined);
});

test('transient context stays after the breakpoint and does not mutate storage', () => {
  const original = structuredClone(history);
  const messages = buildCachedMessages(history, { transientContext: '今天下雨' });
  assert.equal(messages[2].content.length, 2);
  assert.match(messages[2].content[1].text, /今天下雨/);
  assert.deepEqual(history, original);
});

test('changing only transient context keeps the cached prefix hash stable', () => {
  const rainy = body({ transientContext: '今天下雨' });
  const sunny = body({ transientContext: '今天晴天' });
  assert.equal(hashCachedPrefix(rainy), hashCachedPrefix(sunny));
});

test('changing stable system or tools changes the cached prefix hash', () => {
  const baseline = body();
  const changedSystem = body({ stableSystem: '另一套固定规则'.repeat(1000) });
  const changedTools = body({
    tools: [{
      name: 'get_weather',
      description: 'Get weather',
      input_schema: { type: 'object', properties: {} },
    }],
  });
  assert.notEqual(hashCachedPrefix(baseline), hashCachedPrefix(changedSystem));
  assert.notEqual(hashCachedPrefix(baseline), hashCachedPrefix(changedTools));
});

test('highest prefix excludes the current user and transient tail', () => {
  const prefix = getHighestCachedPrefix(body({ transientContext: '临时资料' }));
  assert.equal(prefix.messages.length, 1);
  assert.equal(prefix.messages[0].content[0].text, '第一问');
});

test('usage summary counts cache creation in the input-side denominator', () => {
  assert.deepEqual(summarizeUsage({
    input_tokens: 100,
    cache_read_input_tokens: 800,
    cache_creation_input_tokens: 100,
    output_tokens: 20,
  }), {
    uncachedInput: 100,
    cacheRead: 800,
    cacheCreated: 100,
    output: 20,
    cacheHitRate: 0.8,
  });
});

test('invalid ttl and empty messages fail before network access', () => {
  assert.throws(() => buildCachedMessages(history, { ttl: '60m' }), /ttl/);
  assert.throws(() => buildCachedMessages([]), /non-empty array/);
});
