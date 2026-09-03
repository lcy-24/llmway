// ============================================================
// OpenAI 兼容适配器（纯 fetch 实现，覆盖 OpenAI 及国产模型）
// ============================================================

import type { AIModelAdapter, ChatChunk, ChatOptions, ChatResponse, Message, ModelMeta } from '../types';
import { withRetry } from '../retry';
import type { TransportConfig } from '../transport';

interface UnkeyedChoice {
  delta?: { content?: string };
  message?: { content?: string; tool_calls?: UnkeyedToolCall[] };
}
interface UnkeyedToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}
interface UnkeyedUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

function ensureKey(meta: ModelMeta, apiKey: string): void {
  if (!apiKey) {
    throw new Error(`模型 "${meta.name}" 未配置 API Key，请设置环境变量 ${meta.apiKeyEnv}`);
  }
}

export function createOpenAIAdapter(meta: ModelMeta, transport: TransportConfig): AIModelAdapter {
  const baseURL = transport.endpoint.replace(/\/$/, '');

  async function request(body: unknown, signal?: AbortSignal): Promise<Response> {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${transport.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenAI 兼容请求失败 (${resp.status}): ${text.slice(0, 500)}`);
    }
    return resp;
  }

  function buildMessages(
    messages: Message[],
    options?: ChatOptions,
  ): Array<Record<string, unknown>> {
    const result: Array<Record<string, unknown>> = [];

    if (options?.systemPrompt) {
      result.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        result.push({
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });
      } else if (msg.role === 'tool') {
        result.push({ role: 'tool', tool_call_id: msg.toolCallId ?? '', content: msg.content });
      } else if (msg.images?.length && meta.capabilities.vision) {
        const parts: Array<Record<string, unknown>> = [{ type: 'text', text: msg.content }];
        for (const img of msg.images) {
          parts.push({ type: 'image_url', image_url: { url: img } });
        }
        result.push({ role: msg.role, content: parts });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }

  function buildBody(messages: Message[], options?: ChatOptions, stream = false): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: meta.modelName,
      messages: buildMessages(messages, options),
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 1,
      max_tokens: options?.maxTokens ?? 4096,
      stream,
    };
    if (options?.tools?.length) {
      body.tools = options.tools;
      if (options.toolChoice !== undefined) body.tool_choice = options.toolChoice;
    }
    return body;
  }

  return {
    modelId: meta.id,
    capabilities: meta.capabilities,

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      ensureKey(meta, transport.apiKey);
      return withRetry(`openai-compatible:${meta.id}`, async () => {
        const resp = await request(buildBody(messages, options, false), options?.signal);
        const data = (await resp.json()) as {
          id?: string;
          model?: string;
          choices?: UnkeyedChoice[];
          usage?: UnkeyedUsage;
        };
        const choice = data.choices?.[0];
        const toolCalls = choice?.message?.tool_calls?.map((tc) => ({
          id: tc.id ?? '',
          name: tc.function?.name ?? '',
          arguments: tc.function?.arguments ?? '{}',
        }));
        return {
          id: data.id ?? '',
          content: choice?.message?.content ?? '',
          model: data.model ?? meta.modelName,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens ?? 0,
                completionTokens: data.usage.completion_tokens ?? 0,
                totalTokens: data.usage.total_tokens ?? 0,
              }
            : undefined,
          toolCalls: toolCalls?.length ? toolCalls : undefined,
        };
      });
    },

    async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk> {
      ensureKey(meta, transport.apiKey);
      const resp = await request(buildBody(messages, options, true), options?.signal);
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('响应不支持流式读取');

      const decoder = new TextDecoder();
      let buffer = '';

      // 释放锁 + 兜底收尾
      let finished = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;

            let json: { choices?: UnkeyedChoice[] };
            try {
              json = JSON.parse(payload);
            } catch {
              continue;
            }
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) yield { content: delta, done: false };
          }
        }
      } finally {
        if (!finished) {
          finished = true;
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
        }
      }

      yield { content: '', done: true };
    },
  };
}