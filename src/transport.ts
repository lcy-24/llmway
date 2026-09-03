// ============================================================
// 传输配置解析 — 注入式 Key 解析器（与运行环境解耦）
// ============================================================

import type { ModelMeta } from './types';

/** API Key 解析器：按环境变量名返回对应的 Key */
export interface KeyResolver {
  resolve(envName: string): string | undefined;
}

export interface TransportConfig {
  endpoint: string;
  apiKey: string;
}

/** 从 Node 的 process.env 读取（浏览器环境自动跳过） */
function envKeyResolver(envName: string): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string> } };
  return g.process?.env?.[envName];
}

/** 构造 Key 解析器：优先用显式传入的 apiKeys，其次回退到 process.env */
export function createKeyResolver(apiKeys: Record<string, string> = {}): KeyResolver {
  return {
    resolve(envName: string): string | undefined {
      if (apiKeys[envName]) return apiKeys[envName];
      return envKeyResolver(envName);
    },
  };
}

/** 解析模型的 BYOK 传输配置 */
export function resolveTransport(meta: ModelMeta, keyResolver: KeyResolver): TransportConfig {
  return {
    endpoint: meta.endpoint,
    apiKey: keyResolver.resolve(meta.apiKeyEnv) ?? '',
  };
}