import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
import {
  CLOSING_BELL, ENDINGS, choose, closingBellChance, createGame, getEndings, inferPersona, overtimeJitter, previewEffects,
  rollClosingBell,
} from './engine';
import { ROLE_IDS } from './roles';
import { OVERTIME_START, STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, GameState, RoleId, Side, StatKey, StyleTag, StyleTally } from './types';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function makeCard(id: string, left: Card['left']['effects'], right: Card['right']['effects']): Card {
  return {
    id,
    speaker: '测试',
    text: id,
    left: { label: '左', effects: left },
    right: { label: '右', effects: right },
    is_sample: true,
  };
}

function withState(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch };
}

describe('createGame', () => {
  it('初始四条数值都是 50，发出第一张牌', () => {
    const state = createGame(CARDS, 1);
    for (const key of STAT_KEYS) expect(state.stats[key]).toBe(50);
    expect(state.turn).toBe(0);
    expect(state.ending).toBeNull();
    expect(state.current).not.toBeNull();
    // 默认角色是 stock；牌堆只含该角色可用的卡（roles 省略或包含 stock）。
    const available = CARDS.filter((c) => !c.roles || c.roles.includes('stock'));
    expect(state.deck.length).toBe(available.length - 1);
    expect(state.deck).not.toContain(state.current?.id);
  });

  it('tally 九个标签全 0，log 为空，lastAftermath 为 null', () => {
    const state = createGame(CARDS, 1);
    expect(Object.keys(state.tally).sort()).toEqual([...STYLE_TAGS].sort());
    for (const tag of STYLE_TAGS) expect(state.tally[tag]).toBe(0);
    expect(state.log).toEqual([]);
    expect(state.lastAftermath).toBeNull();
  });

  it('相同 seed 的抽牌顺序一致，不同 seed 通常不同', () => {
    const run = (seed: number): string[] => {
      let state = createGame(CARDS, seed);
      const ids: string[] = [];
      for (let i = 0; i < 10 && state.current !== null; i += 1) {
        ids.push(state.current.id);
        state = choose(state, 'left', CARDS);
      }
      return ids;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('空牌库抛错', () => {
    expect(() => createGame([], 1)).toThrow();
  });
});

describe('choose', () => {
  const up = makeCard('up', { capital: 30 }, { capital: -30 });
  const cards = [up, makeCard('other', { risk: 5 }, { risk: -5 })];

  it('应用 effects 并回合数加一', () => {
    const start = withState(createGame(cards, 1), { current: up });
    const next = choose(start, 'left', cards);
    expect(next.stats.capital).toBe(80);
    expect(next.turn).toBe(1);
    expect(next.ending).toBeNull();
  });

  it('数值夹在 0–100', () => {
    const start = withState(createGame(cards, 1), {
      current: makeCard('c', { capital: 20, risk: -20 }, {}),
      stats: { capital: 90, risk: 10, confidence: 50, reputation: 50 },
    });
    const next = choose(start, 'left', cards);
    expect(next.stats.capital).toBe(100);
    expect(next.stats.risk).toBe(0);
    for (const key of STAT_KEYS) {
      expect(next.stats[key]).toBeGreaterThanOrEqual(0);
      expect(next.stats[key]).toBeLessThanOrEqual(100);
    }
  });

  it('数值降到 0 触发 low 结局（资金归零为爆仓离场）', () => {
    const start = withState(createGame(cards, 1), {
      current: makeCard('c', {}, { capital: -60 }),
      stats: { capital: 50, risk: 50, confidence: 50, reputation: 50 },
    });
    const next = choose(start, 'right', cards);
    expect(next.stats.capital).toBe(0);
    expect(next.ending?.kind).toBe('low');
    expect(next.ending?.stat).toBe('capital');
    expect(next.ending?.title).toBe('爆仓离场');
    expect(next.current).toBeNull();
  });

  it('数值升到 100 触发 high 结局', () => {
    const start = withState(createGame(cards, 1), {
      current: makeCard('c', { reputation: 60 }, {}),
    });
    const next = choose(start, 'left', cards);
    expect(next.stats.reputation).toBe(100);
    expect(next.ending).toEqual(ENDINGS.stock.reputation.high);
    expect(next.current).toBeNull();
  });

  it('tally 累加所选选项的 tags，且不改旧对象', () => {
    const tagged: Card = {
      ...makeCard('t', { risk: 1 }, { risk: -1 }),
      left: { label: '左', effects: { risk: 1 }, tags: ['cautious', 'research'] },
      right: { label: '右', effects: { risk: -1 }, tags: ['impulsive'] },
    };
    const pool = [tagged, makeCard('o', { risk: 1 }, { risk: -1 })];
    const start = withState(createGame(pool, 1), { current: tagged });
    const next = choose(start, 'left', pool);
    expect(next.tally.cautious).toBe(1);
    expect(next.tally.research).toBe(1);
    expect(next.tally.impulsive).toBe(0);
    expect(start.tally.cautious).toBe(0);
    expect(next.tally).not.toBe(start.tally);
    const again = choose(withState(next, { current: tagged }), 'left', pool);
    expect(again.tally.cautious).toBe(2);
  });

  it('log 追加 { cardId, side }，lastAftermath 取所选选项', () => {
    const c: Card = {
      ...makeCard('c1', { risk: 1 }, { risk: -1 }),
      left: { label: '左', effects: { risk: 1 }, aftermath: '后来左边了。' },
    };
    const pool = [c, makeCard('o', { risk: 1 }, { risk: -1 })];
    const start = withState(createGame(pool, 1), { current: c });
    const first = choose(start, 'left', pool);
    expect(first.log).toEqual([{ cardId: 'c1', side: 'left' }]);
    expect(first.lastAftermath).toBe('后来左边了。');
    expect(start.log).toEqual([]);
    const second = choose(withState(first, { current: c }), 'right', pool);
    expect(second.log).toEqual([
      { cardId: 'c1', side: 'left' },
      { cardId: 'c1', side: 'right' },
    ]);
    expect(second.lastAftermath).toBeNull();
  });

  it('OVERTIME_START 及之前不会因回合数结束，jitter 为 null；进入加时后每回合都有 jitter', () => {
    const calm = ['a', 'b', 'c'].map((id) => makeCard(id, { risk: 1 }, { risk: -1 }));
    let state = createGame(calm, 3);
    expect(state.jitter).toBeNull();
    for (let i = 0; i < OVERTIME_START; i += 1) {
      state = choose(state, i % 2 === 0 ? 'left' : 'right', calm);
      expect(state.ending).toBeNull();
      expect(state.jitter).toBeNull();
    }
    expect(state.turn).toBe(OVERTIME_START);
    let overtimeTurns = 0;
    while (state.ending === null) {
      const before = state;
      state = choose(state, state.turn % 2 === 0 ? 'left' : 'right', calm);
      overtimeTurns += 1;
      expect(state.turn).toBeGreaterThan(OVERTIME_START);
      // jitter 只写有变化的项，且等于“选项之后 → 抖动之后”的实际差值
      const jitter = state.jitter ?? {};
      expect(Object.keys(jitter).length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(jitter).length).toBeLessThanOrEqual(2);
      const choiceEffects = before.current?.[before.turn % 2 === 0 ? 'left' : 'right'].effects ?? {};
      for (const key of STAT_KEYS) {
        const afterChoice = Math.min(100, Math.max(0, before.stats[key] + (choiceEffects[key] ?? 0)));
        expect(state.stats[key]).toBe(afterChoice + (jitter[key] ?? 0));
        if (key in jitter) expect(jitter[key]).not.toBe(0);
      }
      expect(overtimeTurns).toBeLessThan(500);
    }
    expect(state.current).toBeNull();
    expect(state.log).toHaveLength(state.turn);
  });

  it('同 seed 同选择序列结果完全一致（含抖动）；不同 seed 抖动不同', () => {
    const calm = ['a', 'b', 'c'].map((id) => makeCard(id, { risk: 1 }, { risk: -1 }));
    const play = (seed: number): GameState[] => {
      const states: GameState[] = [];
      let state = createGame(calm, seed);
      while (state.ending === null && state.turn < 300) {
        state = choose(state, state.turn % 2 === 0 ? 'left' : 'right', calm);
        states.push(state);
      }
      return states;
    };
    expect(play(42)).toEqual(play(42));
    for (let turn = 0; turn <= OVERTIME_START; turn += 1) expect(overtimeJitter(42, turn)).toEqual({});
    const turns = Array.from({ length: 20 }, (_, i) => OVERTIME_START + 1 + i);
    expect(turns.map((t) => overtimeJitter(42, t))).toEqual(turns.map((t) => overtimeJitter(42, t)));
    expect(turns.map((t) => overtimeJitter(42, t))).not.toEqual(turns.map((t) => overtimeJitter(43, t)));
  });

  it('抖动幅度随加时回合增长，单条不超过封顶 25', () => {
    const maxAbs = (turn: number): number => {
      let m = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        for (const v of Object.values(overtimeJitter(seed, turn))) m = Math.max(m, Math.abs(v ?? 0));
      }
      return m;
    };
    expect(maxAbs(OVERTIME_START + 1)).toBeLessThanOrEqual(4);
    expect(maxAbs(OVERTIME_START + 10)).toBeGreaterThan(maxAbs(OVERTIME_START + 1));
    expect(maxAbs(OVERTIME_START + 100)).toBeLessThanOrEqual(25);
  });

  it('收盘铃：非加时为 0，随加时回合单调增长并最终到 1；同 seed 同 turn 结果一致', () => {
    for (let turn = 0; turn <= OVERTIME_START; turn += 1) {
      expect(closingBellChance(turn)).toBe(0);
      expect(rollClosingBell(7, turn)).toBe(false);
    }
    expect(closingBellChance(OVERTIME_START + 1)).toBeCloseTo(CLOSING_BELL.start);
    let prev = 0;
    for (let turn = OVERTIME_START + 1; turn < OVERTIME_START + 400; turn += 1) {
      expect(closingBellChance(turn)).toBeGreaterThanOrEqual(prev);
      prev = closingBellChance(turn);
      expect(rollClosingBell(7, turn)).toBe(rollClosingBell(7, turn));
    }
    expect(prev).toBe(1);
  });

  it('任何选择策略都会在有限回合内结束', () => {
    const calm = ['a', 'b', 'c'].map((id) => makeCard(id, { risk: 1 }, { risk: -1 }));
    const strategies: Readonly<Record<string, (state: GameState, i: number) => Side>> = {
      alwaysLeft: () => 'left',
      alternating: (_s, i) => (i % 2 === 0 ? 'left' : 'right'),
      pairs: (_s, i) => (Math.floor(i / 2) % 2 === 0 ? 'left' : 'right'),
      keepCentered: (s, i) => {
        if (s.current === null) return 'left';
        const dist = (side: Side): number =>
          STAT_KEYS.reduce((sum, key) => sum + Math.abs(s.stats[key] + (s.current?.[side].effects[key] ?? 0) - 50), 0);
        const pick: Side = dist('left') <= dist('right') ? 'left' : 'right';
        // 避免惯性思维：每 7 次强制换一次方向
        return i % 7 === 6 ? (pick === 'left' ? 'right' : 'left') : pick;
      },
    };
    for (const pool of [calm, CARDS]) {
      for (const [name, strategy] of Object.entries(strategies)) {
        for (let seed = 1; seed <= 20; seed += 1) {
          let state = createGame(pool, seed);
          for (let i = 0; state.ending === null && i < 1000; i += 1) state = choose(state, strategy(state, i), pool);
          expect(state.ending, `${name} seed=${seed}`).not.toBeNull();
          expect(state.turn).toBeLessThan(1000);
        }
      }
    }
  });

  it('结局出现时 current 为 null，且 log / tally 已包含最后一次选择', () => {
    const c: Card = {
      ...makeCard('c', {}, { capital: -60 }),
      right: { label: '右', effects: { capital: -60 }, tags: ['impulsive'], aftermath: '后来归零了。' },
    };
    const ended = choose(withState(createGame([c], 1), { current: c }), 'right', [c]);
    expect(ended.current).toBeNull();
    expect(ended.log).toEqual([{ cardId: 'c', side: 'right' }]);
    expect(ended.tally.impulsive).toBe(1);
    expect(ended.lastAftermath).toBe('后来归零了。');
  });

  it('一局内卡牌 id 在牌抽完前不重复', () => {
    let state = createGame(CARDS, 11);
    const seen = new Set<string>();
    for (let i = 0; i < CARDS.length && state.current !== null; i += 1) {
      expect(seen.has(state.current.id)).toBe(false);
      seen.add(state.current.id);
      state = choose(state, 'left', CARDS);
    }
  });

  it('每个角色共 8 个普通结局，标题和描述非空', () => {
    for (const role of ROLE_IDS) {
      const all = STAT_KEYS.flatMap((key) => [ENDINGS[role][key].low, ENDINGS[role][key].high]);
      expect(all).toHaveLength(8);
      expect(new Set(all.map((e) => e.title)).size).toBe(8);
      for (const ending of all) {
        expect(ending.title.length).toBeGreaterThan(0);
        expect(ending.description.length).toBeGreaterThan(0);
      }
      expect(getEndings(role).length).toBeGreaterThanOrEqual(8 + 2 + 5);
    }
  });

  it('结局后 choose 原样返回', () => {
    const start = withState(createGame(cards, 1), { current: makeCard('c', {}, { capital: -60 }) });
    const ended = choose(start, 'right', cards);
    expect(choose(ended, 'left', cards)).toBe(ended);
  });

  it('不修改入参（深冻结后调用不抛错）', () => {
    const frozenCards = deepFreeze(CARDS.map((card) => structuredClone(card)));
    let state = deepFreeze(createGame(frozenCards, 7));
    const sides: Side[] = ['left', 'right'];
    for (let i = 0; i < OVERTIME_START + 30 && state.ending === null; i += 1) {
      expect(() => {
        state = deepFreeze(choose(state, sides[i % 2], frozenCards));
        previewEffects(state, 'left');
      }).not.toThrow();
    }
  });

  it('牌抽完后重新洗牌继续，且不连续抽到同一张', () => {
    const neutral = ['a', 'b', 'c'].map((id) => makeCard(id, { risk: 1 }, { risk: -1 }));
    let state = createGame(neutral, 5);
    let prev = state.current?.id;
    const seen: string[] = [prev as string];
    for (let i = 0; i < 20; i += 1) {
      state = choose(state, i % 2 === 0 ? 'left' : 'right', neutral);
      expect(state.ending).toBeNull();
      expect(state.current).not.toBeNull();
      expect(state.current?.id).not.toBe(prev);
      prev = state.current?.id;
      seen.push(prev as string);
    }
    expect(new Set(seen)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('只有一张牌时也能继续', () => {
    const solo = [makeCard('solo', { risk: 1 }, { risk: -1 })];
    let state = createGame(solo, 1);
    state = choose(state, 'left', solo);
    expect(state.current?.id).toBe('solo');
  });
});

describe('角色', () => {
  const shared = makeCard('shared', { risk: 1 }, { risk: -1 });
  const fundOnly: Card = { ...makeCard('fund-only', { risk: 1 }, { risk: -1 }), roles: ['fund'] };
  const cryptoOnly: Card = { ...makeCard('crypto-only', { risk: 1 }, { risk: -1 }), roles: ['crypto'] };
  const multi: Card = { ...makeCard('multi', { risk: 1 }, { risk: -1 }), roles: ['fund', 'stock'] };
  const pool = [shared, fundOnly, cryptoOnly, multi];
  const allowed: Record<RoleId, string[]> = {
    fund: ['shared', 'fund-only', 'multi'],
    crypto: ['shared', 'crypto-only'],
    stock: ['shared', 'multi'],
  };

  it('createGame 默认角色是 stock，并把 role 存进 state', () => {
    expect(createGame(pool, 1).role).toBe('stock');
    for (const role of ROLE_IDS) expect(createGame(pool, 1, role).role).toBe(role);
  });

  it('抽牌只用 roles 省略或包含该角色的卡（含牌堆抽完重洗之后）', () => {
    for (const role of ROLE_IDS) {
      let state = createGame(pool, 3, role);
      const seen = new Set<string>();
      for (let i = 0; i < 30; i += 1) {
        expect(state.current).not.toBeNull();
        expect(allowed[role]).toContain(state.current?.id);
        seen.add(state.current?.id as string);
        state = choose(state, i % 2 === 0 ? 'left' : 'right', pool);
        expect(state.ending).toBeNull();
        expect(state.role).toBe(role);
      }
      expect(seen).toEqual(new Set(allowed[role]));
    }
  });

  it('初始牌堆只含该角色可用的卡', () => {
    const state = createGame(pool, 2, 'crypto');
    const ids = [state.current?.id, ...state.deck];
    expect(new Set(ids)).toEqual(new Set(allowed.crypto));
  });

  it('过滤后牌库为空时 createGame 抛错', () => {
    expect(() => createGame([fundOnly], 1, 'crypto')).toThrow();
    expect(() => createGame([fundOnly], 1)).toThrow();
  });

  it('choose 按 state.role 取结局：同样的触底，三个角色标题不同', () => {
    const titles = ROLE_IDS.map((role) => {
      const drop = makeCard('drop', {}, { capital: -60 });
      const start = withState(createGame([drop], 1, role), { current: drop });
      const ended = choose(start, 'right', [drop]);
      expect(ended.ending).toEqual(ENDINGS[role].capital.low);
      expect(ended.role).toBe(role);
      return ended.ending?.title;
    });
    expect(titles).toEqual(['清盘通知', '空钱包', '爆仓离场']);
  });

  it('各角色进入加时后必然结束（role 在结局中保留）', () => {
    const calm = ['a', 'b', 'c'].map((id) => makeCard(id, { risk: 1 }, { risk: -1 }));
    for (const role of ROLE_IDS) {
      let state = createGame(calm, 4, role);
      for (let i = 0; state.ending === null && i < 1000; i += 1) state = choose(state, i % 2 === 0 ? 'left' : 'right', calm);
      expect(state.turn).toBeGreaterThan(OVERTIME_START);
      expect(state.ending).not.toBeNull();
      expect(state.ending?.role === role || state.ending?.role === 'all').toBe(true);
    }
  });

  it('不修改传入的完整牌库（深冻结后调用不抛错）', () => {
    const frozen = deepFreeze(pool.map((card) => structuredClone(card)));
    let state = deepFreeze(createGame(frozen, 9, 'fund'));
    for (let i = 0; i < 10; i += 1) {
      expect(() => {
        state = deepFreeze(choose(state, i % 2 === 0 ? 'left' : 'right', frozen));
      }).not.toThrow();
    }
  });
});

describe('inferPersona', () => {
  const zero = Object.fromEntries(STYLE_TAGS.map((tag) => [tag, 0])) as unknown as StyleTally;
  const tallyOf = (patch: Partial<Record<StyleTag, number>>): StyleTally => ({ ...zero, ...patch });

  it('取次数最多的标签对应的人物卡', () => {
    expect(inferPersona(tallyOf({ cautious: 5, trend: 3 }))).toBe('turtle');
    expect(inferPersona(tallyOf({ research: 1 }))).toBe('owl');
    const expected: Record<StyleTag, string> = {
      passive: 'sloth', impulsive: 'bull', stubborn: 'hedgehog', research: 'owl', concentrated: 'shark',
      cautious: 'turtle', trend: 'dolphin', contrarian: 'crab', adaptive: 'fox',
    };
    for (const tag of STYLE_TAGS) expect(inferPersona(tallyOf({ [tag]: 4 }))).toBe(expected[tag]);
  });

  it('tally 全 0 返回 fox', () => {
    expect(inferPersona(zero)).toBe('fox');
  });

  it('并列且不传 log：按 STYLE_TAGS 顺序取第一个', () => {
    expect(inferPersona(tallyOf({ trend: 2, impulsive: 2 }))).toBe('bull');
  });

  it('并列且传 log + cards：取最近出现的标签', () => {
    const a: Card = {
      ...makeCard('a', {}, {}),
      left: { label: '左', effects: { risk: 1 }, tags: ['trend'] },
      right: { label: '右', effects: { risk: 1 }, tags: ['impulsive'] },
    };
    const pool = [a];
    const tally = tallyOf({ trend: 2, impulsive: 2 });
    const log = [
      { cardId: 'a', side: 'left' as const },
      { cardId: 'a', side: 'right' as const },
      { cardId: 'a', side: 'left' as const },
      { cardId: 'a', side: 'right' as const },
    ];
    expect(inferPersona(tally, log, pool)).toBe('bull');
    expect(inferPersona(tally, log.slice(0, 3), pool)).toBe('dolphin');
    // log 里查不到并列标签时回退到 STYLE_TAGS 顺序
    expect(inferPersona(tally, [], pool)).toBe('bull');
  });

  it('不修改入参', () => {
    const tally = deepFreeze(tallyOf({ stubborn: 3 }));
    expect(() => inferPersona(tally, deepFreeze([]), deepFreeze([]))).not.toThrow();
  });
});

describe('previewEffects', () => {
  it('返回该选项会改变的数值键', () => {
    const card = makeCard('p', { capital: 10, risk: -5, confidence: 0 }, { reputation: 8 });
    const state = withState(createGame([card], 1), { current: card });
    expect(previewEffects(state, 'left')).toEqual(['capital', 'risk']);
    expect(previewEffects(state, 'right')).toEqual(['reputation']);
  });

  it('结局后返回空数组', () => {
    const card = makeCard('p', {}, { capital: -60 });
    const ended = choose(withState(createGame([card], 1), { current: card }), 'right', [card]);
    expect(previewEffects(ended, 'left')).toEqual([]);
  });
});

describe('CARDS 数据校验', () => {
  it('至少 24 张，id 唯一，全部标注 is_sample', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const card of CARDS) expect(card.is_sample).toBe(true);
  });

  it('选项 label 非空且不超过 8 个字', () => {
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        expect(choice.label.length).toBeGreaterThan(0);
        expect(choice.label.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('effects 的键合法，单次变化幅度 5–20', () => {
    const valid = new Set<string>(STAT_KEYS);
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        const entries = Object.entries(choice.effects);
        expect(entries.length).toBeGreaterThan(0);
        for (const [key, value] of entries) {
          expect(valid.has(key)).toBe(true);
          expect(Math.abs(value as number)).toBeGreaterThanOrEqual(5);
          expect(Math.abs(value as number)).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('四条数值被影响的频率大致均衡', () => {
    const counts: Record<StatKey, number> = { capital: 0, risk: 0, confidence: 0, reputation: 0 };
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        for (const key of Object.keys(choice.effects) as StatKey[]) counts[key] += 1;
      }
    }
    const values = Object.values(counts);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(CARDS.length / 2);
  });

  it('每个选项最多 2 个合法标签，9 种标签日常卡里都出现', () => {
    const valid = new Set<string>(STYLE_TAGS);
    const used = new Set<StyleTag>();
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        const tags = choice.tags ?? [];
        expect(tags.length).toBeLessThanOrEqual(2);
        expect(new Set(tags).size).toBe(tags.length);
        for (const tag of tags) {
          expect(valid.has(tag)).toBe(true);
          used.add(tag);
        }
      }
    }
    expect(used.size).toBe(STYLE_TAGS.length);
  });

  it('每个选项都有 aftermath，且不超过 30 字', () => {
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        expect(choice.aftermath).toBeDefined();
        expect((choice.aftermath ?? '').length).toBeGreaterThan(0);
        expect((choice.aftermath ?? '').length).toBeLessThanOrEqual(30);
      }
    }
  });
});
