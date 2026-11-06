import { buildRequestBody } from '../src/prompt-cache.mjs';
import { responseText, sendZenMuxMessage } from '../src/zenmux-client.mjs';
import { demoConfig, printUsage } from './_shared.mjs';

const config = demoConfig();

async function ask(question) {
  const body = buildRequestBody({
    ...config,
    storedMessages: [{ role: 'user', content: question }],
  });
  return sendZenMuxMessage(body);
}

console.log('第一次请求：预期创建 system 缓存');
const first = await ask('请用一句话总结这份固定资料。');
printUsage('first', first.usage);
console.log(responseText(first));

console.log('\n第二次请求：system 完全相同，预期读取缓存');
const second = await ask('请列出这份固定资料的三个关键词。');
printUsage('second', second.usage);
console.log(responseText(second));
