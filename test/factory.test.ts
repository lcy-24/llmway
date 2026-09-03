import { describe, it, expect } from 'vitest';
import { createLLM } from '../src/index';

describe('createLLM', () => {
  it('默认注册内置模型', () => {
    const llm = createLLM();
    const ids = llm.list();
    expect(ids).toContain('deepseek-v3');
    expect(ids).toContain('gpt-4o');
    expect(ids).toContain('claude-3.5-sonnet');
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  it('获取模型适配器', () => {
    const llm = createLLM();
    const model = llm.model('deepseek-v3');
    expect(model.modelId).toBe('deepseek-v3');
  });

  it('未注册模型抛错', () => {
    const llm = createLLM();
    expect(() => llm.model('not-exist')).toThrow('未注册');
  });

  it('支持注册自定义模型', () => {
    const llm = createLLM();
    llm.register({
      id: 'custom-model',
      name: 'Custom',
      provider: 'OpenAI',
      group: 'international',
      endpoint: 'https://example.com/v1',
      modelName: 'custom',
      apiKeyEnv: 'CUSTOM_KEY',
      description: '自定义模型',
      capabilities: {
        chat: true,
        vision: false,
        functionCall: false,
        streaming: true,
        fileUpload: false,
        reasoning: false,
      },
      maxTokens: 1000,
      pricing: { input: 0, output: 0, unit: 'per-1M-tokens' },
    });
    expect(llm.list()).toContain('custom-model');
  });
});