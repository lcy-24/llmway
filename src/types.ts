// ============================================================
// 核心类型定义 — 统一的大模型接入接口
// ============================================================

export type ModelGroup = 'international' | 'domestic';

export interface ModelCapabilities {
  chat: boolean;
  vision: boolean;
  functionCall: boolean;
  streaming: boolean;
  fileUpload: boolean;
  reasoning: boolean;
}

export interface ModelPricing {
  input: number;
  output: number;
  /** 计费单位，如 'per-1M-tokens' */
  unit: string;
}

export interface ModelMeta {
  /** 唯一标识（编程时使用），如 'deepseek-v3' */
  id: string;
  /** 展示名称 */
  name: string;
  /** 提供商 */
  provider: string;
  group: ModelGroup;
  /** API Base URL */
  endpoint: string;
  /** 实际请求使用的模型名（可能与 id 不同） */
  modelName: string;
  /** BYOK 时读取的环境变量名 */
  apiKeyEnv: string;
  description: string;
  capabilities: ModelCapabilities;
  maxTokens: number;
  pricing: ModelPricing;
}

/** 模型返回的工具调用（function calling） */
export interface ToolCall {
  id: string;
  /** 要调用的函数名 */
  name: string;
  /** 参数（JSON 字符串） */
  arguments: string;
}

/** 可供模型调用的工具（OpenAI 风格 JSON Schema） */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  /** 多模态图片（url 或 base64 data url） */
  images?: string[];
  /** assistant 消息携带的工具调用 */
  toolCalls?: ToolCall[];
  /** tool 角色消息回传时对应的 tool_call id */
  toolCallId?: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** 中止信号，用于取消请求 */
  signal?: AbortSignal;
  /** 可供模型调用的工具列表 */
  tools?: Tool[];
  /** 工具选择策略：'auto' | 'none' | 'required' 或指定函数 */
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: Usage;
  /** 模型请求的工具调用（function calling 时返回） */
  toolCalls?: ToolCall[];
}

export interface ChatChunk {
  content: string;
  done: boolean;
}

export interface AIModelAdapter {
  modelId: string;
  capabilities: ModelCapabilities;
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}