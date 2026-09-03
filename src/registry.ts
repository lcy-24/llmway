// ============================================================
// 内置模型注册表 — 覆盖国内外主流大模型
// 所有端点均为 OpenAI 兼容协议或 Anthropic 协议
// ============================================================

import type { ModelMeta, ModelGroup } from './types';

export const modelRegistry: ModelMeta[] = [
  // === 国际模型 ===
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    group: 'international',
    endpoint: 'https://api.openai.com/v1',
    modelName: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    description: 'OpenAI 最强多模态模型',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 128000,
    pricing: { input: 2.5, output: 10, unit: 'per-1M-tokens' },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    group: 'international',
    endpoint: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    description: '轻量高效，性价比之选',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 128000,
    pricing: { input: 0.15, output: 0.6, unit: 'per-1M-tokens' },
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    group: 'international',
    endpoint: 'https://api.anthropic.com/v1',
    modelName: 'claude-3-5-sonnet-20241022',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    description: 'Anthropic 最强模型，编程能力卓越',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 200000,
    pricing: { input: 3, output: 15, unit: 'per-1M-tokens' },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    group: 'international',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    modelName: 'gemini-1.5-pro',
    apiKeyEnv: 'GEMINI_API_KEY',
    description: 'Google 多模态模型，超长上下文',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 1000000,
    pricing: { input: 3.5, output: 10.5, unit: 'per-1M-tokens' },
  },
  // === 国内模型 ===
  {
    id: 'qwen-max',
    name: '通义千问 Max',
    provider: '阿里云',
    group: 'domestic',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelName: 'qwen-max',
    apiKeyEnv: 'QWEN_API_KEY',
    description: '阿里云最强中文大模型',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 32000,
    pricing: { input: 2, output: 6, unit: 'per-1M-tokens' },
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: '深度求索',
    group: 'domestic',
    endpoint: 'https://api.deepseek.com/v1',
    modelName: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    description: '高性价比国产模型，编程能力强',
    capabilities: { chat: true, vision: false, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 64000,
    pricing: { input: 0.14, output: 0.28, unit: 'per-1M-tokens' },
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: '智谱AI',
    group: 'domestic',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    modelName: 'glm-4',
    apiKeyEnv: 'GLM_API_KEY',
    description: '智谱AI 旗舰模型',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 128000,
    pricing: { input: 1, output: 1, unit: 'per-1M-tokens' },
  },
  {
    id: 'moonshot-v1',
    name: 'Moonshot v1',
    provider: '月之暗面',
    group: 'domestic',
    endpoint: 'https://api.moonshot.cn/v1',
    modelName: 'moonshot-v1-8k',
    apiKeyEnv: 'KIMI_API_KEY',
    description: 'Kimi 长文本处理专家',
    capabilities: { chat: true, vision: false, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 8000,
    pricing: { input: 1.2, output: 1.2, unit: 'per-1M-tokens' },
  },
  {
    id: 'ernie-4.0',
    name: '文心一言 4.0',
    provider: '百度',
    group: 'domestic',
    endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    modelName: 'ernie-4.0-8k',
    apiKeyEnv: 'ERNIE_API_KEY',
    description: '百度文心大模型',
    capabilities: { chat: true, vision: true, functionCall: true, streaming: true, fileUpload: false, reasoning: false },
    maxTokens: 8000,
    pricing: { input: 1.2, output: 1.2, unit: 'per-1K-tokens' },
  },
  {
    id: 'doubao-pro',
    name: '豆包 Pro',
    provider: '字节跳动',
    group: 'domestic',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    modelName: 'doubao-pro-32k',
    apiKeyEnv: 'DOUBAO_API_KEY',
    description: '字节跳动豆包大模型',
    capabilities: { chat: true, vision: false, functionCall: true, streaming: true, fileUpload: true, reasoning: false },
    maxTokens: 32000,
    pricing: { input: 0.08, output: 0.2, unit: 'per-1M-tokens' },
  },
  {
    id: 'spark-4.0',
    name: '讯飞星火 4.0',
    provider: '科大讯飞',
    group: 'domestic',
    endpoint: 'https://spark-api-open.xf-yun.com/v1',
    modelName: 'spark-4.0',
    apiKeyEnv: 'SPARK_API_KEY',
    description: '科大讯飞星火认知大模型',
    capabilities: { chat: true, vision: false, functionCall: false, streaming: true, fileUpload: false, reasoning: false },
    maxTokens: 8000,
    pricing: { input: 0.1, output: 0.1, unit: 'per-1K-tokens' },
  },
];

export function getModelMeta(id: string): ModelMeta | undefined {
  return modelRegistry.find((m) => m.id === id);
}

export function getModelsByGroup(group: ModelGroup): ModelMeta[] {
  return modelRegistry.filter((m) => m.group === group);
}

export function getAllModelIds(): string[] {
  return modelRegistry.map((m) => m.id);
}