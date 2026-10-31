import { ENDINGS, GENERIC_ENDINGS, ROLE_SPECIAL_ENDINGS, findEnding, getEndings } from './endings';
import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, ChoiceLog, Effects, GameState, PersonaId, RoleId, Side, StatKey, Stats, StyleTag, StyleTally } from './types';

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
    queue = shuffle(
      cards.map((card) => card.id),
      mulberry32(seed),
    );
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
  const rand = mulberry32(seed ?? Math.floor(Math.random() * 4294967296));
  const ids = shuffle(
    cards.map((card) => card.id),
    rand,
  );
  const { card, deck } = drawNext(ids, cards, null, 0);
  return {
    role,
    stats: { capital: INITIAL_STAT, risk: INITIAL_STAT, confidence: INITIAL_STAT, reputation: INITIAL_STAT },
    turn: 0,
    current: card,
    deck,
    ending: null,
    tally: emptyTally(),
    log: [],
    lastAftermath: null,
  };
}

export function choose(state: GameState, side: Side, allCards: readonly Card[]): GameState {
  if (state.ending !== null || state.current === null) return state;
  const cards = cardsForRole(allCards, state.role);
  if (cards.length === 0) {
    throw new Error(`choose: 角色 ${state.role} 没有可用的卡牌`);
  }

  const choice = state.current[side];
  const stats = applyEffects(state.stats, choice.effects);
  const turn = state.turn + 1;
  const tally = addTags(state.tally, choice.tags);
  const log = [...state.log, { cardId: state.current.id, side }];
  const lastAftermath = choice.aftermath ?? null;

  const ending = findEnding({ role: state.role, stats, turn, log, tally }, cards);
  if (ending !== null) {
    return { role: state.role, stats, turn, current: null, deck: state.deck, ending, tally, log, lastAftermath };
  }

  const { card, deck } = drawNext(
    state.deck,
    cards,
    state.current.id,
    reshuffleSeed({ ...state, stats, turn }, cards.length),
  );
  return { role: state.role, stats, turn, current: card, deck, ending: null, tally, log, lastAftermath };
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
 * 并列时取 log 中最近出现的那个标签（需同时传 log 和 cards）；查不到则按 STYLE_TAGS 顺序取第一个。
 * tally 全 0 返回 'fox'（灵活狐狸）。
 */
export function inferPersona(
  tally: StyleTally,
  log?: readonly ChoiceLog[],
  cards?: readonly Card[],
): PersonaId {
  const max = Math.max(...STYLE_TAGS.map((tag) => tally[tag]));
  if (max <= 0) return 'fox';
  const top = STYLE_TAGS.filter((tag) => tally[tag] === max);
  const pick = top.length > 1 && log !== undefined && cards !== undefined ? mostRecentTag(top, log, cards) : null;
  return TAG_TO_PERSONA[pick ?? top[0]];
}
