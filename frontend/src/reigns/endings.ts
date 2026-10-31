import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, ChoiceLog, Ending, EndingKind, RoleId, StatKey, Stats, StyleTally } from './types';

const STAT_FLOOR = 0;
const STAT_CEIL = 100;

const ROLE_LIST: readonly RoleId[] = ['fund', 'crypto', 'stock'];

type NormalCopy = Readonly<Record<StatKey, Readonly<Record<EndingKind, readonly [title: string, description: string]>>>>;

/**
 * 普通结局文案：每个角色 4 条属性 x 触底/爆满 = 8 个。
 * 槽位语义见 roles.ts；描述不超过 60 字。
 */
const NORMAL_COPY: Readonly<Record<RoleId, NormalCopy>> = {
  fund: {
    capital: {
      low: ['清盘通知', '净值一路下滑，跌破清盘线。公告挂上官网那天，你把工牌放进了抽屉。'],
      high: ['规模失控', '业绩登顶，资金蜂拥而入。规模大到调不动头寸，风格也悄悄漂了。'],
    },
    risk: {
      low: ['回撤红线', '回撤一路击穿红线，风控部的电话一个接一个。你的净值曲线像一条滑梯。'],
      high: ['业绩跑输', '风控管得滴水不漏，净值也纹丝不动。基准跑远了，你的排名垫了底。'],
    },
    confidence: {
      low: ['投研散架', '市场一有噪音你就改一次框架。投研会开成辩论赛，没人说得清在买什么。'],
      high: ['固执己见', '你坚信自己的框架，反对意见都被当成噪音。直到市场亲手把它拆掉。'],
    },
    reputation: {
      low: ['大额赎回', '渠道不再推荐，持有人排队赎回。基金账户里的钱，掉得没有你的信用快。'],
      high: ['期望过载', '你被捧成明星基金经理，路演场场爆满。期望高到你再也兑现不了。'],
    },
  },
  crypto: {
    capital: {
      low: ['空钱包', '钱包余额归零，只剩一个连 gas 费都付不起的地址。群里有人问：还活着吗？'],
      high: ['天选之子', '资产翻了几番，你开始相信自己是天选之子。下一单，你把生活费也梭了。'],
    },
    risk: {
      low: ['被清算', '一根插针，保证金就不够了。系统替你平了仓，你连看一眼盘的机会都没有。'],
      high: ['空仓观众', '仓位轻得几乎不动，别人都上车了你还在研究白皮书。这轮行情，你是观众。'],
    },
    confidence: {
      low: ['纸手', '一根绿柱就让你割肉。你卖出的每一个币，后来都涨了回来。'],
      high: ['死多头', '钻石手练成了死多头。币价归零的那天，你还在群里喊 HODL。'],
    },
    reputation: {
      low: ['反向指标', '社区把你拉黑，你的每条推文都成了反向指标。甚至有人专门做空你的观点。'],
      high: ['KOL 的枷锁', '你被捧成 KOL，粉丝等着你喊单。从此你再也不敢说一句真话。'],
    },
  },
  stock: {
    capital: {
      low: ['爆仓离场', '账户资金归零，券商短信一条接一条。你默默关掉软件，决定先找份稳定的工作。'],
      high: ['提款机幻觉', '一夜暴富，你觉得市场就是自家提款机。下一次，你把房子也押了进去。'],
    },
    risk: {
      low: ['重仓失守', '满仓一只票，一个跌停板就把你的止损线砸穿。你盯着满屏绿色发呆。'],
      high: ['只看不买', '止损线画了十条，仓位压到最低。风控满分，账户纹丝不动，红包都没抢到。'],
    },
    confidence: {
      low: ['追涨杀跌', '心态崩盘，涨了就追，跌了就割。你的成交记录，成了一部情绪起伏史。'],
      high: ['盲目自信', '你觉得自己看穿了市场，复盘和止损都懒得做。市场很快给你上了一课。'],
    },
    reputation: {
      low: ['口碑扫地', '股友群里没人再信你的票，你被悄悄移出了群聊，只剩屏幕陪着你。'],
      high: ['被捧上神坛', '大家都等着你喊单，说错一句就成了靶子。你再也没法安静地买股票。'],
    },
  },
};

function buildNormalEndings(): Readonly<Record<RoleId, Readonly<Record<StatKey, Readonly<Record<EndingKind, Ending>>>>>> {
  const out = {} as Record<RoleId, Record<StatKey, Record<EndingKind, Ending>>>;
  for (const role of ROLE_LIST) {
    const byStat = {} as Record<StatKey, Record<EndingKind, Ending>>;
    for (const stat of STAT_KEYS) {
      const make = (kind: EndingKind): Ending => ({
        id: `${role}-${kind}-${stat}`,
        role,
        stat,
        kind,
        title: NORMAL_COPY[role][stat][kind][0],
        description: NORMAL_COPY[role][stat][kind][1],
        special: false,
      });
      byStat[stat] = { low: make('low'), high: make('high') };
    }
    out[role] = byStat;
  }
  return out;
}

/** 普通结局：ENDINGS[role][stat][low|high]，每个角色 8 个。id 形如 "fund-low-capital"。 */
export const ENDINGS = buildNormalEndings();

/** 通用特殊结局的 key。 */
export type GenericEndingKey = 'inertia' | 'obsessive' | 'adventurer' | 'balanced' | 'survivor';

interface GenericCopy {
  readonly id: string;
  readonly kind: 'special' | 'survive';
  readonly title: string;
  readonly description: Readonly<Record<RoleId, string>>;
}

const GENERIC_COPY: Readonly<Record<GenericEndingKey, GenericCopy>> = {
  inertia: {
    id: 'sp-inertia',
    kind: 'special',
    title: '惯性思维',
    description: {
      fund: '你一路往同一个方向滑，投委会都没发觉。市场拐了弯，你的持仓还在直线前进。',
      crypto: '你一路往同一边滑，连自己都没发觉。行情一根插针，你还在直线前进。',
      stock: '你一路往同一个方向滑，连自己都没发觉。大盘一个转弯，你还在直线前进。',
    },
  },
  obsessive: {
    id: 'sp-obsessive',
    kind: 'survive',
    title: '偏执专家',
    description: {
      fund: '同一套打法被你用到了极致。在你的赛道里无人能敌，只是这条赛道有点窄。',
      crypto: '同一种玩法你从头玩到尾，链上老炮都服气。只是赛道一换，你就不会玩了。',
      stock: '同一套打法你用了一整年，在你的领域里无人能敌，只是那个领域有点窄。',
    },
  },
  adventurer: {
    id: 'sp-adventurer',
    kind: 'survive',
    title: '行情亲历者',
    description: {
      fund: '大涨、急跌、假突破，你都握着真金白银在现场。路演里的案例，全是你的亲身经历。',
      crypto: '暴涨、插针、假突破，你都在链上亲历。别人看的是 K 线，你经历的是故事。',
      stock: '大涨、急跌、假突破，你都在现场。别人看的是 K 线，你经历的是故事。',
    },
  },
  balanced: {
    id: 'sp-balanced',
    kind: 'survive',
    title: '稳如磐石',
    description: {
      fund: '业绩、回撤、定力、信任都在中间地带，这个季度风平浪静。持有人睡得着，你也是。',
      crypto: '资产、保证金、定力、声量都在中间地带，这一轮周期波澜不惊。你是让人放心的那个。',
      stock: '资金、仓位、心态、口碑都在中间地带，这一年风平浪静。你就是那个让人放心的人。',
    },
  },
  survivor: {
    id: 'sp-survivor',
    kind: 'survive',
    title: '活到收盘',
    description: {
      fund: '没有清盘，也没有封神。你带着这只基金走完了这个季度，活下来，就是对持有人最好的交代。',
      crypto: '没有被清算，也没有登月。你在这一轮周期里活了下来，下一轮，你还在场。',
      stock: '没有爆仓，也没有封神。你在市场里完整地走完了这一年，活下来，就是最大的赢家。',
    },
  },
};

const GENERIC_KEYS = Object.keys(GENERIC_COPY) as GenericEndingKey[];

function buildGenericEndings(): Readonly<Record<RoleId, Readonly<Record<GenericEndingKey, Ending>>>> {
  const out = {} as Record<RoleId, Record<GenericEndingKey, Ending>>;
  for (const role of ROLE_LIST) {
    const byKey = {} as Record<GenericEndingKey, Ending>;
    for (const key of GENERIC_KEYS) {
      const copy = GENERIC_COPY[key];
      byKey[key] = {
        id: copy.id,
        role: 'all',
        stat: null,
        kind: copy.kind,
        title: copy.title,
        description: copy.description[role],
        special: true,
      };
    }
    out[role] = byKey;
  }
  return out;
}

/**
 * 通用特殊结局（role 为 'all'，id 三个角色相同）。
 * GENERIC_ENDINGS[role][key] 是该角色看到的文案版本，标题相同、描述按角色改写。
 */
export const GENERIC_ENDINGS = buildGenericEndings();

/** 阈值：改这里即可调参。 */
export const ENDING_THRESHOLDS = {
  /** 惯性思维：最近连续同方向滑动次数。 */
  inertiaStreak: 8,
  /** 偏执专家：某标签占比 >= share 且标签总数 >= minTotal。 */
  obsessiveShare: 0.3,
  obsessiveMinTotal: 12,
  /** 行情亲历者：奇遇卡选择次数。 */
  adventureCount: 8,
  /** 稳如磐石：四条数值都在该区间（含端点）。 */
  balancedMin: 35,
  balancedMax: 65,
  /** 角色专属中途特殊结局：HIGH = 该项 >= high；LOW = 该项 <= low。 */
  high: 80,
  low: 20,
  /** “回撤/保证金/仓位风控很低”这类更苛刻的下限（专属结局里用）。 */
  riskLow: 25,
} as const;

interface RoleSpecial {
  readonly ending: Ending;
  readonly matches: (stats: Stats) => boolean;
}

function special(role: RoleId, slug: string, title: string, description: string): Ending {
  return { id: `sp-${role}-${slug}`, role, stat: null, kind: 'special', title, description, special: true };
}

const T = ENDING_THRESHOLDS;

/**
 * 角色专属中途特殊结局，数组顺序即优先级（先命中先返回）。
 *  基金经理：明星基金经理的倒计时 > 赢了业绩输了人心 > 追热点的明星
 *  Web3 玩家：全仓梭哈的幸存者 > 登月成功 > 安全的纸手
 *  炒股达人：荐股大 V > 套牢信徒 > 空仓钉子户
 */
const ROLE_SPECIALS: Readonly<Record<RoleId, readonly RoleSpecial[]>> = {
  fund: [
    {
      ending: special('fund', 'star', '明星基金经理的倒计时', '业绩亮眼，客户追捧，回撤控制却早已松动。聚光灯越亮，你越听得见倒计时的滴答声。'),
      matches: (s) => s.capital >= T.high && s.reputation >= T.high && s.risk <= T.riskLow,
    },
    {
      ending: special('fund', 'unloved', '赢了业绩输了人心', '净值漂亮，持有人却不买账，渠道也不再推荐你。你赢了排名，输了人心。'),
      matches: (s) => s.capital >= T.high && s.reputation <= T.low,
    },
    {
      ending: special('fund', 'chaser', '追热点的明星', '投研定力早散了，客户却还信你。你一路追着热点跑，名气越大，风格越不像自己。'),
      matches: (s) => s.confidence <= T.low && s.reputation >= T.high,
    },
  ],
  crypto: [
    {
      ending: special('crypto', 'allin', '全仓梭哈的幸存者', '钱包数字吓人，保证金薄如蝉翼。你全仓梭哈还活了下来，群友说你是今年的锦鲤。'),
      matches: (s) => s.capital >= T.high && s.risk <= T.riskLow,
    },
    {
      ending: special('crypto', 'moon', '登月成功', '资产飙升，手比钻石还稳。你在最高点关掉了 App，把截图发给了所有前任。'),
      matches: (s) => s.capital >= T.high && s.confidence >= T.high,
    },
    {
      ending: special('crypto', 'paper', '安全的纸手', '保证金养得肥肥的，手却一抖就卖。群里涨出来的每个百倍币，都是你卖掉的。'),
      matches: (s) => s.confidence <= T.low && s.risk >= T.high,
    },
  ],
  stock: [
    {
      ending: special('stock', 'guru', '荐股大 V', '口碑爆棚，心态稳如老狗，仓位却早就压到了极限。粉丝喊你老师，你的账户在喊救命。'),
      matches: (s) => s.reputation >= T.high && s.confidence >= T.high && s.risk <= T.riskLow,
    },
    {
      ending: special('stock', 'bagholder', '套牢信徒', '账户绿了一大片，你却越跌越信。“长期持有”成了你的口头禅，也是你的墓志铭。'),
      matches: (s) => s.capital <= T.low && s.confidence >= T.high,
    },
    {
      ending: special('stock', 'hermit', '空仓钉子户', '风控拉满，账户却缩水，股友群里也没人搭理你。你成了市场里最安全的路人。'),
      matches: (s) => s.risk >= T.high && s.reputation <= T.low,
    },
  ],
};

/** 角色专属特殊结局（按优先级排序）。 */
export const ROLE_SPECIAL_ENDINGS: Readonly<Record<RoleId, readonly Ending[]>> = {
  fund: ROLE_SPECIALS.fund.map((entry) => entry.ending),
  crypto: ROLE_SPECIALS.crypto.map((entry) => entry.ending),
  stock: ROLE_SPECIALS.stock.map((entry) => entry.ending),
};

/**
 * 该角色可能出现的全部结局：普通 8 + 专属特殊 + 通用特殊，供结局页和图鉴使用。
 * 通用特殊结局的 role 为 'all'，描述已换成该角色的版本。
 */
export function getEndings(role: RoleId): readonly Ending[] {
  return [
    ...STAT_KEYS.flatMap((key) => [ENDINGS[role][key].low, ENDINGS[role][key].high]),
    ...ROLE_SPECIAL_ENDINGS[role],
    ...GENERIC_KEYS.map((key) => GENERIC_ENDINGS[role][key]),
  ];
}

/** 判定所需的局面（GameState 的子集）。 */
export interface EndingInput {
  readonly role: RoleId;
  readonly stats: Stats;
  readonly turn: number;
  readonly log: readonly ChoiceLog[];
  readonly tally: StyleTally;
  /**
   * 本回合加时“收盘铃”是否响（由引擎按 seed + turn 决定，只在 turn > OVERTIME_START 时可能为 true）。
   * 省略视为 false。
   */
  readonly closingBell?: boolean;
}

function findNormalEnding(role: RoleId, stats: Stats): Ending | null {
  for (const key of STAT_KEYS) {
    if (stats[key] <= STAT_FLOOR) return ENDINGS[role][key].low;
    if (stats[key] >= STAT_CEIL) return ENDINGS[role][key].high;
  }
  return null;
}

function hasStreak(log: readonly ChoiceLog[], length: number): boolean {
  if (log.length < length) return false;
  const recent = log.slice(-length);
  return recent.every((entry) => entry.side === recent[0].side);
}

function findRoleSpecial(role: RoleId, stats: Stats): Ending | null {
  return ROLE_SPECIALS[role].find((entry) => entry.matches(stats))?.ending ?? null;
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
  const generic = GENERIC_ENDINGS[input.role];
  if (countAdventureChoices(input.log, cards) >= ENDING_THRESHOLDS.adventureCount) return generic.adventurer;
  if (isObsessive(input.tally)) return generic.obsessive;
  if (isBalanced(input.stats)) return generic.balanced;
  return generic.survivor;
}

/**
 * 结局判定。input 必须是“刚应用完本次选择”的局面（turn、log、tally 都已更新）。
 *
 * 优先级（从高到低，取第一个命中的）：
 *  1. 普通结局：任一数值触底（0）或爆满（100），按资金、风控、信心、口碑的顺序检查，low 先于 high。
 *  2. 角色专属中途特殊结局（任意回合都可能触发，按 ROLE_SPECIALS 里的顺序）。
 *  3. 通用中途特殊结局：惯性思维。
 *  4. 收盘铃响（input.closingBell，加时阶段才会响）时的收盘结局（按过程判定）：
 *     行情亲历者 > 偏执专家 > 稳如磐石。
 *  5. 活到收盘（铃响时的兜底）。
 *  都不满足则返回 null，游戏继续。没有回合上限：加时阶段靠市场抖动和收盘铃结束。
 *  因为 1 先判定，收盘结局出现时任何数值都不在 0/100。
 */
export function findEnding(input: EndingInput, cards: readonly Card[]): Ending | null {
  const normal = findNormalEnding(input.role, input.stats);
  if (normal !== null) return normal;

  const roleSpecial = findRoleSpecial(input.role, input.stats);
  if (roleSpecial !== null) return roleSpecial;

  if (hasStreak(input.log, ENDING_THRESHOLDS.inertiaStreak)) return GENERIC_ENDINGS[input.role].inertia;

  if (input.closingBell === true) return findFinalEnding(input, cards);
  return null;
}
