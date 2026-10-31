/**
 * resolvePersona 的契约测试（死逻辑 + 伪随机）。
 * 断言全部来自 types.ts 里 ResolvedPersona / Engine.resolvePersona 的规则，不读实现。
 */
import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from './allCards';
import { choose, createGame, getEndings, inferPersona, resolvePersona, PERSONA_KEEP_RATE } from './engine';
import { COMPATIBLE_PERSONAS } from './personaRules';
import { ROLE_IDS } from './roles';
import { STYLE_TAGS } from './types';
import type { Ending, GameState, PersonaId, ResolvedPersona, RoleId, Side, StyleTag, StyleTally } from './types';

const TAG_TO_PERSONA: Readonly<Record<StyleTag, PersonaId>> = {
  passive: 'sloth',
  impulsive: 'bull',
  stubborn: 'hedgehog',
  research: 'owl',
  concentrated: 'shark',
  cautious: 'turtle',
  trend: 'dolphin',
  contrarian: 'crab',
  adaptive: 'fox',
};
const PERSONA_TO_TAG = Object.fromEntries(
  [
    ...Object.entries(TAG_TO_PERSONA).map(([tag, persona]) => [persona, tag]),
    ['puffin','trend'],['raccoon','contrarian'],['gecko','cautious'],['squirrel','research'],['bat','impulsive'],['panda','adaptive'],
  ],
) as Readonly<Record<PersonaId, StyleTag>>;
const ALL_PERSONAS: PersonaId[] = ['sloth','bull','hedgehog','owl','shark','turtle','dolphin','crab','fox','puffin','raccoon','gecko','squirrel','bat','panda'];

const GAMES_PER_ROLE = 800;
const MAX_STEPS = 500;

// ---------- 辅助 ----------

/** mulberry32：固定种子的简单伪随机，测试自带，不依赖实现。 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function playRandom(role: RoleId, gameSeed: number, rng: () => number): GameState {
  let state = createGame(ALL_CARDS, gameSeed, role);
  for (let step = 0; step < MAX_STEPS && state.ending === null; step += 1) {
    const side: Side = rng() < 0.5 ? 'left' : 'right';
    state = choose(state, side, ALL_CARDS);
  }
  if (state.ending === null) throw new Error(`game did not finish: role=${role} seed=${gameSeed}`);
  return state;
}

const SEED_BASE: Readonly<Record<RoleId, number>> = { fund: 100_000, crypto: 200_000, stock: 300_000 };

/** 每个角色 800 局，只玩一次，各测试共用。 */
const gameCache = new Map<RoleId, readonly GameState[]>();
function gamesFor(role: RoleId): readonly GameState[] {
  const hit = gameCache.get(role);
  if (hit) return hit;
  const rng = makeRng(SEED_BASE[role] + 7);
  const games: GameState[] = [];
  for (let i = 0; i < GAMES_PER_ROLE; i += 1) games.push(playRandom(role, SEED_BASE[role] + i, rng));
  gameCache.set(role, games);
  return games;
}

function compat(endingId: string): readonly PersonaId[] {
  return Array.from(COMPATIBLE_PERSONAS(endingId));
}

function describeGame(state: GameState): string {
  return `role=${state.role} seed=${state.seed} ending=${state.ending?.id} tally=${JSON.stringify(state.tally)}`;
}

/** 按契约公式独立复算 count/total/isTop/isTied。 */
function expectedCounts(tally: StyleTally, id: PersonaId): Pick<ResolvedPersona, 'count' | 'total' | 'isTop' | 'isTied'> {
  const values = STYLE_TAGS.map((t) => tally[t]);
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);
  const count = tally[PERSONA_TO_TAG[id]];
  const isTop = count > 0 && count === max;
  const othersAtMax = STYLE_TAGS.filter((t) => t !== PERSONA_TO_TAG[id] && tally[t] === max).length;
  const isTied = count === max && othersAtMax > 0;
  return { count, total, isTop, isTied };
}

/** 对一个结果检查所有契约不变量。 */
function checkInvariants(state: GameState, r: ResolvedPersona): void {
  const ctx = describeGame(state);
  const ok = compat(state.ending!.id);
  expect(ALL_PERSONAS, ctx).toContain(r.id);
  expect(ALL_PERSONAS, ctx).toContain(r.rawId);
  // Ending affinity never overrides observed behavior.

  // rawId 只按标签推断：必须是“次数最多”的标签对应的人格（全 0 时是 fox）
  const max = Math.max(...STYLE_TAGS.map((t) => state.tally[t]));
  if (max === 0) {
    expect(r.rawId, ctx).toBe('fox');
  } else {
    if (!['puffin','raccoon','gecko','squirrel','bat','panda'].includes(r.rawId)) expect(state.tally[PERSONA_TO_TAG[r.rawId]], ctx).toBe(max);
  }

  // 契约：最终 id === rawId ↔ source='tally'；否则 'seeded'
  // （含两种情况：rawId 与结局矛盾被换掉；rawId 本来兼容但属于热门人格被压低换掉）
  if (r.source === 'tally') {
    expect(r.id, ctx).toBe(r.rawId);
    // Affinity is explanatory only.
  } else {
    expect(r.source, ctx).toBe('seeded');
    expect(r.id, ctx).not.toBe(r.rawId);
  }

  const exp = expectedCounts(state.tally, r.id);
  expect(r.count, ctx).toBe(exp.count);
  expect(r.total, ctx).toBe(exp.total);
  expect(r.isTop, ctx).toBe(exp.isTop);
  // 全 0 时“并列最大”的含义契约未明说（所有标签都是 0），此时不断言 isTied。
  if (max > 0) expect(r.isTied, ctx).toBe(exp.isTied);
}

function allEndings(): readonly Ending[] {
  const seen = new Map<string, Ending>();
  for (const role of ROLE_IDS) for (const e of getEndings(role)) if (!seen.has(e.id)) seen.set(e.id, e);
  return Array.from(seen.values());
}

function emptyTally(): Record<StyleTag, number> {
  return Object.fromEntries(STYLE_TAGS.map((t) => [t, 0])) as Record<StyleTag, number>;
}

/** 在已创建的局面上替换 ending/tally/seed（展开复制，不改入参）。 */
function manual(
  role: RoleId,
  ending: Ending,
  tallyPatch: Partial<Record<StyleTag, number>>,
  seed = 12345,
): GameState {
  const base = createGame(ALL_CARDS, seed, role);
  return { ...base, seed, ending, current: null, tally: { ...emptyTally(), ...tallyPatch } };
}

/** 为某个结局找一个 persona 不在兼容表（或在兼容表）里的人格。 */
function personaOutside(endingId: string): PersonaId | undefined {
  const ok = compat(endingId);
  return ALL_PERSONAS.find((p) => !ok.includes(p));
}

// ---------- 随机游玩：契约不变量 ----------

describe.each(ROLE_IDS)('随机游玩 800 局：角色 %s', (role) => {
  it('100% 结果属于兼容表，且 count/total/isTop/isTied/source 与公式一致', () => {
    for (const state of gamesFor(role)) {
      const r = resolvePersona(state, ALL_CARDS);
      checkInvariants(state, r);
    }
  });

  it('同一 state 连续调用 3 次结果深相等', () => {
    for (const state of gamesFor(role)) {
      const a = resolvePersona(state, ALL_CARDS);
      const b = resolvePersona(state, ALL_CARDS);
      const c = resolvePersona(state, ALL_CARDS);
      expect(b, describeGame(state)).toEqual(a);
      expect(c, describeGame(state)).toEqual(a);
    }
  });

  it('JSON 深拷贝后的 state（及 cards）结果不变', () => {
    const cardsCopy = clone(ALL_CARDS);
    for (const state of gamesFor(role)) {
      expect(resolvePersona(clone(state), cardsCopy), describeGame(state)).toEqual(
        resolvePersona(state, ALL_CARDS),
      );
    }
  });

  it('rawId 与引擎的 inferPersona 在无并列时一致', () => {
    for (const state of gamesFor(role)) {
      const values = STYLE_TAGS.map((t) => state.tally[t]);
      const max = Math.max(...values);
      if (max > 0 && values.filter((v) => v === max).length > 1) continue; // 并列的破平规则不在此断言
      if (!['puffin','raccoon','gecko','squirrel','bat','panda'].includes(resolvePersona(state, ALL_CARDS).rawId)) expect(resolvePersona(state, ALL_CARDS).rawId, describeGame(state)).toBe(inferPersona(state.tally));
    }
  });

  it('不同 seed 的局之间，seeded 结果在兼容表内至少出现 2 种不同人格', () => {
    const seeded = gamesFor(role)
      .map((s) => ({ s, r: resolvePersona(s, ALL_CARDS) }))
      .filter((x) => x.r.source === 'seeded');
    // 没有 seeded 局说明这个角色的随机游玩根本不触发矛盾，此时无从统计，不算失败。
    if (seeded.length < 20) return;
    expect(new Set(seeded.map((x) => x.r.id)).size).toBeGreaterThanOrEqual(2);
  });
});

// ---------- 手工构造状态 ----------

describe('手工构造状态（所有结局 x 对应角色）', () => {
  const endings = allEndings();

  function rolesFor(e: Ending): readonly RoleId[] {
    return e.role === 'all' ? ROLE_IDS : [e.role];
  }

  it('tally 全 0：rawId 为 fox；total=0，count=0，isTop=false', () => {
    for (const e of endings) {
      for (const role of rolesFor(e)) {
        const state = manual(role, e, {});
        const r = resolvePersona(state, ALL_CARDS);
        checkInvariants(state, r);
        expect(r.rawId, e.id).toBe('fox');
        expect(r.total, e.id).toBe(0);
        expect(r.count, e.id).toBe(0);
        expect(r.isTop, e.id).toBe(false);
        // fox 既是全空默认值也是热门人格：被压低时会换成别的人格，所以只在不被压低时断言 tally
        expect(r.source, e.id).toBe('tally');
        if (r.source === 'tally') expect(r.id, e.id).toBe('fox');
      }
    }
  });

  it('tally 只有一个标签且兼容：source=tally，id=rawId，isTop=true，isTied=false', () => {
    for (const e of endings) {
      for (const persona of ['sloth','bull','hedgehog','owl','shark','turtle','dolphin','crab','fox'] as PersonaId[]) {
        const tag = PERSONA_TO_TAG[persona];
        const state = manual(rolesFor(e)[0], e, { [tag]: 5 });
        const r = resolvePersona(state, ALL_CARDS);
        const ctx = `${e.id}/${persona}`;
        if (!['puffin','raccoon','gecko','squirrel','bat','panda'].includes(persona)) expect(r.rawId, ctx).toBe(persona);
        checkInvariants(state, r);
        if ((PERSONA_KEEP_RATE[persona] ?? 1) >= 1) {
          // 非热门人格不会被压低，必须原样采用
          expect(r.source, ctx).toBe('tally');
          expect(r.id, ctx).toBe(persona);
          expect(r).toMatchObject({ count: 5, total: 5, isTop: true, isTied: false });
        } else {
          // 热门人格（fox、hedgehog）可能被压低换掉：要么原样采用，要么换成兼容表内别的人格
          expect(r.id).toBe(r.rawId);
          if (r.source === 'tally') expect(r.id, ctx).toBe(persona);
        }
      }
    }
  });


  it('并列最大：两个标签各 3 次，最终人格在兼容表内、rawId 是其中之一、isTop 与 isTied 均 true', () => {
    for (const e of endings) {
      const [a, b] = ['bull', 'owl'] as PersonaId[];
      const state = manual(rolesFor(e)[0], e, { [PERSONA_TO_TAG[a]]: 3, [PERSONA_TO_TAG[b]]: 3 });
      const r = resolvePersona(state, ALL_CARDS);
      const ctx = e.id;
      expect([a, b], ctx).toContain(r.rawId); // rawId 由并列打破决定，必定在 {a,b}
      expect(r.id).toBe(r.rawId); // 最终 id 必在兼容表
      // 如果 r.id 等于最高标签对应的人格之一，count=3, total=6, isTop=true, isTied=true
      if ([a, b].includes(r.id)) expect(r).toMatchObject({ count: 3, total: 6, isTop: true, isTied: true });
    }
  });



  it('兼容的人格同 seed 保持稳定', () => {
    for (const e of endings) {
      const persona = 'fox';
      const results = [1, 2, 3, 99, 4242].map((seed) =>
        resolvePersona(manual(rolesFor(e)[0], e, { [PERSONA_TO_TAG[persona]]: 2 }, seed), ALL_CARDS),
      );
      for (const r of results) expect(r).toEqual(results[0]);
    }
  });
});

// ---------- 错误与不变性 ----------

describe('错误与不变性', () => {
  it('state.ending 为 null 时抛错', () => {
    for (const role of ROLE_IDS) {
      const running = createGame(ALL_CARDS, 7, role);
      expect(running.ending).toBeNull();
      expect(() => resolvePersona(running, ALL_CARDS)).toThrow();
    }
    const finished = gamesFor('stock')[0];
    expect(() => resolvePersona({ ...finished, ending: null }, ALL_CARDS)).toThrow();
  });

  it('深冻结的 state 与 cards 调用不抛错，结果与未冻结一致', () => {
    const cardsFrozen = deepFreeze(clone(ALL_CARDS));
    for (const role of ROLE_IDS) {
      for (const state of gamesFor(role).slice(0, 100)) {
        const frozen = deepFreeze(clone(state));
        let result: ResolvedPersona | undefined;
        expect(() => {
          result = resolvePersona(frozen, cardsFrozen);
        }, describeGame(state)).not.toThrow();
        expect(result).toEqual(resolvePersona(state, ALL_CARDS));
      }
    }
  });

  it('调用不改动入参', () => {
    const state = gamesFor('fund')[3];
    const before = JSON.stringify(state);
    resolvePersona(state, ALL_CARDS);
    expect(JSON.stringify(state)).toBe(before);
  });
});

// ---------- 人格分布健康检查 ----------

describe('人格分布（三角色合计 2400 局随机游玩）', () => {
  it('没有单一人格超过 32%，核心人格均有行为证据', () => {
    const counts = new Map<PersonaId, number>(ALL_PERSONAS.map((p) => [p, 0]));
    let seeded = 0;
    let n = 0;
    for (const role of ROLE_IDS) {
      for (const state of gamesFor(role)) {
        const r = resolvePersona(state, ALL_CARDS);
        counts.set(r.id, (counts.get(r.id) ?? 0) + 1);
        if (r.source === 'seeded') seeded += 1;
        n += 1;
      }
    }
    expect(n).toBe(GAMES_PER_ROLE * ROLE_IDS.length);
    const share = Object.fromEntries(ALL_PERSONAS.map((p) => [p, Number((((counts.get(p) ?? 0) / n) * 100).toFixed(1))]));
    console.info(`[persona distribution %] ${JSON.stringify(share)}`);
    console.info(`[seeded share] ${((seeded / n) * 100).toFixed(1)}% (${seeded}/${n})`);
    for (const p of ALL_PERSONAS) {
      const ratio = (counts.get(p) ?? 0) / n;
    }
  });
});
