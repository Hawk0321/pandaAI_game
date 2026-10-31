import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
import { choose, createGame } from './engine';
import { ALL_ENDINGS, ENDING_THRESHOLDS, ENDINGS, SPECIAL_ENDINGS, findEnding } from './endings';
import type { EndingInput } from './endings';
import { MAX_TURNS, STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, ChoiceLog, Side, Stats, StyleTally } from './types';

const ZERO_TALLY: StyleTally = Object.fromEntries(STYLE_TAGS.map((tag) => [tag, 0])) as unknown as StyleTally;
const MID: Stats = { capital: 50, risk: 50, confidence: 50, reputation: 50 };

function makeLog(sides: readonly Side[], cardId = 'x'): ChoiceLog[] {
  return sides.map((side, i) => ({ cardId: `${cardId}${i}`, side }));
}

/** 交替方向的日志，避免误触“惯性思维”。 */
function alternating(n: number, cardId = 'x'): ChoiceLog[] {
  return makeLog(Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'left' : 'right')), cardId);
}

function input(patch: Partial<EndingInput> = {}): EndingInput {
  return { stats: MID, turn: 10, log: alternating(10), tally: ZERO_TALLY, ...patch };
}

function tallyOf(patch: Partial<Record<(typeof STYLE_TAGS)[number], number>>): StyleTally {
  return { ...ZERO_TALLY, ...patch };
}

function adventureCard(id: string): Card {
  return {
    id,
    speaker: '测试',
    text: id,
    left: { label: '左', effects: { risk: 1 } },
    right: { label: '右', effects: { risk: -1 } },
    adventure: { levelId: 'L01', scenario: 'uptrend' },
    is_sample: true,
  };
}

/** 固定种子的 PRNG，用于蒙特卡洛的随机策略。 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('结局表', () => {
  it('普通结局 8 个，special 为 false，id 唯一', () => {
    const normal = STAT_KEYS.flatMap((key) => [ENDINGS[key].low, ENDINGS[key].high]);
    expect(normal).toHaveLength(8);
    for (const e of normal) {
      expect(e.special).toBe(false);
      expect(e.id).toMatch(/^(low|high)-/);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.description.length).toBeGreaterThan(0);
    }
  });

  it('特殊结局不少于 6 个，id 以 sp- 开头，kind 为 special 或 survive', () => {
    const specials = Object.values(SPECIAL_ENDINGS);
    expect(specials.length).toBeGreaterThanOrEqual(6);
    for (const e of specials) {
      expect(e.special).toBe(true);
      expect(e.id.startsWith('sp-')).toBe(true);
      expect(['special', 'survive']).toContain(e.kind);
    }
  });

  it('全部结局 id、标题唯一', () => {
    expect(new Set(ALL_ENDINGS.map((e) => e.id)).size).toBe(ALL_ENDINGS.length);
    expect(new Set(ALL_ENDINGS.map((e) => e.title)).size).toBe(ALL_ENDINGS.length);
  });
});

describe('findEnding：普通结局', () => {
  it('没有条件命中时返回 null', () => {
    expect(findEnding(input(), CARDS)).toBeNull();
  });

  it('触底和爆满命中对应普通结局', () => {
    expect(findEnding(input({ stats: { ...MID, risk: 0 } }), CARDS)).toBe(ENDINGS.risk.low);
    expect(findEnding(input({ stats: { ...MID, confidence: 100 } }), CARDS)).toBe(ENDINGS.confidence.high);
  });

  it('普通结局优先于中途特殊结局和走满结局', () => {
    const stats: Stats = { capital: 100, risk: 50, confidence: 90, reputation: 50 };
    const log = makeLog(Array<Side>(MAX_TURNS).fill('left'));
    expect(findEnding(input({ stats, turn: MAX_TURNS, log }), CARDS)).toBe(ENDINGS.capital.high);
  });
});

describe('findEnding：中途特殊结局', () => {
  it('惯性思维：最近 8 次同方向', () => {
    const n = ENDING_THRESHOLDS.inertiaStreak;
    const mixed = makeLog(['right', ...Array<Side>(n - 1).fill('left')]);
    expect(findEnding(input({ log: mixed }), CARDS)).toBeNull();
    const streak = makeLog([...(['right', 'left'] as Side[]), ...Array<Side>(n).fill('right')]);
    expect(findEnding(input({ log: streak }), CARDS)).toBe(SPECIAL_ENDINGS.inertia);
  });

  it('飘飘然：资金与信心都高但未满', () => {
    const stats: Stats = { ...MID, capital: ENDING_THRESHOLDS.euphoriaMin, confidence: 95 };
    expect(findEnding(input({ stats }), CARDS)).toBe(SPECIAL_ENDINGS.euphoria);
    expect(findEnding(input({ stats: { ...stats, confidence: 60 } }), CARDS)).toBeNull();
  });

  it('刀尖起舞：风控很低、资金很高', () => {
    const stats: Stats = { ...MID, risk: ENDING_THRESHOLDS.knifeRiskMax, capital: ENDING_THRESHOLDS.knifeCapitalMin };
    expect(findEnding(input({ stats }), CARDS)).toBe(SPECIAL_ENDINGS.knifeEdge);
    expect(findEnding(input({ stats: { ...stats, risk: 30 } }), CARDS)).toBeNull();
  });

  it('中途结局内部优先级：惯性思维 > 飘飘然 > 刀尖起舞', () => {
    const stats: Stats = { capital: 90, risk: 10, confidence: 90, reputation: 50 };
    expect(findEnding(input({ stats }), CARDS)).toBe(SPECIAL_ENDINGS.euphoria);
    const log = makeLog(Array<Side>(8).fill('left'));
    expect(findEnding(input({ stats, log }), CARDS)).toBe(SPECIAL_ENDINGS.inertia);
  });

  it('中途特殊结局优先于走满结局', () => {
    const stats: Stats = { ...MID, capital: 85, confidence: 85 };
    expect(findEnding(input({ stats, turn: MAX_TURNS }), CARDS)).toBe(SPECIAL_ENDINGS.euphoria);
  });
});

describe('findEnding：走满回合', () => {
  const advCards = Array.from({ length: 10 }, (_, i) => adventureCard(`adv-${i}`));
  const full = (patch: Partial<EndingInput>): EndingInput =>
    input({ turn: MAX_TURNS, log: alternating(MAX_TURNS), ...patch });

  it('未走满不触发走满结局', () => {
    expect(findEnding(input({ turn: MAX_TURNS - 1 }), CARDS)).toBeNull();
  });

  it('兜底：活到收盘', () => {
    const stats: Stats = { capital: 70, risk: 30, confidence: 50, reputation: 50 };
    expect(findEnding(full({ stats }), CARDS)).toBe(SPECIAL_ENDINGS.survivor);
  });

  it('稳如磐石：四条数值都在 35–65', () => {
    expect(findEnding(full({}), CARDS)).toBe(SPECIAL_ENDINGS.balanced);
    expect(findEnding(full({ stats: { ...MID, capital: 35, reputation: 65 } }), CARDS)).toBe(SPECIAL_ENDINGS.balanced);
    expect(findEnding(full({ stats: { ...MID, capital: 34 } }), CARDS)).toBe(SPECIAL_ENDINGS.survivor);
    expect(findEnding(full({ stats: { ...MID, reputation: 66 } }), CARDS)).toBe(SPECIAL_ENDINGS.survivor);
  });

  it('行情亲历者：奇遇卡选择次数 >= 8，用 log 和 cards 统计', () => {
    const n = ENDING_THRESHOLDS.adventureCount;
    const advLog = (count: number): ChoiceLog[] => [
      ...alternating(MAX_TURNS - count, 'day'),
      ...advCards.slice(0, count).map((card, i) => ({ cardId: card.id, side: (i % 2 === 0 ? 'left' : 'right') as Side })),
    ];
    expect(findEnding(full({ log: advLog(n) }), advCards)).toBe(SPECIAL_ENDINGS.adventurer);
    expect(findEnding(full({ log: advLog(n - 1) }), advCards)).toBe(SPECIAL_ENDINGS.balanced);
    // 同样的 log 在不含奇遇卡的牌库里不算
    expect(findEnding(full({ log: advLog(n) }), CARDS)).toBe(SPECIAL_ENDINGS.balanced);
  });

  it('偏执专家：某标签占比 >= 30% 且总数 >= 12', () => {
    const stats: Stats = { capital: 70, risk: 30, confidence: 50, reputation: 50 };
    expect(findEnding(full({ stats, tally: tallyOf({ cautious: 10, trend: 12 }) }), CARDS)).toBe(
      SPECIAL_ENDINGS.obsessive,
    );
    // 占比不够
    expect(findEnding(full({ stats, tally: tallyOf({ cautious: 4, trend: 4, passive: 4, research: 4 }) }), CARDS)).toBe(
      SPECIAL_ENDINGS.survivor,
    );
    // 总数不够
    expect(findEnding(full({ stats, tally: tallyOf({ cautious: 10 }) }), CARDS)).toBe(SPECIAL_ENDINGS.survivor);
  });

  it('走满优先级：行情亲历者 > 偏执专家 > 稳如磐石', () => {
    const tally = tallyOf({ cautious: 20 });
    expect(findEnding(full({ tally }), CARDS)).toBe(SPECIAL_ENDINGS.obsessive);
    const advLog = advCards.slice(0, 8).map((card, i) => ({ cardId: card.id, side: (i % 2 === 0 ? 'left' : 'right') as Side }));
    expect(findEnding(full({ tally, log: advLog }), advCards)).toBe(SPECIAL_ENDINGS.adventurer);
  });
});

describe('蒙特卡洛：随机策略 2000 局（仅日常卡）', () => {
  const GAMES = 2000;

  it('每局必在 MAX_TURNS 内结束，且至少出现 4 种特殊结局', () => {
    const rand = rng(20240601);
    const counts = new Map<string, number>();
    let maxTurn = 0;

    for (let g = 0; g < GAMES; g += 1) {
      let state = createGame(CARDS, g + 1);
      let guard = 0;
      while (state.ending === null) {
        state = choose(state, rand() < 0.5 ? 'left' : 'right', CARDS);
        guard += 1;
        if (guard > MAX_TURNS) break;
      }
      expect(state.ending).not.toBeNull();
      expect(state.current).toBeNull();
      expect(state.turn).toBeLessThanOrEqual(MAX_TURNS);
      maxTurn = Math.max(maxTurn, state.turn);
      const id = (state.ending as { id: string }).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const pct = (n: number): string => `${((n / GAMES) * 100).toFixed(1)}%`;
    const rows = ALL_ENDINGS.map((e) => `${e.special ? '特殊' : '普通'} ${e.id.padEnd(16)} ${e.title.padEnd(6, '　')} ${pct(counts.get(e.id) ?? 0)}`);
    const special = ALL_ENDINGS.filter((e) => e.special).reduce((s, e) => s + (counts.get(e.id) ?? 0), 0);
    console.info(
      [`蒙特卡洛 ${GAMES} 局，最长 ${maxTurn} 回合`, ...rows, `普通结局合计 ${pct(GAMES - special)}，特殊结局合计 ${pct(special)}`].join('\n'),
    );

    const specialKinds = ALL_ENDINGS.filter((e) => e.special && (counts.get(e.id) ?? 0) > 0);
    expect(specialKinds.length).toBeGreaterThanOrEqual(4);
  });
});
