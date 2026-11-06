import crypto from 'node:crypto';

const CACHE_TTLS = new Set(['5m', '1h']);

function cacheControl(ttl) {
  if (!CACHE_TTLS.has(ttl)) {
    throw new TypeError('ttl must be "5m" or "1h"');
  }
  return { type: 'ephemeral', ttl };
}

function normalizeStoredMessage(message, index) {
  if (!message || !['user', 'assistant'].includes(message.role)) {
    throw new TypeError(`messages[${index}].role must be user or assistant`);
  }
  if (typeof message.content !== 'string' || !message.content.trim()) {
    throw new TypeError(`messages[${index}].content must be a non-empty string`);
  }
  return {
    role: message.role,
    content: [{ type: 'text', text: message.content }],
  };
}

export function buildCachedMessages(storedMessages, options = {}) {
  const { transientContext = '', ttl = '1h' } = options;
  if (!Array.isArray(storedMessages) || storedMessages.length === 0) {
    throw new TypeError('storedMessages must be a non-empty array');
  }

  const userIndexes = storedMessages
    .map((message, index) => message?.role === 'user' ? index : -1)
    .filter(index => index >= 0);
  const rollingBreakpoint = userIndexes.length >= 2 ? userIndexes.at(-2) : -1;
  const messages = storedMessages.map(normalizeStoredMessage);

  if (rollingBreakpoint >= 0) {
    messages[rollingBreakpoint].content[0].cache_control = cacheControl(ttl);
  }

  if (String(transientContext).trim()) {
    if (userIndexes.length === 0) {
      throw new TypeError('transientContext requires a user message');
    }
    messages[userIndexes.at(-1)].content.push({
      type: 'text',
      text: [
        '<transient_context>',
        'Private context for this request only. Do not quote it verbatim.',
        String(transientContext).trim(),
        '</transient_context>',
      ].join('\n'),
    });
  }

  return messages;
}

export function buildRequestBody(options) {
  const {
    model,
    stableSystem,
    storedMessages,
    transientContext = '',
    tools = [],
    ttl = '1h',
    maxTokens = 800,
  } = options || {};

  if (!String(model || '').trim()) throw new TypeError('model is required');
  if (!String(stableSystem || '').trim()) throw new TypeError('stableSystem is required');
  if (!Array.isArray(tools)) throw new TypeError('tools must be an array');
  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new TypeError('maxTokens must be a positive integer');
  }

  const body = {
    model: String(model).trim(),
    max_tokens: maxTokens,
    system: [{
      type: 'text',
      text: String(stableSystem),
      cache_control: cacheControl(ttl),
    }],
    messages: buildCachedMessages(storedMessages, { transientContext, ttl }),
  };

  if (tools.length > 0) body.tools = structuredClone(tools);
  return body;
}

export function getHighestCachedPrefix(body) {
  let lastMessageIndex = -1;
  for (const [index, message] of (body.messages || []).entries()) {
    if (message.content?.some(block => block?.cache_control)) {
      lastMessageIndex = index;
    }
  }

  return {
    model: body.model,
    tools: body.tools || [],
    system: body.system || [],
    messages: lastMessageIndex >= 0
      ? body.messages.slice(0, lastMessageIndex + 1)
      : [],
  };
}

export function hashCachedPrefix(body) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(getHighestCachedPrefix(body)))
    .digest('hex');
}

export function summarizeUsage(usage = {}) {
  const uncachedInput = Number(usage.input_tokens || 0);
  const cacheRead = Number(usage.cache_read_input_tokens || 0);
  const cacheCreated = Number(usage.cache_creation_input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  const totalInput = uncachedInput + cacheRead + cacheCreated;

  return {
    uncachedInput,
    cacheRead,
    cacheCreated,
    output,
    cacheHitRate: totalInput > 0 ? cacheRead / totalInput : 0,
  };
}
