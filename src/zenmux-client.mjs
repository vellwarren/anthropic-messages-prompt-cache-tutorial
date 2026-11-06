const DEFAULT_BASE_URL = 'https://zenmux.ai/api/anthropic';

export async function sendZenMuxMessage(body, options = {}) {
  const {
    apiKey = process.env.ZENMUX_API_KEY,
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = globalThis.fetch,
  } = options;

  if (!apiKey) throw new Error('ZENMUX_API_KEY is required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  const response = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 1000) };
  }

  if (!response.ok) {
    const error = new Error(`ZenMux request failed with HTTP ${response.status}`);
    error.status = response.status;
    error.detail = payload?.error?.message || payload?.message || payload?.raw || '';
    throw error;
  }

  return payload;
}

export function responseText(response) {
  return (response?.content || [])
    .filter(block => block?.type === 'text')
    .map(block => block.text || '')
    .join('')
    .trim();
}
