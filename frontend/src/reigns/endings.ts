import { MAX_TURNS, STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, ChoiceLog, Ending, EndingKind, StatKey, Stats, StyleTally } from './types';

const STAT_FLOOR = 0;
const STAT_CEIL = 100;

/** 八个普通结局：每条数值的 low / high 各一个。 */
export const ENDINGS: Readonly<Record<StatKey, Readonly<Record<EndingKind, Ending>>>> = {
  capital: {
    low: {
      id: 'low-capital',
      stat: 'capital',
      kind: 'low',
      title: '爆仓离场',
      description: '账户资金归零，风控线早被甩在身后。你默默关掉软件，决定先去找份稳定的工作。',
      special: false,
    },
    high: {
      id: 'high-capital',
      stat: 'capital',
      kind: 'high',
      title: '财富自由',
      description: '账户数字大到不真实。你选择急流勇退，把交易软件卸载，去环游世界。',
      special: false,
    },
  },
  risk: {
    low: {
      id: 'low-risk',
      stat: 'risk',
      kind: 'low',
      title: '风控失守',
      description: '仓位、杠杆、止损全都形同虚设。一次普通的波动，就把你的账户冲得七零八落。',
      special: false,
    },
    high: {
      id: 'high-risk',
      stat: 'risk',
      kind: 'high',
      title: '畏手畏脚',
      description: '风控规矩多到寸步难行，机会一次次从眼前溜走。你成了团队里最安全、也最没业绩的人。',
      special: false,
    },
  },
  confidence: {
    low: {
      id: 'low-confidence',
      stat: 'confidence',
      kind: 'low',
      title: '心态崩盘',
      description: '连续的打击让你再也不敢按下下单键。你决定先放下盘面，好好睡几天。',
      special: false,
    },
    high: {
      id: 'high-confidence',
      stat: 'confidence',
      kind: 'high',
      title: '盲目自信',
      description: '你觉得自己看穿了市场，不再复盘也不再设止损。市场很快给你上了一课。',
      special: false,
    },
  },
  reputation: {
    low: {
      id: 'low-reputation',
      stat: 'reputation',
      kind: 'low',
      title: '口碑扫地',
      description: '圈子里再没人愿意和你交流，群聊把你悄悄移了出去。你只能一个人面对屏幕。',
      special: false,
    },
    high: {
      id: 'high-reputation',
      stat: 'reputation',
      kind: 'high',
      title: '被捧上神坛',
      description: '大家都等着你喊单，你被迫营业，再也没法安静地做自己的交易。',
      special: false,
    },
  },
};

/** 特殊结局（id 以 sp- 开头）。 */
export const SPECIAL_ENDINGS = {
  /** 中途：最近 INERTIA_STREAK 次滑动方向完全一致。 */
  inertia: {
    id: 'sp-inertia',
    stat: null,
    kind: 'special',
    title: '惯性思维',
    description: '你一路往同一个方向滑，连自己都没发觉。市场一个转弯，你还在直线前进。',
    special: true,
  },
  /** 中途：资金与信心同时很高，但都没到 100。 */
  euphoria: {
    id: 'sp-euphoria',
    stat: null,
    kind: 'special',
    title: '飘飘然',
    description: '账户红彤彤，心情美滋滋。你开始觉得，市场好像是自家后花园。就在这时，你关掉了软件。',
    special: true,
  },
  /** 中途：风控很低，资金却很高。 */
  knifeEdge: {
    id: 'sp-knife-edge',
    stat: null,
    kind: 'special',
    title: '刀尖起舞',
    description: '仓位压到极限，账户却漂亮得惊人。你站在悬崖边上跳舞，朋友们都不敢看。',
    special: true,
  },
  /** 走满：某一种风格标签占比很高。 */
  obsessive: {
    id: 'sp-obsessive',
    stat: null,
    kind: 'survive',
    title: '偏执专家',
    description: '四十回合下来，你把同一套打法用到了极致。在你的领域里无人能敌，只是那个领域有点窄。',
    special: true,
  },
  /** 走满：奇遇卡选择次数足够多。 */
  adventurer: {
    id: 'sp-adventurer',
    stat: null,
    kind: 'survive',
    title: '行情亲历者',
    description: '大涨、急跌、假突破，你都在现场。别人看的是 K 线，你经历的是故事。',
    special: true,
  },
  /** 走满：四条数值都在均衡区间。 */
  balanced: {
    id: 'sp-balanced',
    stat: null,
    kind: 'survive',
    title: '稳如磐石',
    description: '资金、风控、信心、口碑都在中间地带，四十回合风平浪静。你就是那个让人放心的人。',
    special: true,
  },
  /** 走满：兜底存活结局。 */
  survivor: {
    id: 'sp-survivor',
    stat: null,
    kind: 'survive',
    title: '活到收盘',
    description: '没有爆仓，也没有封神。你在市场里完整地走完了四十回合，活下来，就是最大的赢家。',
    special: true,
  },
} as const satisfies Readonly<Record<string, Ending>>;

/** 全部结局（普通 + 特殊），方便界面、测试遍历。 */
export const ALL_ENDINGS: readonly Ending[] = [
  ...STAT_KEYS.flatMap((key) => [ENDINGS[key].low, ENDINGS[key].high]),
  ...Object.values(SPECIAL_ENDINGS),
];

/** 阈值：改这里即可调参。 */
export const ENDING_THRESHOLDS = {
  /** 惯性思维：最近连续同方向滑动次数。 */
  inertiaStreak: 8,
  /** 飘飘然：资金、信心都 >= 该值。 */
  euphoriaMin: 75,
  /** 刀尖起舞：风控 <= riskMax 且资金 >= capitalMin。 */
  knifeRiskMax: 15,
  knifeCapitalMin: 80,
  /** 偏执专家：某标签占比 >= share 且标签总数 >= minTotal。日常卡随机玩最高占比约 0.22–0.31，0.3 需要明显偏好某一类选项。 */
  obsessiveShare: 0.3,
  obsessiveMinTotal: 12,
  /** 行情亲历者：奇遇卡选择次数。 */
  adventureCount: 8,
  /** 稳如磐石：四条数值都在该区间（含端点）。 */
  balancedMin: 35,
  balancedMax: 65,
} as const;

/** 判定所需的局面（GameState 的子集）。 */
export interface EndingInput {
  readonly stats: Stats;
  readonly turn: number;
  readonly log: readonly ChoiceLog[];
  readonly tally: StyleTally;
}

function findNormalEnding(stats: Stats): Ending | null {
  for (const key of STAT_KEYS) {
    if (stats[key] <= STAT_FLOOR) return ENDINGS[key].low;
    if (stats[key] >= STAT_CEIL) return ENDINGS[key].high;
  }
  return null;
}

function hasStreak(log: readonly ChoiceLog[], length: number): boolean {
  if (log.length < length) return false;
  const recent = log.slice(-length);
  return recent.every((entry) => entry.side === recent[0].side);
}

function findMidRunEnding(input: EndingInput): Ending | null {
  const t = ENDING_THRESHOLDS;
  const { stats } = input;
  if (hasStreak(input.log, t.inertiaStreak)) return SPECIAL_ENDINGS.inertia;
  if (stats.capital >= t.euphoriaMin && stats.confidence >= t.euphoriaMin) return SPECIAL_ENDINGS.euphoria;
  if (stats.risk <= t.knifeRiskMax && stats.capital >= t.knifeCapitalMin) return SPECIAL_ENDINGS.knifeEdge;
  return null;
}

function countAdventureChoices(log: readonly ChoiceLog[], cards: readonly Card[]): number {
  const adventureIds = new Set(cards.filter((card) => card.adventure !== undefined).map((card) => card.id));
  return log.filter((entry) => adventureIds.has(entry.cardId)).length;
}

function isObsessive(tally: StyleTally): boolean {
  const total = STYLE_TAGS.reduce((sum, tag) => sum + tally[tag], 0);
  if (total < ENDING_THRESHOLDS.obsessiveMinTotal) return false;
  return STYLE_TAGS.some((tag) => tally[tag] / total >= ENDING_THRESHOLDS.obsessiveShare);
}

function isBalanced(stats: Stats): boolean {
  const { balancedMin, balancedMax } = ENDING_THRESHOLDS;
  return STAT_KEYS.every((key) => stats[key] >= balancedMin && stats[key] <= balancedMax);
}

function findFinalEnding(input: EndingInput, cards: readonly Card[]): Ending {
  if (countAdventureChoices(input.log, cards) >= ENDING_THRESHOLDS.adventureCount) return SPECIAL_ENDINGS.adventurer;
  if (isObsessive(input.tally)) return SPECIAL_ENDINGS.obsessive;
  if (isBalanced(input.stats)) return SPECIAL_ENDINGS.balanced;
  return SPECIAL_ENDINGS.survivor;
}

/**
 * 结局判定。input 必须是“刚应用完本次选择”的局面（turn、log、tally 都已更新）。
 *
 * 优先级（从高到低，取第一个命中的）：
 *  1. 普通结局：任一数值触底（0）或爆满（100），按资金、风控、信心、口碑的顺序检查，low 先于 high。
 *  2. 中途特殊结局（任意回合都可能触发）：
 *     惯性思维 > 飘飘然 > 刀尖起舞。
 *  3. 走满 MAX_TURNS 时的特殊结局：
 *     行情亲历者 > 偏执专家 > 稳如磐石 > 活到收盘（兜底，保证走满一定有结局）。
 *  都不满足则返回 null，游戏继续。
 */
export function findEnding(input: EndingInput, cards: readonly Card[]): Ending | null {
  const normal = findNormalEnding(input.stats);
  if (normal !== null) return normal;

  const midRun = findMidRunEnding(input);
  if (midRun !== null) return midRun;

  if (input.turn >= MAX_TURNS) return findFinalEnding(input, cards);
  return null;
}
