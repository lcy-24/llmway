// ============================================================
// 重试中间件 — 指数退避 + 熔断器（零依赖）
// ============================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** 熔断阈值：连续失败 N 次后熔断 */
  circuitBreakerThreshold: number;
  /** 熔断恢复时间（ms） */
  circuitBreakerRecoveryMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  circuitBreakerThreshold: 5,
  circuitBreakerRecoveryMs: 30000,
};

export interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuits = new Map<string, CircuitState>();

function getCircuit(key: string): CircuitState {
  if (!circuits.has(key)) {
    circuits.set(key, { failures: 0, lastFailureTime: 0, isOpen: false });
  }
  return circuits.get(key)!;
}

function checkCircuit(key: string, config: RetryConfig): void {
  const circuit = getCircuit(key);
  if (circuit.isOpen) {
    const elapsed = Date.now() - circuit.lastFailureTime;
    if (elapsed > config.circuitBreakerRecoveryMs) {
      circuit.isOpen = false;
      circuit.failures = 0;
    } else {
      throw new Error(`熔断器已打开，请等待 ${Math.ceil((config.circuitBreakerRecoveryMs - elapsed) / 1000)} 秒后重试`);
    }
  }
}

function recordSuccess(key: string): void {
  const circuit = getCircuit(key);
  circuit.failures = 0;
  circuit.isOpen = false;
}

function recordFailure(key: string, config: RetryConfig): void {
  const circuit = getCircuit(key);
  circuit.failures++;
  circuit.lastFailureTime = Date.now();
  if (circuit.failures >= config.circuitBreakerThreshold) {
    circuit.isOpen = true;
  }
}

/** 带熔断器的重试执行 */
export async function withRetry<T>(
  key: string,
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };

  checkCircuit(key, cfg);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await fn();
      recordSuccess(key);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      recordFailure(key, cfg);

      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          cfg.maxDelayMs,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('重试已耗尽');
}

export function getCircuitState(key: string): CircuitState | undefined {
  return circuits.get(key);
}