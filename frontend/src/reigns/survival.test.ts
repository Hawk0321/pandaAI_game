import { describe, expect, it } from 'vitest';
import {
  BEST_STORAGE_KEY,
  LEGEND_TURN,
  SURVIVAL_TIERS,
  formatJitter,
  overtimeTurns,
  readBest,
  recordBest,
  survivalBlurb,
  survivalProgress,
  survivalTier,
} from './survival';
import type { StorageLike } from './survival';
import { ROLE_IDS } from './roles';
import { OVERTIME_START } from './types';

/** 内存版 localStorage。 */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); },
};

describe('survivalTier：段位边界', () => {
  it.each([
    [0, 'tier-1'], [1, 'tier-1'], [9, 'tier-1'],
    [10, 'tier-2'], [19, 'tier-2'],
    [20, 'tier-3'], [29, 'tier-3'],
    [30, 'tier-4'], [39, 'tier-4'],
    [40, 'tier-5'], [54, 'tier-5'],
    [55, 'tier-6'], [120, 'tier-6'],
  ])('%i 关 → %s', (turn, id) => {
    expect(survivalTier(turn).id).toBe(id);
  });

  it('加时段从 OVERTIME_START 开始，传说段从 55 开始', () => {
    expect(OVERTIME_START).toBe(40);
    expect(LEGEND_TURN).toBe(55);
    expect(survivalTier(OVERTIME_START - 1).name).toBe('穿越周期');
    expect(survivalTier(OVERTIME_START).name).toBe('加时幸存者');
    expect(survivalTier(LEGEND_TURN - 1).name).toBe('加时幸存者');
    expect(survivalTier(LEGEND_TURN).name).toBe('市场传说');
  });

  it('段位名称与美术说明一致', () => {
    expect(SURVIVAL_TIERS.map((t) => t.name)).toEqual(['试水', '站稳脚跟', '老练', '穿越周期', '加时幸存者', '市场传说']);
  });

  it('区间首尾相接、没有空档', () => {
    for (let i = 1; i < SURVIVAL_TIERS.length; i += 1) {
      expect(SURVIVAL_TIERS[i].min).toBe((SURVIVAL_TIERS[i - 1].max ?? -1) + 1);
    }
  });

  it('异常输入不崩：负数、小数、NaN', () => {
    expect(survivalTier(-3).id).toBe('tier-1');
    expect(survivalTier(39.9).id).toBe('tier-4');
    expect(survivalTier(Number.NaN).id).toBe('tier-1');
  });

  it('每个段位、每个角色都有 ≤ 20 字的文案', () => {
    for (const tier of SURVIVAL_TIERS) for (const role of ROLE_IDS) {
      const text = survivalBlurb(tier, role);
      expect(text.length).toBeGreaterThan(0);
      expect([...text].length).toBeLessThanOrEqual(20);
    }
  });
});

describe('加时 K 与进度条', () => {
  it('overtimeTurns：40 及以下为 0，之后为超出部分', () => {
    expect(overtimeTurns(12)).toBe(0);
    expect(overtimeTurns(40)).toBe(0);
    expect(overtimeTurns(41)).toBe(1);
    expect(overtimeTurns(57)).toBe(17);
  });

  it('不到 40 关以 40 为满', () => {
    expect(survivalProgress(10)).toEqual({ regular: 10, overtime: 0, regularPct: 25, overtimePct: 0 });
    expect(survivalProgress(40)).toEqual({ regular: 40, overtime: 0, regularPct: 100, overtimePct: 0 });
  });

  it('加时后常规段 + 加时段合计 100%', () => {
    const p = survivalProgress(50);
    expect(p.regular).toBe(40);
    expect(p.overtime).toBe(10);
    expect(p.regularPct).toBeCloseTo(80);
    expect(p.overtimePct).toBeCloseTo(20);
    expect(p.regularPct + p.overtimePct).toBeCloseTo(100);
  });
});

describe('本机最佳纪录', () => {
  it('第一次玩：写入但不算新纪录', () => {
    const storage = memoryStorage();
    expect(recordBest('fund', 12, storage)).toEqual({ best: 12, previous: null, isNew: false });
    expect(JSON.parse(storage.data[BEST_STORAGE_KEY])).toEqual({ fund: 12 });
    expect(readBest('fund', storage)).toBe(12);
  });

  it('打破纪录才写入，并标记新纪录；按角色分开存', () => {
    const storage = memoryStorage({ [BEST_STORAGE_KEY]: JSON.stringify({ fund: 20, stock: 5 }) });
    expect(recordBest('fund', 15, storage)).toEqual({ best: 20, previous: 20, isNew: false });
    expect(recordBest('fund', 20, storage)).toEqual({ best: 20, previous: 20, isNew: false });
    expect(recordBest('fund', 33, storage)).toEqual({ best: 33, previous: 20, isNew: true });
    expect(JSON.parse(storage.data[BEST_STORAGE_KEY])).toEqual({ fund: 33, stock: 5 });
    expect(readBest('crypto', storage)).toBeNull();
  });

  it('存储里是坏数据：当作没有纪录', () => {
    const storage = memoryStorage({ [BEST_STORAGE_KEY]: '{not json' });
    expect(readBest('stock', storage)).toBeNull();
    expect(recordBest('stock', 8, storage)).toEqual({ best: 8, previous: null, isNew: false });

    const weird = memoryStorage({ [BEST_STORAGE_KEY]: JSON.stringify({ stock: '99', fund: -1, crypto: 3.5 }) });
    expect(readBest('stock', weird)).toBeNull();
    expect(readBest('fund', weird)).toBeNull();
    expect(readBest('crypto', weird)).toBeNull();
  });

  it('localStorage 读写抛错时不崩，返回 null', () => {
    expect(() => readBest('fund', throwingStorage)).not.toThrow();
    expect(readBest('fund', throwingStorage)).toBeNull();
    expect(() => recordBest('fund', 30, throwingStorage)).not.toThrow();
    expect(recordBest('fund', 30, throwingStorage)).toBeNull();
  });

  it('只有写入抛错（如配额满）时也返回 null', () => {
    const readOnly: StorageLike = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(recordBest('crypto', 30, readOnly)).toBeNull();
  });

  it('没有存储（null）时返回 null', () => {
    expect(readBest('fund', null)).toBeNull();
    expect(recordBest('fund', 10, null)).toBeNull();
  });
});

describe('formatJitter', () => {
  it('用角色自己的属性名，按固定顺序列出非零项', () => {
    expect(formatJitter({ reputation: 3, capital: -6 }, 'fund')).toBe('市场抖动：业绩 -6，客户信任 +3');
    expect(formatJitter({ risk: -4 }, 'crypto')).toBe('市场抖动：保证金健康 -4');
  });

  it('undefined / null / 全零返回 null', () => {
    expect(formatJitter(undefined, 'stock')).toBeNull();
    expect(formatJitter(null, 'stock')).toBeNull();
    expect(formatJitter({ capital: 0 }, 'stock')).toBeNull();
  });
});
