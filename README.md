<div align="center">

# llmway

**零依赖 · 浏览器 / Node 双端 · 统一接入国内外主流大模型**

一个 API，调用所有大模型。告别为每个厂商单独装 SDK。

[![npm version](https://img.shields.io/npm/v/llmway)](https://www.npmjs.com/package/llmway)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6.svg)](https://www.typescriptlang.org/)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![runs on Node & Browser](https://img.shields.io/badge/runs-Node%20%26%20Browser-888)

</div>

---

## 为什么你需要 llmway

接入大模型通常会遇到三个痛点：

1. **每个厂商都有自己的 SDK** —— OpenAI、Anthropic、Gemini…… 切模型就要换一套代码。
2. **国产模型支持差** —— 主流 SDK 对 DeepSeek、通义千问、GLM、Kimi、豆包等支持零散，得自己拼。
3. **依赖过重** —— Vercel AI SDK、LangChain 动辄几十个依赖，只想调个 API 却引入了半个世界。

`llmway` 用 **一个统一接口** + **零运行时依赖（纯 `fetch` 实现）** 解决以上问题：

```ts
import { createLLM } from 'llmway';

const llm = createLLM({
  apiKeys: { DEEPSEEK_API_KEY: 'sk-...' },
});

const model = llm.model('deepseek-v3');
const resp = await model.chat([{ role: 'user', content: '你好' }]);
console.log(resp.content); // 你好！有什么可以帮你的吗？
```

切到 Claude 或通义千问，只需要把 `'deepseek-v3'` 换成 `'claude-3.5-sonnet'`，**其余代码一行不动**。

## 特性

- ⚡ **零依赖** —— 纯 `fetch` 实现，不捆绑任何厂商 SDK
- 🌐 **浏览器 / Node 双端** —— 同一个 API，两端通用（Node ≥ 18）
- 🇨🇳 **国产模型一等公民** —— 内置 DeepSeek / 通义千问 / GLM / Kimi / 文心 / 豆包 / 星火
- 📡 **流式输出** —— 原生 `async` 迭代器，接 UI 更新无障碍
- 🛡️ **内置重试 + 熔断** —— 指数退避、熔断器，应对厂商抖动
- 🔌 **任意扩展** —— 一行注册任意 OpenAI 兼容端点模型

## 快速开始

```bash
npm install llmway
```

```ts
import { createLLM } from 'llmway';

// 方式一：通过环境变量（Node，变量名见下方「模型列表」）
const llm = createLLM();

// 方式二：显式传入（浏览器友好）
const llm2 = createLLM({ apiKeys: { OPENAI_API_KEY: 'sk-...' } });

const model = llm.model('deepseek-v3');

// 非流式
const r = await model.chat([{ role: 'user', content: '写一首诗' }]);
console.log(r.content);

// 流式
for await (const chunk of model.chatStream([{ role: 'user', content: '介绍一下你自己' }])) {
  process.stdout.write(chunk.content);
}
```

## Quick Demo

```ts
import { createLLM } from 'llmway';

const llm = createLLM({ apiKeys: { DEEPSEEK_API_KEY: 'sk-...' } });
const model = llm.model('deepseek-v3');

// 非流式：一次拿完整回复
const r = await model.chat([{ role: 'user', content: '用一句话介绍你自己' }]);
console.log(r.content);
console.log(r.usage); // { promptTokens, completionTokens, totalTokens }

// 流式：逐字输出，适合接 UI
for await (const c of model.chatStream([{ role: 'user', content: '解释斐波那契数列' }])) {
  process.stdout.write(c.content);
}
```

真实运行输出（以通义千问为例）：

```text
我是通义千问，一个能陪你思考、写作、编程和解决问题的 AI 助手。
{ promptTokens: 52, completionTokens: 103, totalTokens: 155 }
斐波那契数列是一个每个数都等于前两个数之和的数列……
```

## 内置模型

| id | 模型 | 提供商 | 环境变量 |
|----|------|--------|----------|
| `gpt-4o` | GPT-4o | OpenAI | `OPENAI_API_KEY` |
| `gpt-4o-mini` | GPT-4o Mini | OpenAI | `OPENAI_API_KEY` |
| `claude-3.5-sonnet` | Claude 3.5 Sonnet | Anthropic | `ANTHROPIC_API_KEY` |
| `gemini-1.5-pro` | Gemini 1.5 Pro | Google | `GEMINI_API_KEY` |
| `qwen-max` | 通义千问 Max | 阿里云 | `QWEN_API_KEY` |
| `deepseek-v3` | DeepSeek V3 | 深度求索 | `DEEPSEEK_API_KEY` |
| `glm-4` | GLM-4 | 智谱AI | `GLM_API_KEY` |
| `moonshot-v1` | Moonshot v1 (Kimi) | 月之暗面 | `KIMI_API_KEY` |
| `ernie-4.0` | 文心一言 4.0 | 百度 | `ERNIE_API_KEY` |
| `doubao-pro` | 豆包 Pro | 字节跳动 | `DOUBAO_API_KEY` |
| `spark-4.0` | 讯飞星火 4.0 | 科大讯飞 | `SPARK_API_KEY` |

## 扩展自定义模型

任何兼容 OpenAI 协议的端点都能一行接入：

```ts
llm.register({
  id: 'my-model',
  name: 'My Model',
  provider: 'Self-hosted',
  group: 'international',
  endpoint: 'https://my-llm.example.com/v1',
  modelName: 'my-model',
  apiKeyEnv: 'MY_KEY',
  description: '自托管模型',
  capabilities: { chat: true, vision: false, functionCall: false, streaming: true, fileUpload: false, reasoning: false },
  maxTokens: 8000,
  pricing: { input: 0, output: 0, unit: 'per-1M-tokens' },
});
```

## 对比

| | llmway | Vercel AI SDK | LangChain |
|--|----------|--------------|-----------|
| 运行时依赖 | **0** | 数十个 | 数十个 |
| 国产模型 | **内置** | 需自行适配 | 部分 provider |
| 浏览器 / Node | **双端** | 双端 | 偏 Node |
| 学习曲线 | 一个接口 | 中等 | 陡峭 |
| 定位 | 只做「接入」 | 全套 AI 组件 | 全套框架 |

## API

`createLLM(options?)` → `LLMClient`
- `.model(id)` 获取模型
- `.meta(id)` 获取元数据
- `.list()` 列出所有模型
- `.register(meta)` 注册模型

`model.chat(messages, options?)` → `Promise<ChatResponse>`
`model.chatStream(messages, options?)` → `AsyncIterable<ChatChunk>`

## Roadmap

- [ ] 扩充模型至 19+（QVQ、DeepSeek R1、百川、MiniMax、Yi 等）
- [ ] Function calling / 工具调用统一封装
- [ ] 用量统计与成本聚合
- [ ] 可选的服务端网关（代理 + 额度 + 多租户）
- [ ] React / Vue hooks 绑定

## License

[MIT](LICENSE)