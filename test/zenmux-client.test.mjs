import test from 'node:test';
import assert from 'node:assert/strict';
import { responseText, sendZenMuxMessage } from '../src/zenmux-client.mjs';

test('client sends the Anthropic-compatible request shape', async () => {
  let captured;
  const response = await sendZenMuxMessage({ model: 'demo' }, {
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(captured.url, 'https://zenmux.ai/api/anthropic/v1/messages');
  assert.equal(captured.options.headers['x-api-key'], 'test-key');
  assert.equal(captured.options.headers['anthropic-version'], '2023-06-01');
  assert.equal(responseText(response), 'ok');
});

test('client exposes bounded upstream error detail', async () => {
  await assert.rejects(
    sendZenMuxMessage({ model: 'demo' }, {
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({
        error: { message: 'bad request' },
      }), { status: 400 }),
    }),
    error => error.status === 400 && error.detail === 'bad request',
  );
});
