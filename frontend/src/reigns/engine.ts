import { ENDINGS, GENERIC_ENDINGS, ROLE_SPECIAL_ENDINGS, findEnding, getEndings } from './endings';
import { OVERTIME_START, STAT_KEYS, STYLE_TAGS } from './types';
import { COMPATIBLE_PERSONAS } from './personaRules';
import type {
  Card, ChoiceLog, Effects, GameState, PersonaId, ResolvedPersona, RoleId, Side, StatKey, Stats, StyleTag, StyleTally,
} from './types';

/** 结局表从 endings.ts 原样转出：ENDINGS[role][stat][low|high]、getEndings(role) 等。 */
export { ENDINGS, GENERIC_ENDINGS, ROLE_SPECIAL_ENDINGS, getEndings };

export const INITIAL_STAT = 50;
export const STAT_MIN = 0;
export const STAT_MAX = 100;

/** 简单的确定性 PRNG（mulberry32），返回 [0, 1) 的函数。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates 洗牌，返回新数组，不改入参。 */
function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * PandaAI 事件卡的洗牌权重：越大越容易排到牌堆前面（一局里更早、更大概率遇到）。
 * 1 = 和普通卡一样。用加权随机排序（Efraimidis–Spirakis：key = u^(1/w)，按 key 从大到小）。
 */
export const PANDAAI_WEIGHT = 4;

/** 把卡牌洗成 id 队列。牌库里没有 pandaai 卡时退回普通 Fisher–Yates，保持原有顺序语义。 */
function shuffleIds(cards: readonly Card[], rand: () => number): string[] {
  if (!cards.some((card) => card.pandaai)) return shuffle(cards.map((card) => card.id), rand);
  return cards
    .map((card) => ({ id: card.id, key: Math.pow(rand(), 1 / (card.pandaai ? PANDAAI_WEIGHT : 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.id);
}

/** 只保留该角色能抽到的卡：roles 省略（共享）或包含该角色。 */
function cardsForRole(cards: readonly Card[], role: RoleId): readonly Card[] {
  return cards.filter((card) => card.roles === undefined || card.roles.includes(role));
}

function clamp(value: number): number {
  return Math.min(STAT_MAX, Math.max(STAT_MIN, value));
}

function applyEffects(stats: Stats, effects: Effects): Stats {
  const next = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) {
    next[key] = clamp(stats[key] + (effects[key] ?? 0));
  }
  return next;
}

function emptyTally(): StyleTally {
  const tally = {} as Record<StyleTag, number>;
  for (const tag of STYLE_TAGS) tally[tag] = 0;
  return tally;
}

function addTags(tally: StyleTally, tags: readonly StyleTag[] | undefined): StyleTally {
  const next = { ...tally } as Record<StyleTag, number>;
  for (const tag of tags ?? []) next[tag] += 1;
  return next;
}

/**
 * 加时“市场抖动”：第 k 个加时回合（turn = OVERTIME_START + k）随机改 1–2 条属性，正负随机，
 * 每条幅度在 [0.7, 1] × min(cap, base + k) 之间取整。只由本局 seed 与 turn 决定，不碰发牌用的随机数。
 */
export const OVERTIME_JITTER = { base: 3, cap: 25 } as const;

/**
 * 收盘铃：第 k 个加时回合铃响的概率 = min(1, start + step × (k - 1))。
 * 铃响就按“收盘结局”（行情亲历者 > 偏执专家 > 稳如磐石 > 活到收盘）收尾。
 * 由 3000 局 × 3 角色随机游玩校准：进入加时的局，结束回合中位数约 47–48、p99 约 60–62，
 * 实测最长 69 回合（多数加时局其实是被抖动推到触底/爆满）。概率在加时第 166 回合到 1，
 * 只为保证必然终止，实际几乎碰不到；它不是回合上限。
 */
export const CLOSING_BELL = { start: 0.01, step: 0.006 } as const;

const JITTER_SALT = 0x6a09e667;
const BELL_SALT = 0xbb67ae85;

/** 加时专用的独立随机流：由 seed、turn、salt 派生，不影响洗牌。 */
function overtimeRand(seed: number, turn: number, salt: number): () => number {
  const mixed = (Math.imul(seed >>> 0, 0x27d4eb2d) ^ Math.imul(turn + 1, 0x165667b1) ^ salt) >>> 0;
  const rand = mulberry32(mixed);
  rand(); // 丢掉第一个数，让相近的种子更快散开
  return rand;
}

/** 第 turn 回合附加的原始抖动（未夹到 0–100）；非加时回合返回空对象。纯函数、确定性。 */
export function overtimeJitter(seed: number, turn: number): Effects {
  const k = turn - OVERTIME_START;
  if (k <= 0) return {};
  const rand = overtimeRand(seed, turn, JITTER_SALT);
  const amplitude = Math.min(OVERTIME_JITTER.cap, OVERTIME_JITTER.base + k);
  const count = rand() < 0.5 ? 1 : 2;
  const keys = shuffle(STAT_KEYS, rand).slice(0, count);
  return Object.fromEntries(
    keys.map((key) => {
      const size = Math.max(1, Math.round(amplitude * (0.7 + 0.3 * rand())));
      return [key, rand() < 0.5 ? -size : size];
    }),
  ) as Effects;
}

/** 第 turn 回合收盘铃响的概率；非加时回合为 0。 */
export function closingBellChance(turn: number): number {
  const k = turn - OVERTIME_START;
  if (k <= 0) return 0;
  return Math.min(1, CLOSING_BELL.start + CLOSING_BELL.step * (k - 1));
}

/** 第 turn 回合收盘铃是否响（由 seed 与 turn 决定，确定性）。 */
export function rollClosingBell(seed: number, turn: number): boolean {
  const chance = closingBellChance(turn);
  if (chance <= 0) return false;
  return overtimeRand(seed, turn, BELL_SALT)() < chance;
}

/** before → after 实际变化的项（夹值后），没有变化返回 null。 */
function statDelta(before: Stats, after: Stats): Effects | null {
  const entries = STAT_KEYS.filter((key) => after[key] !== before[key]).map((key) => [key, after[key] - before[key]] as const);
  return entries.length === 0 ? null : (Object.fromEntries(entries) as Effects);
}

/** 由当前局面推出重洗用的种子，保证 choose 仍是纯函数且可复现。 */
function reshuffleSeed(state: GameState, cardCount: number): number {
  const statSum = STAT_KEYS.reduce((sum, key) => sum + state.stats[key], 0);
  return (Math.imul(state.turn + 1, 0x9e3779b1) ^ Math.imul(statSum + 1, 0x85ebca6b) ^ cardCount) >>> 0;
}

/** 从队列抽下一张；队列空则重洗全部卡牌，并避免与刚打出的牌相同。 */
function drawNext(
  deck: readonly string[],
  cards: readonly Card[],
  currentId: string | null,
  seed: number,
): { readonly card: Card; readonly deck: readonly string[] } {
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  let queue = deck.filter((id) => byId.has(id));
  if (queue.length === 0) {
    queue = shuffleIds(cards, mulberry32(seed));
    if (queue.length > 1 && queue[0] === currentId) {
      queue = [...queue.slice(1, 2), queue[0], ...queue.slice(2)];
    }
  }
  const [firstId, ...rest] = queue;
  return { card: byId.get(firstId) as Card, deck: rest };
}

export function createGame(allCards: readonly Card[], seed?: number, role: RoleId = 'stock'): GameState {
  const cards = cardsForRole(allCards, role);
  if (cards.length === 0) {
    throw new Error(`createGame: 角色 ${role} 没有可用的卡牌`);
  }
  const gameSeed = seed ?? Math.floor(Math.random() * 4294967296);
  const rand = mulberry32(gameSeed);
  const ids = shuffleIds(cards, rand);
  const { card, deck } = drawNext(ids, cards, null, 0);
  return {
    role,
    seed: gameSeed,
    stats: { capital: INITIAL_STAT, risk: INITIAL_STAT, confidence: INITIAL_STAT, reputation: INITIAL_STAT },
    turn: 0,
    current: card,
    deck,
    ending: null,
    tally: emptyTally(),
    log: [],
    lastAftermath: null,
    jitter: null,
  };
}

export function choose(state: GameState, side: Side, allCards: readonly Card[]): GameState {
  if (state.ending !== null || state.current === null) return state;
  const cards = cardsForRole(allCards, state.role);
  if (cards.length === 0) {
    throw new Error(`choose: 角色 ${state.role} 没有可用的卡牌`);
  }

  const choice = state.current[side];
  const afterChoice = applyEffects(state.stats, choice.effects);
  const turn = state.turn + 1;
  // 加时：在玩家选项之后再叠一次市场抖动（非加时回合 overtimeJitter 为空，stats 不变）
  const stats = applyEffects(afterChoice, overtimeJitter(state.seed, turn));
  const jitter = turn > OVERTIME_START ? statDelta(afterChoice, stats) : null;
  const closingBell = rollClosingBell(state.seed, turn);
  const tally = addTags(state.tally, choice.tags);
  const log = [...state.log, { cardId: state.current.id, side }];
  const lastAftermath = choice.aftermath ?? null;
  const base = { role: state.role, seed: state.seed, stats, turn, tally, log, lastAftermath, jitter };

  const ending = findEnding({ role: state.role, stats, turn, log, tally, closingBell }, cards);
  if (ending !== null) {
    return { ...base, current: null, deck: state.deck, ending };
  }

  // 重洗种子用抖动前的数值，保证加时抖动不改变发牌顺序
  const { card, deck } = drawNext(
    state.deck,
    cards,
    state.current.id,
    reshuffleSeed({ ...state, stats: afterChoice, turn }, cards.length),
  );
  return { ...base, current: card, deck, ending: null };
}

export function previewEffects(state: GameState, side: Side): readonly StatKey[] {
  if (state.current === null) return [];
  const effects = state.current[side].effects;
  return STAT_KEYS.filter((key) => (effects[key] ?? 0) !== 0);
}

/** 风格标签 → 人物卡 id。 */
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

/** 在 log 中从后往前找，返回候选标签里最近出现的那个；找不到返回 null。 */
function mostRecentTag(
  candidates: readonly StyleTag[],
  log: readonly ChoiceLog[],
  cards: readonly Card[],
): StyleTag | null {
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entry = log[i];
    const tags = byId.get(entry.cardId)?.[entry.side].tags ?? [];
    const hit = tags.find((tag) => candidates.includes(tag));
    if (hit !== undefined) return hit;
  }
  return null;
}

/**
 * 由风格标签累计推出人物卡：取次数最多的标签。
 * 并列时用种子在并列的标签里随机选（保证同一局不变）；tally 全 0 返回 'fox'（灵活狐狸）。
 */
export function inferPersona(
  tally: StyleTally,
  log?: readonly ChoiceLog[],
  cards?: readonly Card[],
  seed?: number,
): PersonaId {
  const max = Math.max(...STYLE_TAGS.map((tag) => tally[tag]));
  if (max <= 0) return 'fox';
  const top = STYLE_TAGS.filter((tag) => tally[tag] === max);
  if (top.length === 1) return TAG_TO_PERSONA[top[0]];
  // 并列：用种子在并列的标签里随机选，没有种子就用"最近标签"打破（向后兼容）
  if (seed !== undefined) {
    const rand = mulberry32((seed >>> 0) ^ 0xabcdef01);
    rand(); // 丢掉第一个数
    const idx = Math.floor(rand() * top.length);
    return TAG_TO_PERSONA[top[idx]];
  }
  const pick = log !== undefined && cards !== undefined ? mostRecentTag(top, log, cards) : null;
  return TAG_TO_PERSONA[pick ?? top[0]];
}

/** 人物卡 id → 风格标签（TAG_TO_PERSONA 的反向表，避免重复手写映射）。 */
const PERSONA_TO_TAG: Readonly<Record<PersonaId, StyleTag>> = Object.fromEntries(
  (Object.entries(TAG_TO_PERSONA) as [StyleTag, PersonaId][]).map(([tag, persona]) => [persona, tag]),
) as Record<PersonaId, StyleTag>;

/** FNV-1a 字符串哈希，用来把结局 id 混进种子。 */
function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** 在兼容表里按 1 + 标签次数加权，用“种子 + 结局 id”的伪随机选一个。 */
function pickSeeded(
  compatible: readonly PersonaId[],
  tally: StyleTally,
  seed: number,
  endingId: string,
): PersonaId {
  const mixed = (Math.imul(seed >>> 0, 0x9e3779b1) ^ hashString(endingId)) >>> 0;
  const rand = mulberry32(mixed);
  rand(); // 丢掉第一个数，让相近的种子更快散开
  const weights = compatible.map((id) => 1 + tally[PERSONA_TO_TAG[id]]);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < compatible.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return compatible[i];
  }
  return compatible[compatible.length - 1];
}

/**
 * 压低热门人格：这些人格在随机游玩下占比偏高（卡牌池里 adaptive、stubborn 标签偏多），
 * 命中时以“1 - 保留率”的概率被换成同结局兼容的别的人格，换谁用本局种子决定，同一局稳定。
 * 保留率由 4500 局随机游玩校准：fox 0.55、hedgehog 0.74，其余不动；
 * 校准后 9 个人格占比约 6%-15%（原来 fox 25%）。换牌后按 seeded 处理，文案不会谎称是选择次数。
 */
export const PERSONA_KEEP_RATE: Readonly<Partial<Record<PersonaId, number>>> = {
  fox: 0.55,
  hedgehog: 0.74,
};

function rebalancePersona(
  base: PersonaId,
  compatible: readonly PersonaId[],
  tally: StyleTally,
  seed: number,
  endingId: string,
): PersonaId {
  const keep = PERSONA_KEEP_RATE[base] ?? 1;
  if (keep >= 1) return base;
  const mixed = (Math.imul(seed >>> 0, 0x85ebca6b) ^ hashString(endingId) ^ 0x5bd1e995) >>> 0;
  const rand = mulberry32(mixed);
  rand(); // 丢掉第一个数
  if (rand() < keep) return base;
  const others = compatible.filter((id) => id !== base);
  if (others.length === 0) return base;
  // 换谁：按 1 + 标签次数加权，再乘各人格自己的保留率，避免又把热门人格抽回来
  const weights = others.map((id) => (1 + tally[PERSONA_TO_TAG[id]]) * (PERSONA_KEEP_RATE[id] ?? 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < others.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return others[i];
  }
  return others[others.length - 1];
}

/**
 * 结局页用的最终交易人格（规则见 types.ts 的 ResolvedPersona）：
 * 标签推断的人格在结局兼容表里就直接用，否则在兼容表里按种子做加权伪随机。纯函数、同一局结果不变。
 */
export function resolvePersona(state: GameState, cards: readonly Card[]): ResolvedPersona {
  if (state.ending === null) {
    throw new Error('resolvePersona: 游戏还没结束（state.ending 为空）');
  }
  const compatible = COMPATIBLE_PERSONAS(state.ending.id);
  const rawId = inferPersona(state.tally, state.log, cards, state.seed);
  const picked = compatible.includes(rawId)
    ? rawId
    : pickSeeded(compatible, state.tally, state.seed, state.ending.id);
  const id = rebalancePersona(picked, compatible, state.tally, state.seed, state.ending.id);
  // 只要最终人格不是“标签直接推出的那个”，就算 seeded（含压低热门人格造成的换牌）
  const fromTally = id === rawId;

  const counts = STYLE_TAGS.map((tag) => state.tally[tag]);
  const max = Math.max(...counts);
  const count = state.tally[PERSONA_TO_TAG[id]];
  const isTop = count > 0 && count === max;
  const isTied = isTop && counts.filter((n) => n === max).length > 1;
  return {
    id,
    rawId,
    source: fromTally ? 'tally' : 'seeded',
    count,
    total: counts.reduce((sum, n) => sum + n, 0),
    isTop,
    isTied,
  };
}
