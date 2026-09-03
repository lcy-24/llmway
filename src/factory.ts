// ============================================================
// 客户端与工厂 — 统一入口 createLLM()
// ============================================================

import type { AIModelAdapter, ModelMeta } from './types';
import { modelRegistry } from './registry';
import { createKeyResolver, resolveTransport, type KeyResolver } from './transport';
import type { TransportConfig } from './transport';
import { createOpenAIAdapter } from './adapters/openai';
import { createAnthropicAdapter } from './adapters/anthropic';

export interface LLMOptions {
  /** 显式传入 API Key（key 为环境变量名，如 'DEEPSEEK_API_KEY'） */
  apiKeys?: Record<string, string>;
  /** 自定义 Key 解析器 */
  keyResolver?: KeyResolver;
}

function createAdapter(meta: ModelMeta, transport: TransportConfig): AIModelAdapter {
  return meta.provider === 'Anthropic'
    ? createAnthropicAdapter(meta, transport)
    : createOpenAIAdapter(meta, transport);
}

export class LLMClient {
  private adapters = new Map<string, AIModelAdapter>();
  private metaMap = new Map<string, ModelMeta>();
  private keyResolver: KeyResolver;

  constructor(options: LLMOptions = {}) {
    this.keyResolver = options.keyResolver ?? createKeyResolver(options.apiKeys);
  }

  /** 注册一个模型（含内置与自定义） */
  register(meta: ModelMeta): this {
    const transport = resolveTransport(meta, this.keyResolver);
    this.metaMap.set(meta.id, meta);
    this.adapters.set(meta.id, createAdapter(meta, transport));
    return this;
  }

  /** 获取模型适配器 */
  model(id: string): AIModelAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`模型 "${id}" 未注册，可通过 client.register(meta) 添加`);
    }
    return adapter;
  }

  /** 获取模型元数据 */
  meta(id: string): ModelMeta | undefined {
    return this.metaMap.get(id);
  }

  /** 列出所有已注册模型 id */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/** 创建 LLM 客户端，默认注册全部内置模型 */
export function createLLM(options?: LLMOptions): LLMClient {
  const client = new LLMClient(options);
  for (const meta of modelRegistry) {
    client.register(meta);
  }
  return client;
}