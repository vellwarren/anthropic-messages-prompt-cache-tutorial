import { buildRequestBody } from '../src/prompt-cache.mjs';
import { responseText, sendZenMuxMessage } from '../src/zenmux-client.mjs';
import { demoConfig, printUsage } from './_shared.mjs';

const config = demoConfig();
const storedMessages = [];

async function turn(question) {
  // 只把真正的聊天消息放进 storedMessages。
  storedMessages.push({ role: 'user', content: question });
  const response = await sendZenMuxMessage(buildRequestBody({
    ...config,
    storedMessages,
  }));
  const answer = responseText(response);
  storedMessages.push({ role: 'assistant', content: answer || '(empty reply)' });
  printUsage(`turn ${storedMessages.length / 2}`, response.usage);
  console.log(answer);
}

await turn('先记住：我的测试代号是蓝色雨伞。只回复“记住了”。');
await turn('我的测试代号是什么？');
await turn('再用一个 emoji 表示它。');
