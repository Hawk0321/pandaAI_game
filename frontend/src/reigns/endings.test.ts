import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from './allCards';
import { choose, createGame } from './engine';
import { ENDING_THRESHOLDS, ENDINGS, GENERIC_ENDINGS, ROLE_SPECIAL_ENDINGS, findEnding, getEndings } from './endings';
import type { EndingInput } from './endings';
import { ROLE_IDS } from './roles';
import { OVERTIME_START, STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, ChoiceLog, GameState, RoleId, Side, Stats, StyleTag, StyleTally } from './types';

const ZERO_TALLY: StyleTally = Object.fromEntries(STYLE_TAGS.map((tag) => [tag, 0])) as unknown as StyleTally;
const MID: Stats = { capital: 50, risk: 50, confidence: 50, reputation: 50 };
const NO_CARDS: readonly Card[] = [];

function makeLog(sides: readonly Side[], cardId = 'x'): ChoiceLog[] {
  return sides.map((side, i) => ({ cardId: `${cardId}${i}`, side }));
}

/** 交替方向的日志，避免误触“惯性思维”。 */
function alternating(n: number, cardId = 'x'): ChoiceLog[] {
  return makeLog(Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'left' : 'right')), cardId);
}

function input(role: RoleId, patch: Partial<EndingInput> = {}): EndingInput {
  return { role, stats: MID, turn: 10, log: alternating(10), tally: ZERO_TALLY, ...patch };
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

/** 每个角色一组能触发专属特殊结局的手工状态（id -> stats）。 */
const ROLE_SPECIAL_STATES: Readonly<Record<RoleId, Readonly<Record<string, Stats>>>> = {
  fund: {
    'sp-fund-star': { capital: 85, risk: 20, confidence: 50, reputation: 85 },
    'sp-fund-unloved': { capital: 85, risk: 50, confidence: 50, reputation: 15 },
    'sp-fund-chaser': { capital: 50, risk: 50, confidence: 15, reputation: 85 },
  },
  crypto: {
    'sp-crypto-allin': { capital: 85, risk: 20, confidence: 50, reputation: 50 },
    'sp-crypto-moon': { capital: 85, risk: 50, confidence: 85, reputation: 50 },
    'sp-crypto-paper': { capital: 50, risk: 85, confidence: 15, reputation: 50 },
  },
  stock: {
    'sp-stock-guru': { capital: 50, risk: 20, confidence: 85, reputation: 85 },
    'sp-stock-bagholder': { capital: 15, risk: 50, confidence: 85, reputation: 50 },
    'sp-stock-hermit': { capital: 50, risk: 85, confidence: 50, reputation: 15 },
  },
};

describe('结局表', () => {
  it('每个角色普通结局 8 个，special 为 false，id 形如 <role>-low-capital，role 正确', () => {
    for (const role of ROLE_IDS) {
      const normal = STAT_KEYS.flatMap((key) => [ENDINGS[role][key].low, ENDINGS[role][key].high]);
      expect(normal).toHaveLength(8);
      for (const e of normal) {
        expect(e.special).toBe(false);
        expect(e.role).toBe(role);
        expect(e.id).toMatch(new RegExp(`^${role}-(low|high)-(capital|risk|confidence|reputation)$`));
        expect(e.title.length).toBeGreaterThan(0);
        expect(e.description.length).toBeGreaterThan(0);
        expect(e.description.length).toBeLessThanOrEqual(60);
      }
      expect(new Set(normal.map((e) => e.title)).size).toBe(8);
    }
  });

  it('三个角色的触底爆满结局都存在，且标题、描述互不相同', () => {
    for (const key of STAT_KEYS) {
      for (const kind of ['low', 'high'] as const) {
        const titles = ROLE_IDS.map((role) => ENDINGS[role][key][kind].title);
        const descs = ROLE_IDS.map((role) => ENDINGS[role][key][kind].description);
        expect(new Set(titles).size).toBe(3);
        expect(new Set(descs).size).toBe(3);
      }
    }
    expect(ENDINGS.fund.capital.low.title).toBe('清盘通知');
    expect(ENDINGS.crypto.risk.low.title).toBe('被清算');
    expect(ENDINGS.stock.capital.low.title).toBe('爆仓离场');
  });

  it('每个角色至少 2 个专属特殊结局：sp-<role>- 开头、role 正确、special', () => {
    for (const role of ROLE_IDS) {
      const list = ROLE_SPECIAL_ENDINGS[role];
      expect(list.length).toBeGreaterThanOrEqual(2);
      for (const e of list) {
        expect(e.id.startsWith(`sp-${role}-`)).toBe(true);
        expect(e.role).toBe(role);
        expect(e.special).toBe(true);
        expect(e.description.length).toBeLessThanOrEqual(60);
      }
    }
  });

  it('通用特殊结局 role 为 all，id 与标题三个角色相同，描述各不相同且不超过 60 字', () => {
    for (const key of Object.keys(GENERIC_ENDINGS.stock) as (keyof typeof GENERIC_ENDINGS.stock)[]) {
      const versions = ROLE_IDS.map((role) => GENERIC_ENDINGS[role][key]);
      for (const e of versions) {
        expect(e.role).toBe('all');
        expect(e.special).toBe(true);
        expect(e.id.startsWith('sp-')).toBe(true);
        expect(e.description.length).toBeLessThanOrEqual(60);
      }
      expect(new Set(versions.map((e) => e.id)).size).toBe(1);
      expect(new Set(versions.map((e) => e.title)).size).toBe(1);
      expect(new Set(versions.map((e) => e.description)).size).toBe(3);
    }
  });

  it('getEndings(role)：普通 8 + 专属 + 通用 5，id、标题在该角色内唯一', () => {
    for (const role of ROLE_IDS) {
      const list = getEndings(role);
      expect(list).toHaveLength(8 + ROLE_SPECIAL_ENDINGS[role].length + 5);
      expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
      expect(new Set(list.map((e) => e.title)).size).toBe(list.length);
      for (const e of list) expect(e.role === role || e.role === 'all').toBe(true);
    }
  });
});

describe('findEnding：普通结局', () => {
  it('没有条件命中时返回 null', () => {
    for (const role of ROLE_IDS) expect(findEnding(input(role), NO_CARDS)).toBeNull();
  });

  it('触底和爆满按角色命中对应普通结局', () => {
    for (const role of ROLE_IDS) {
      for (const key of STAT_KEYS) {
        expect(findEnding(input(role, { stats: { ...MID, [key]: 0 } }), NO_CARDS)).toBe(ENDINGS[role][key].low);
        expect(findEnding(input(role, { stats: { ...MID, [key]: 100 } }), NO_CARDS)).toBe(ENDINGS[role][key].high);
      }
    }
  });

  it('普通结局优先于专属、惯性和收盘结局', () => {
    const turn = OVERTIME_START + 5;
    for (const role of ROLE_IDS) {
      const stats: Stats = { capital: 100, risk: 10, confidence: 90, reputation: 90 };
      const log = makeLog(Array<Side>(turn).fill('left'));
      expect(findEnding(input(role, { stats, turn, log, closingBell: true }), NO_CARDS)).toBe(ENDINGS[role].capital.high);
    }
  });
});

describe('findEnding：角色专属中途特殊结局', () => {
  it('每个角色的专属特殊结局都能被手工状态触发', () => {
    for (const role of ROLE_IDS) {
      const states = ROLE_SPECIAL_STATES[role];
      for (const e of ROLE_SPECIAL_ENDINGS[role]) {
        const stats = states[e.id];
        expect(stats, `缺少 ${e.id} 的测试状态`).toBeDefined();
        expect(findEnding(input(role, { stats }), NO_CARDS)).toBe(e);
      }
    }
  });

  it('同样的数值在别的角色下不会触发该角色的专属结局', () => {
    for (const role of ROLE_IDS) {
      for (const other of ROLE_IDS.filter((r) => r !== role)) {
        for (const stats of Object.values(ROLE_SPECIAL_STATES[role])) {
          const result = findEnding(input(other, { stats }), NO_CARDS);
          if (result !== null) expect(result.id.startsWith(`sp-${role}-`)).toBe(false);
        }
      }
    }
  });

  it('专属结局优先于惯性思维，也优先于收盘结局', () => {
    for (const role of ROLE_IDS) {
      const e = ROLE_SPECIAL_ENDINGS[role][0];
      const stats = ROLE_SPECIAL_STATES[role][e.id];
      const streak = makeLog(Array<Side>(ENDING_THRESHOLDS.inertiaStreak).fill('left'));
      expect(findEnding(input(role, { stats, log: streak }), NO_CARDS)).toBe(e);
      const turn = OVERTIME_START + 5;
      expect(findEnding(input(role, { stats, turn, log: alternating(turn), closingBell: true }), NO_CARDS)).toBe(e);
    }
  });

  it('基金经理：明星基金经理需要业绩与信任都高、回撤控制低，缺一不可', () => {
    const star = ROLE_SPECIAL_STATES.fund['sp-fund-star'];
    expect(findEnding(input('fund', { stats: { ...star, risk: 60 } }), NO_CARDS)).toBeNull();
    expect(findEnding(input('fund', { stats: { ...star, reputation: 60 } }), NO_CARDS)).toBeNull();
    expect(findEnding(input('fund', { stats: { ...star, capital: 60 } }), NO_CARDS)).toBeNull();
  });
});

describe('findEnding：惯性思维（通用，按角色给文案）', () => {
  it('最近 8 次同方向触发，且三个角色的描述不同', () => {
    const n = ENDING_THRESHOLDS.inertiaStreak;
    const mixed = makeLog(['right', ...Array<Side>(n - 1).fill('left')]);
    const streak = makeLog([...(['right', 'left'] as Side[]), ...Array<Side>(n).fill('right')]);
    const descs = new Set<string>();
    for (const role of ROLE_IDS) {
      expect(findEnding(input(role, { log: mixed }), NO_CARDS)).toBeNull();
      const e = findEnding(input(role, { log: streak }), NO_CARDS);
      expect(e).toBe(GENERIC_ENDINGS[role].inertia);
      expect(e?.id).toBe('sp-inertia');
      descs.add(e?.description ?? '');
    }
    expect(descs.size).toBe(3);
  });
});

describe('findEnding：加时收盘铃', () => {
  const FULL_TURN = OVERTIME_START + 5;
  const advCards = Array.from({ length: 10 }, (_, i) => adventureCard(`adv-${i}`));
  const full = (role: RoleId, patch: Partial<EndingInput>): EndingInput =>
    input(role, { turn: FULL_TURN, log: alternating(FULL_TURN), closingBell: true, ...patch });
  const SKEWED: Stats = { capital: 70, risk: 30, confidence: 50, reputation: 50 };

  it('没有回合上限：铃没响时，走多少回合都不会因回合数结束', () => {
    for (const role of ROLE_IDS) {
      for (const turn of [OVERTIME_START - 1, OVERTIME_START, OVERTIME_START + 1, 200]) {
        expect(findEnding(input(role, { turn, log: alternating(turn) }), NO_CARDS)).toBeNull();
        expect(findEnding(input(role, { turn, log: alternating(turn), closingBell: false }), NO_CARDS)).toBeNull();
      }
    }
  });

  it('铃响必有结局：不管数值怎样（没触底爆满）', () => {
    for (const role of ROLE_IDS) {
      for (const c of [1, 20, 40, 60, 99]) {
        const stats: Stats = { capital: c, risk: 100 - c, confidence: c, reputation: 100 - c };
        expect(findEnding(full(role, { stats }), NO_CARDS)).not.toBeNull();
      }
    }
  });

  it('兜底：活到收盘，各角色描述不同', () => {
    const descs = new Set<string>();
    for (const role of ROLE_IDS) {
      const e = findEnding(full(role, { stats: SKEWED }), NO_CARDS);
      expect(e).toBe(GENERIC_ENDINGS[role].survivor);
      expect(e?.title).toBe('活到收盘');
      descs.add(e?.description ?? '');
    }
    expect(descs.size).toBe(3);
  });

  it('稳如磐石：四条数值都在 35–65', () => {
    for (const role of ROLE_IDS) {
      const g = GENERIC_ENDINGS[role];
      expect(findEnding(full(role, {}), NO_CARDS)).toBe(g.balanced);
      expect(findEnding(full(role, { stats: { ...MID, capital: 35, reputation: 65 } }), NO_CARDS)).toBe(g.balanced);
      expect(findEnding(full(role, { stats: { ...MID, capital: 34 } }), NO_CARDS)).toBe(g.survivor);
      expect(findEnding(full(role, { stats: { ...MID, reputation: 66 } }), NO_CARDS)).toBe(g.survivor);
    }
  });

  it('行情亲历者：奇遇卡选择次数 >= 8，用 log 和 cards 统计', () => {
    const n = ENDING_THRESHOLDS.adventureCount;
    const advLog = (count: number): ChoiceLog[] => [
      ...alternating(FULL_TURN - count, 'day'),
      ...advCards.slice(0, count).map((card, i) => ({ cardId: card.id, side: (i % 2 === 0 ? 'left' : 'right') as Side })),
    ];
    for (const role of ROLE_IDS) {
      const g = GENERIC_ENDINGS[role];
      expect(findEnding(full(role, { log: advLog(n) }), advCards)).toBe(g.adventurer);
      expect(findEnding(full(role, { log: advLog(n - 1) }), advCards)).toBe(g.balanced);
      expect(findEnding(full(role, { log: advLog(n) }), NO_CARDS)).toBe(g.balanced);
    }
  });

  it('偏执专家：某标签占比 >= 30% 且总数 >= 12', () => {
    for (const role of ROLE_IDS) {
      const g = GENERIC_ENDINGS[role];
      expect(findEnding(full(role, { stats: SKEWED, tally: tallyOf({ cautious: 10, trend: 12 }) }), NO_CARDS)).toBe(g.obsessive);
      expect(
        findEnding(full(role, { stats: SKEWED, tally: tallyOf({ cautious: 4, trend: 4, passive: 4, research: 4 }) }), NO_CARDS),
      ).toBe(g.survivor);
      expect(findEnding(full(role, { stats: SKEWED, tally: tallyOf({ cautious: 10 }) }), NO_CARDS)).toBe(g.survivor);
    }
  });

  it('收盘优先级：行情亲历者 > 偏执专家 > 稳如磐石', () => {
    const tally = tallyOf({ cautious: 20 });
    const advLog = advCards.slice(0, 8).map((card, i) => ({ cardId: card.id, side: (i % 2 === 0 ? 'left' : 'right') as Side }));
    for (const role of ROLE_IDS) {
      const g = GENERIC_ENDINGS[role];
      expect(findEnding(full(role, { tally }), NO_CARDS)).toBe(g.obsessive);
      expect(findEnding(full(role, { tally, log: advLog }), advCards)).toBe(g.adventurer);
    }
  });
});

/** 安全阀：只用来防止测试死循环，不是游戏规则（游戏没有回合上限）。 */
const TEST_GUARD = 1000;

type Strategy = (state: GameState, rand: () => number, i: number) => Side;

const randomStrategy: Strategy = (_s, rand) => (rand() < 0.5 ? 'left' : 'right');

/** 选让四条数值更靠近 50 的一侧的“距离”。 */
function distanceFromMid(s: GameState, side: Side): number {
  return STAT_KEYS.reduce((sum, key) => sum + Math.abs(s.stats[key] + (s.current?.[side].effects[key] ?? 0) - 50), 0);
}

/** 连续 7 次同方向就强制换边，避开惯性思维（阈值 8）。 */
function avoidStreak(s: GameState, pick: Side): Side {
  const recent = s.log.slice(-(ENDING_THRESHOLDS.inertiaStreak - 1));
  const streak = recent.length === ENDING_THRESHOLDS.inertiaStreak - 1 && recent.every((e) => e.side === pick);
  return streak ? (pick === 'left' ? 'right' : 'left') : pick;
}

/** 尽量把四条数值拉回 50。用来证明稳如磐石 / 活到收盘可达。 */
const keepCentered: Strategy = (s) =>
  avoidStreak(s, distanceFromMid(s, 'left') <= distanceFromMid(s, 'right') ? 'left' : 'right');

/** 稳住数值的同时偏爱某个标签（代价不超过 30 点距离就选带标签的一侧）。用来证明偏执专家可达。 */
function centeredTagGreedy(tag: StyleTag): Strategy {
  return (s) => {
    const has = (side: Side): boolean => s.current?.[side].tags?.includes(tag) ?? false;
    let pick: Side = distanceFromMid(s, 'left') <= distanceFromMid(s, 'right') ? 'left' : 'right';
    if (has('left') !== has('right')) {
      const tagged: Side = has('left') ? 'left' : 'right';
      const other: Side = tagged === 'left' ? 'right' : 'left';
      if (distanceFromMid(s, tagged) <= distanceFromMid(s, other) + 30) pick = tagged;
    }
    return avoidStreak(s, pick);
  };
}

function play(role: RoleId, seed: number, strategy: Strategy, rand: () => number): GameState {
  let state = createGame(ALL_CARDS, seed, role);
  for (let i = 0; state.ending === null && i < TEST_GUARD; i += 1) state = choose(state, strategy(state, rand, i), ALL_CARDS);
  return state;
}

function quantile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

describe('蒙特卡洛：三个角色各 1500 局随机策略（ALL_CARDS）', () => {
  const GAMES = 1500;

  for (const role of ROLE_IDS) {
    it(`${role}：每局都在有限回合内结束（加时靠抖动 + 收盘铃），并打印结局占比`, () => {
      const rand = rng(20240601 + role.length * 7);
      const counts = new Map<string, number>();
      const lengths: number[] = [];

      for (let g = 0; g < GAMES; g += 1) {
        const state = play(role, g + 1, randomStrategy, rand);
        expect(state.ending).not.toBeNull();
        expect(state.current).toBeNull();
        expect(state.role).toBe(role);
        expect(state.turn).toBeLessThan(TEST_GUARD);
        if (state.turn <= OVERTIME_START) expect(state.jitter ?? null).toBeNull();
        // 收盘类结局只会在铃响时出现，而且此时没有任何数值在 0/100，文案和数字不矛盾
        if (state.ending?.kind === 'survive') {
          expect(state.turn).toBeGreaterThan(OVERTIME_START);
          for (const key of STAT_KEYS) {
            expect(state.stats[key]).toBeGreaterThan(0);
            expect(state.stats[key]).toBeLessThan(100);
          }
        }
        lengths.push(state.turn);
        const id = (state.ending as { id: string }).id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }

      lengths.sort((a, b) => a - b);
      const overtime = lengths.filter((t) => t > OVERTIME_START);
      const endings = getEndings(role);
      const pct = (n: number): string => `${((n / GAMES) * 100).toFixed(1)}%`;
      const rows = endings.map(
        (e) => `${e.special ? '特殊' : '普通'} ${e.id.padEnd(22)} ${e.title.padEnd(10, '　')} ${pct(counts.get(e.id) ?? 0)}`,
      );
      const specialCount = endings.filter((e) => e.special).reduce((s, e) => s + (counts.get(e.id) ?? 0), 0);
      const roleSpecialCount = ROLE_SPECIAL_ENDINGS[role].reduce((s, e) => s + (counts.get(e.id) ?? 0), 0);
      console.info(
        [
          `蒙特卡洛 ${role} ${GAMES} 局：局长中位数 ${quantile(lengths, 0.5)}，p90 ${quantile(lengths, 0.9)}，最长 ${lengths[lengths.length - 1]}；`
            + `进入加时 ${pct(overtime.length)}，加时局中位数 ${overtime.length > 0 ? quantile(overtime, 0.5) : '-'}`,
          ...rows,
          `普通结局合计 ${pct(GAMES - specialCount)}，特殊结局合计 ${pct(specialCount)}（其中角色专属 ${pct(roleSpecialCount)}）`,
        ].join('\n'),
      );

      // 加时确实会发生，且几乎所有局在 80 回合内结束
      expect(overtime.length).toBeGreaterThan(0);
      expect(quantile(lengths, 0.99)).toBeLessThanOrEqual(80);

      // 所有结局都在该角色的结局表里
      const known = new Set(endings.map((e) => e.id));
      for (const id of counts.keys()) expect(known.has(id)).toBe(true);
    });
  }

  it('四个收盘（survive）结局在模拟中都能出现', () => {
    const survive = new Set<string>();
    // 注：基金 / 炒股牌库奇遇卡多（各 20 张），收盘时几乎总先命中“行情亲历者”；偏执专家主要在 Web3 出现。
    const strategies: readonly Strategy[] = [randomStrategy, keepCentered, ...STYLE_TAGS.map((tag) => centeredTagGreedy(tag))];
    for (const role of ROLE_IDS) {
      const rand = rng(9001 + role.length);
      strategies.forEach((strategy) => {
        for (let g = 0; g < 100; g += 1) {
          const state = play(role, 90_000 + g, strategy, rand);
          expect(state.ending).not.toBeNull();
          if (state.ending?.kind === 'survive') survive.add(state.ending.id);
        }
      });
    }
    const expected = ['adventurer', 'obsessive', 'balanced', 'survivor'].map(
      (key) => GENERIC_ENDINGS.stock[key as keyof (typeof GENERIC_ENDINGS)['stock']].id,
    );
    for (const id of expected) expect(survive.has(id), `模拟中没出现 ${id}`).toBe(true);
  });
});
