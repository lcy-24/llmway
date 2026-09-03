// ============================================================
// Anthropic (Claude) 适配器（纯 fetch 实现）
// ============================================================

import type { AIModelAdapter, ChatChunk, ChatOptions, ChatResponse, Message, ModelMeta } from '../types';
import { withRetry } from '../retry';
import type { TransportConfig } from '../transport';

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

function ensureKey(meta: ModelMeta, apiKey: string): void {
  if (!apiKey) {
    throw new Error(`模型 "${meta.name}" 未配置 API Key，请设置环境变量 ${meta.apiKeyEnv}`);
  }
}

export function createAnthropicAdapter(meta: ModelMeta, transport: TransportConfig): AIModelAdapter {
  const baseURL = transport.endpoint.replace(/\/v1\/?$/, '');

  async function request(body: unknown, signal?: AbortSignal): Promise<Response> {
    const resp = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': transport.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Anthropic 请求失败 (${resp.status}): ${text.slice(0, 500)}`);
    }
    return resp;
  }

  function extractSystemPrompt(messages: Message[], options?: ChatOptions): string {
    const systemMsg = messages.find((m) => m.role === 'system');
    return systemMsg?.content || options?.systemPrompt || '';
  }

  function convertMessages(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  function buildBody(messages: Message[], options?: ChatOptions, stream = false) {
    return {
      model: meta.modelName,
      max_tokens: options?.maxTokens ?? 4096,
      system: extractSystemPrompt(messages, options),
      messages: convertMessages(messages),
      stream,
    };
  }

  return {
    modelId: meta.id,
    capabilities: meta.capabilities,

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      ensureKey(meta, transport.apiKey);
      return withRetry(`anthropic:${meta.id}`, async () => {
        const resp = await request(buildBody(messages, options, false), options?.signal);
        const data = (await resp.json()) as {
          id?: string;
          model?: string;
          content?: ClaudeContentBlock[];
          usage?: ClaudeUsage;
        };
        const textBlock = data.content?.find((b) => b.type === 'text');
        return {
          id: data.id ?? '',
          content: textBlock?.text ?? '',
          model: data.model ?? meta.modelName,
          usage: data.usage
            ? {
                promptTokens: data.usage.input_tokens ?? 0,
                completionTokens: data.usage.output_tokens ?? 0,
                totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
              }
            : undefined,
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
            if (!payload) continue;

            let json: { type?: string; delta?: { type?: string; text?: string } };
            try {
              json = JSON.parse(payload);
            } catch {
              continue;
            }
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              const text = json.delta.text ?? '';
              if (text) yield { content: text, done: false };
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }

      yield { content: '', done: true };
    },
  };
}