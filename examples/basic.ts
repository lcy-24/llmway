import { createLLM } from '../src/index';

async function main() {
  // 从环境变量读取 Key（Node 环境），或在浏览器里显式传入 apiKeys
  const llm = createLLM({
    apiKeys: {
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? '',
    },
  });

  const model = llm.model('deepseek-v3');

  // 非流式对话
  const resp = await model.chat([{ role: 'user', content: '用一句话介绍你自己' }]);
  console.log('回复:', resp.content);
  console.log('用量:', resp.usage);

  // 流式对话
  const stream = model.chatStream([{ role: 'user', content: '写一段斐波那契函数' }]);
  for await (const chunk of stream) {
    process.stdout.write(chunk.content);
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});