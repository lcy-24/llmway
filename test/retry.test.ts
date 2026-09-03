import { describe, it, expect, vi } from 'vitest';
import { withRetry, getCircuitState } from '../src/retry';

describe('withRetry', () => {
  it('成功时直接返回，不重试', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry('retry-ok', fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('失败后重试成功', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');
    const result = await withRetry('retry-once', fn, { baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('超过最大重试次数后抛出', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'));
    await expect(
      withRetry('retry-exhaust', fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 }),
    ).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('连续失败触发熔断', async () => {
    const key = 'breaker-test';
    const cfg = { maxRetries: 0, circuitBreakerThreshold: 2, circuitBreakerRecoveryMs: 60000 };
    const failFn = vi.fn().mockRejectedValue(new Error('x'));
    await expect(withRetry(key, failFn, cfg)).rejects.toThrow('x');
    await expect(withRetry(key, failFn, cfg)).rejects.toThrow('x');

    expect(getCircuitState(key)?.isOpen).toBe(true);

    const okFn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(key, okFn, cfg)).rejects.toThrow('熔断器');
    expect(okFn).not.toHaveBeenCalled();
  });
});