import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOpenAIAdapter } from '../src/adapters/openai';
import type { ModelMeta } from '../src/types';

const meta: ModelMeta = {
  id: 'deepseek-v3',
  name: 'DeepSeek V3',
  provider: '深度求索',
  group: 'domestic',
  endpoint: 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat',
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  description: '',
  capabilities: {
    chat: true,
    vision: false,
    functionCall: true,
    streaming: true,
    fileUpload: true,
    reasoning: false,
  },
  maxTokens: 64000,
  pricing: { input: 0.14, output: 0.28, unit: 'per-1M-tokens' },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(raw: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(raw));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('openai adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chat 解析 content 与 usage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 'chatcmpl-1',
          model: 'deepseek-chat',
          choices: [{ message: { content: '你好' } }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      ),
    );

    const adapter = createOpenAIAdapter(meta, {
      endpoint: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test',
    });
    const resp = await adapter.chat([{ role: 'user', content: 'hi' }]);
    expect(resp.content).toBe('你好');
    expect(resp.usage?.totalTokens).toBe(7);
  });

  it('未配置 Key 时抛出友好错误', async () => {
    const adapter = createOpenAIAdapter(meta, {
      endpoint: 'https://api.deepseek.com/v1',
      apiKey: '',
    });
    await expect(adapter.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      '未配置 API Key',
    );
  });

  it('chatStream 解析 SSE 并正确标记 done', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse(
          'data: {"choices":[{"delta":{"content":"你"}}]}\n\n' +
            'data: {"choices":[{"delta":{"content":"好"}}]}\n\n' +
            'data: [DONE]\n\n',
        ),
      ),
    );

    const adapter = createOpenAIAdapter(meta, {
      endpoint: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test',
    });
    const chunks: { content: string; done: boolean }[] = [];
    for await (const c of adapter.chatStream([{ role: 'user', content: 'hi' }])) {
      chunks.push(c);
    }

    expect(chunks.map((c) => c.content).join('')).toBe('你好');
    expect(chunks[chunks.length - 1]?.done).toBe(true);
    expect(chunks.slice(0, -1).every((c) => !c.done)).toBe(true);
  });

  it('chatStream 支持跨 chunk 的 SSE 拼接', async () => {
    // 模拟一条 data 被拆成两段传输
    const part1 = 'data: {"choices":[{"delta":{"content":"你';
    const part2 = '好"}}]}\n\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(part1));
        controller.enqueue(encoder.encode(part2));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
      ),
    );

    const adapter = createOpenAIAdapter(meta, {
      endpoint: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test',
    });
    const chunks: string[] = [];
    for await (const c of adapter.chatStream([{ role: 'user', content: 'hi' }])) {
      if (c.content) chunks.push(c.content);
    }
    expect(chunks.join('')).toBe('你好');
  });
});