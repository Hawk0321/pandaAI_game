import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_BAR_MS, prefersReducedMotion, scheduleReveal } from './reveal';

describe('K 线逐根揭晓的节奏', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('每根约 150ms，5 根依次出现，最后一次停在目标根数', () => {
    const ticks: number[] = [];
    scheduleReveal(60, 65, n => ticks.push(n));
    expect(ticks).toEqual([]);
    vi.advanceTimersByTime(REVEAL_BAR_MS);
    expect(ticks).toEqual([61]);
    vi.advanceTimersByTime(REVEAL_BAR_MS * 4);
    expect(ticks).toEqual([61, 62, 63, 64, 65]);
    vi.advanceTimersByTime(REVEAL_BAR_MS * 5);
    expect(ticks).toHaveLength(5);
  });
  it('减少动态时立即显示全部，没有新根时也不等待', () => {
    const ticks: number[] = [];
    scheduleReveal(60, 65, n => ticks.push(n), { reduced: true });
    scheduleReveal(65, 65, n => ticks.push(n));
    expect(ticks).toEqual([65, 65]);
    expect(prefersReducedMotion()).toBe(false);
  });
  it('取消后不再回调，下一步可以接着上一步的根数继续', () => {
    const ticks: number[] = [];
    const cancel = scheduleReveal(60, 65, n => ticks.push(n), { perBarMs: 100 });
    vi.advanceTimersByTime(250);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(ticks).toEqual([61, 62]);
    scheduleReveal(65, 70, n => ticks.push(n), { perBarMs: 100 });
    vi.advanceTimersByTime(500);
    expect(ticks.at(-1)).toBe(70);
  });
});
