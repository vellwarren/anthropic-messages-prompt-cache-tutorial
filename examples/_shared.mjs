import fs from 'node:fs';
import path from 'node:path';
import { summarizeUsage } from '../src/prompt-cache.mjs';

export function loadLocalEnv(file = '.env') {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trimStart().startsWith('#')) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

export function demoConfig() {
  loadLocalEnv();
  const stableContextFile = process.env.STABLE_CONTEXT_FILE
    || './examples/stable-context.example.txt';
  const resolved = path.resolve(stableContextFile);
  const stableSystem = fs.readFileSync(resolved, 'utf8').trim();

  if (!process.env.ZENMUX_API_KEY) {
    throw new Error('请先复制 .env.example 为 .env，并填写 ZENMUX_API_KEY');
  }
  if (stableSystem.length < 8000) {
    throw new Error([
      `${stableContextFile} 仍是短占位内容。`,
      '请换成你自己的长且稳定的 system prompt/资料后再运行联网 demo。',
      '最低缓存 token 数因模型而异，字符数检查只能防止最明显的误测。',
    ].join('\n'));
  }

  return {
    model: process.env.ZENMUX_MODEL || 'anthropic/claude-sonnet-4.6',
    ttl: process.env.CACHE_TTL || '1h',
    stableSystem,
  };
}

export function printUsage(label, usage) {
  const summary = summarizeUsage(usage);
  console.log(label, {
    ...summary,
    cacheHitRate: `${(summary.cacheHitRate * 100).toFixed(1)}%`,
  });
}
