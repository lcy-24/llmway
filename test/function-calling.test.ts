import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOpenAIAdapter } from '../src/adapters/openai';
import type { ModelMeta, Tool } from '../src/types';

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

const weatherTool: Tool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: '查询指定城市的天气',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string', description: '城市名' } },
      required: ['city'],
    },
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeAdapter() {
  return createOpenAIAdapter(meta, {
    endpoint: 'https://api.deepseek.com/v1',
    apiKey: 'sk-test',
  });
}

describe('function calling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chat 传 tools 时在请求体中携带 tools 与 tool_choice', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: '' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    await makeAdapter().chat([{ role: 'user', content: '北京天气' }], {
      tools: [weatherTool],
      toolChoice: 'auto',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(body.tools[0].function.name).toBe('get_weather');
    expect(body.tool_choice).toBe('auto');
  });

  it('chat 解析响应中的 tool_calls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"北京"}' } },
                ],
              },
            },
          ],
        }),
      ),
    );

    const resp = await makeAdapter().chat([{ role: 'user', content: '北京天气' }], { tools: [weatherTool] });
    expect(resp.toolCalls).toHaveLength(1);
    expect(resp.toolCalls![0].name).toBe('get_weather');
    expect(resp.toolCalls![0].arguments).toBe('{"city":"北京"}');
  });

  it('回传工具结果时正确序列化 assistant.tool_calls 与 tool 消息', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: '北京今天晴' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    await makeAdapter().chat([
      { role: 'user', content: '北京天气' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'call_1', name: 'get_weather', arguments: '{"city":"北京"}' }] },
      { role: 'tool', toolCallId: 'call_1', content: '{"天气":"晴"}' },
    ]);

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    const msgs = body.messages;
    expect(msgs[1].tool_calls).toEqual([
      { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"北京"}' } },
    ]);
    expect(msgs[2]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"天气":"晴"}' });
  });
});
