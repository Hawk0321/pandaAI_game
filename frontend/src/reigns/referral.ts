/**
 * 结局页引流：把这一局的人物卡、结局、数值和风格标签，翻译成 3 张指向 PandaAI / QuantSkills 的卡片。
 * 纯函数，全是规则，不用大模型，不含任何密钥。资源统一来自 recommend/catalog.ts 的 CATALOG（链接已核实）。
 * 文案规则（docs/personas.md）：用“这局里你……”，不下定性结论，不给投资建议。
 *
 * 三张卡固定顺序：
 *   1. 策略卡  人物卡 → 策略技能包（recommend.ts 的 PERSONA_STRATEGY；蛮牛、刺猬没有专属策略，见 FALLBACK_STRATEGY）
 *   2. 工具卡  结局 → 补短板的工具技能包（见下方 TOOL_BY_ENDING 映射表）
 *   3. 产品卡  PandaAI 产品，默认 Qube；夜猫研究员、深海猎鲨给量化因子中心
 */
import { CATALOG, type CatalogId } from '../recommend/catalog';
import { PERSONA_STRATEGY } from '../recommend/recommend';
import type { RecResource } from '../shared/protocol';
import { ROLES } from './roles';
import { STAT_KEYS, STAT_LABELS } from './types';
import type { Card, ChoiceLog, Ending, PersonaId, RoleId, StatKey, Stats, StyleTag, StyleTally } from './types';

/** encounter：本局遇到过的 PandaAI 事件 → 事件里点名的真实产品（见 buildEncounterReferral）。 */
export type ReferralType = 'strategy' | 'tool' | 'product' | 'encounter';

export interface Referral {
  readonly type: ReferralType;
  readonly title: string;
  /** 一两句话，引用本局的事实。 */
  readonly reason: string;
  readonly resource: RecResource;
  /** 按钮文字。 */
  readonly cta: string;
}

/** 人物卡 → 对应的风格标签（与 types.ts 顶部注释一致）。 */
export const TAG_BY_PERSONA: Readonly<Record<PersonaId, StyleTag>> = {
  sloth: 'passive', bull: 'impulsive', hedgehog: 'stubborn', owl: 'research', shark: 'concentrated',
  turtle: 'cautious', dolphin: 'trend', crab: 'contrarian', fox: 'adaptive',
  puffin: 'trend', raccoon: 'contrarian', gecko: 'cautious', squirrel: 'research', bat: 'impulsive', panda: 'adaptive',
};

/** 风格标签在文案里的说法：“有 N 次选择偏……”。 */
export const TAG_PHRASE: Readonly<Record<StyleTag, string>> = {
  passive: '观望', impulsive: '冲动', stubborn: '死扛', research: '重研究', concentrated: '重仓集中',
  cautious: '谨慎', trend: '顺势', contrarian: '逆向', adaptive: '灵活变通',
};

/** 策略卡：蛮牛、刺猬在 PERSONA_STRATEGY 里没有条目，先补短板，用止损技能包和行为诊断兜底。 */
const FALLBACK_STRATEGY: Readonly<Partial<Record<PersonaId, { res: CatalogId; title: string }>>> = {
  bull: { res: 'stopLoss', title: '先把止损写成规则' },
  hedgehog: { res: 'behavior', title: '给“亏了不认”照一面镜子' },
  puffin: { res: 'behavior', title: '看看跟风时的自己' },
  raccoon: { res: 'stopLoss', title: '给抄底也设一条边界' },
  gecko: { res: 'tradeReview', title: '把止损做得更有章法' },
  squirrel: { res: 'tradeReview', title: '把复盘继续做成规则' },
  bat: { res: 'behavior', title: '看看疲劳时的决定' },
  panda: { res: 'dailyReview', title: '给变化留下可复盘的线索' },
};

/** 策略卡理由的后半句，每个人物卡一句，不含买卖建议。 */
const STRATEGY_TAIL: Readonly<Record<PersonaId, string>> = {
  sloth: '相似 K 线搜索能看到历史上走势相似的标的后来怎样，不用下单也能练判断。',
  bull: '这个技能包按入场价算止损位和仓位上限，可以把“先定好最多亏多少”写成规则。',
  hedgehog: '行为偏差诊断能从交易记录里看出“亏了不认”这类习惯，复盘时多一面镜子。',
  owl: '翻线索和因子研究是相近的功夫，这个技能包带你在 PandaAI 上在线挖因子。',
  shark: '个股档案把基本面、行情和风险放在一页里，下重注之前多一份底稿。',
  turtle: '全天候用风险平价分配仓位，和先定好风险预算的思路相通。',
  dolphin: '均线金叉死叉是经典的趋势规则，可以检验顺势的直觉在更多行情里是否成立。',
  crab: '超跌反弹技能包把逆势思路拆成择时和选股条件，能检验这种直觉。',
  fox: '市场状态划分能把“看情况出牌”变成可复盘的规则。',
  puffin: '行为诊断能区分有计划的顺势与被人群推着走。', raccoon: '事前风险边界能让逆向判断不被“越跌越补”替代。',
  gecko: '逐笔复盘能看清哪些退出是纪律，哪些只是紧张。', squirrel: '把研究、规则和结果放在一起，复盘才会越来越可靠。',
  bat: '行为诊断能帮你发现疲劳和害怕错过时的选择变化。', panda: '每日复盘能记录改变的理由，让灵活调整和摇摆不定更容易区分。',
};

/** 工具卡：结局 → 补短板的技能包（主选），映射表见 toolKeyFor。 */
interface ToolPlan { readonly res: CatalogId; readonly title: string; readonly tail: string }

const TOOL_PLANS = {
  stopLoss: { res: 'stopLoss', title: '把止损写成规则', tail: '这个技能包按入场价自动判断止盈、止损和单票仓位上限，让“最多亏多少”事前就有答案。' },
  calibration: { res: 'calibration', title: '给自己的判断做一次校准', tail: '校准审计用 Brier 分数和校准曲线，看自信程度和实际命中是否对得上。' },
  tradeReview: { res: 'tradeReview', title: '把这一局逐笔复盘', tail: '复盘技能包按走势、策略和交易记录逐笔看，找出下一阶段能改的一两件事。' },
  dailyReview: { res: 'dailyReview', title: '养成每天收盘复盘的习惯', tail: '收盘复盘基于 Panda Data 自动生成，是把“多看一眼”变成习惯的低门槛入口。' },
  behavior: { res: 'behavior', title: '看看交易里的行为偏差', tail: '行为诊断能从交易记录里识别过度自信等常见偏差，当作复盘时的一面镜子。' },
  overfit: { res: 'overfit', title: '检验一下结果是不是运气', tail: '回测过拟合检测用 Deflated Sharpe 和 PBO 估计漂亮的结果有多少可能只是巧合。' },
} as const satisfies Record<string, ToolPlan>;

type ToolKey = keyof typeof TOOL_PLANS;

/**
 * 结局 → 工具卡映射表（数值触底/爆满决定补哪块短板）：
 *
 *   资金触底（爆仓离场）   → stopLoss     先把“最多亏多少”写进规则
 *   风控触底（风控失守）   → stopLoss     同上
 *   信心触底（心态崩盘）   → behavior     用行为诊断看清是哪些习惯在消耗信心
 *   信心爆满（盲目自信）   → calibration  校准“觉得自己对”和“实际对”之间的差距
 *   口碑触底/爆满          → tradeReview  口碑来自可复盘的决定，逐笔看更踏实
 *   资金爆满（财富自由）   → overfit      赢了也检验是不是运气
 *   风控爆满（畏手畏脚）   → dailyReview  从低门槛的每日复盘开始，慢慢找回节奏
 *   走满回合的存活结局     → dailyReview  稳定地活下来，就把复盘做成日常
 *   其他特殊结局           → behavior     隐藏结局多半来自特别的选择组合，用行为诊断看看自己的习惯
 */
const TOOL_BY_STAT: Readonly<Record<StatKey, Readonly<Record<'low' | 'high', ToolKey>>>> = {
  capital: { low: 'stopLoss', high: 'overfit' },
  risk: { low: 'stopLoss', high: 'dailyReview' },
  confidence: { low: 'behavior', high: 'calibration' },
  reputation: { low: 'tradeReview', high: 'tradeReview' },
};

/** 主选与第 1 张重复时，依次尝试这几个备选。 */
const TOOL_ALTERNATES: readonly ToolKey[] = ['tradeReview', 'behavior', 'dailyReview', 'calibration'];

export function toolKeyFor(ending: Ending): ToolKey {
  if (ending.kind === 'survive') return 'dailyReview';
  if (ending.kind === 'low' || ending.kind === 'high') {
    return ending.stat ? TOOL_BY_STAT[ending.stat][ending.kind] : 'tradeReview';
  }
  return 'behavior';
}

/** 产品卡：夜猫研究员、深海猎鲨重研究，给量化因子中心；其余给 Qube（免登录试用）。 */
const FACTOR_PERSONAS: readonly PersonaId[] = ['owl', 'shark', 'squirrel'];

/** 找出最能代表本局结局的数值：触底/爆满的那条，没有则取离 50 最远的一条。 */
function headlineStat(ending: Ending, stats: Stats): StatKey {
  if (ending.stat) return ending.stat;
  return STAT_KEYS.reduce((best, key) => (Math.abs(stats[key] - 50) > Math.abs(stats[best] - 50) ? key : best), STAT_KEYS[0]);
}

/** 各角色的口吻：每张卡末尾补一句，只换说法，不改推荐的资源，也不含买卖建议。 */
const ROLE_VOICE: Readonly<Record<RoleId, Readonly<Record<ReferralType, string>>>> = {
  fund: {
    strategy: '放到持有人的视角里，这是一份可以向他们交代的依据。',
    tool: '对持有人来说，事前写好的底线比事后解释更有说服力。',
    product: '想法先放进回测里过一遍，也是给持有人的一份投研底稿。',
    encounter: '游戏里遇到的工具现实里也有，先拿它试一份底稿，再决定要不要用到产品里。',
  },
  crypto: {
    strategy: '放到链上的节奏里，先有规则再看行情，心里更稳。',
    tool: '链上 24 小时不打烊，事前设好的规则不会疲劳。',
    product: '群里再热闹，也可以先把想法放进回测里过一遍。',
    encounter: '游戏里听说的东西现实里也能摸到，自己试一遍比群里转发更踏实。',
  },
  stock: {
    strategy: '放到自己盯盘的日子里，有规则就少一点临场情绪。',
    tool: '一个人扛盈亏，规则能在情绪上头时帮你把关。',
    product: '把自己的想法放进回测里，看看复盘时站不站得住。',
    encounter: '游戏里遇到的工具现实里也能试，先在回测和模拟里练，比听群里说更踏实。',
  },
};

/** 优先用显式传入的角色，其次取结局自带的角色（'all' 表示跨角色共用，不带口吻）。 */
function resolveRole(ending: Ending, role?: RoleId): RoleId | null {
  if (role) return role;
  return ending.role === 'all' ? null : ending.role;
}

function endingFact(ending: Ending, stats: Stats, role: RoleId | null): string {
  const key = headlineStat(ending, stats);
  const label = role ? ROLES[role].stats[key].label : STAT_LABELS[key];
  return `这局以“${ending.title}”收尾，${label}停在 ${stats[key]}`;
}

function ctaFor(resource: RecResource): string {
  return resource.provider === 'PandaAI' ? `打开 ${resource.name}` : '查看这个技能包';
}

function make(type: ReferralType, title: string, reason: string, resource: RecResource): Referral {
  return { type, title, reason, resource, cta: ctaFor(resource) };
}

/** 风格标签统计句：“这局里你有 N 次选择偏冲动”。N 为 0 时不写“0 次”。 */
export function tagFact(personaId: PersonaId, tally: StyleTally): string {
  const tag = TAG_BY_PERSONA[personaId];
  const n = tally[tag] ?? 0;
  return n > 0 ? `这局里你有 ${n} 次选择偏${TAG_PHRASE[tag]}` : `这局里你的选择里偏${TAG_PHRASE[tag]}的并不多`;
}

/** 本局带风格倾向的选择总数；全 0 时只说“这一局”。 */
function tallyTotalFact(tally: StyleTally): string {
  const total = Object.values(tally).reduce((sum, n) => sum + n, 0);
  return total > 0 ? `这局里你留下了 ${total} 次带风格倾向的选择` : '这一局你已经走完';
}

/**
 * @param role 可选；省略时取 ending.role（'all' 则不带角色口吻）。
 */
export function buildReferrals(personaId: PersonaId, ending: Ending, stats: Stats, tally: StyleTally, role?: RoleId): Referral[] {
  const who = resolveRole(ending, role);
  const voice = (type: ReferralType): string => (who ? ROLE_VOICE[who][type] : '');
  // 1. 策略卡
  const strategy = PERSONA_STRATEGY[personaId];
  const fallback = FALLBACK_STRATEGY[personaId];
  const strategyRes: RecResource = CATALOG[strategy?.res ?? fallback?.res ?? 'qbti'];
  const strategyTitle = strategy?.title ?? fallback?.title ?? '先找到适合你的策略方向';
  const first = make('strategy', strategyTitle, `${tagFact(personaId, tally)}。${STRATEGY_TAIL[personaId]}${voice('strategy')}`, strategyRes);

  // 2. 工具卡：主选与策略卡重复时换备选，保证三张卡指向三个不同的资源
  const used = new Set<string>([strategyRes.url]);
  const toolKey = [toolKeyFor(ending), ...TOOL_ALTERNATES].find((k) => !used.has(CATALOG[TOOL_PLANS[k].res].url)) ?? 'tradeReview';
  const plan = TOOL_PLANS[toolKey];
  const second = make('tool', plan.title, `${endingFact(ending, stats, who)}。${plan.tail}${voice('tool')}`, CATALOG[plan.res]);

  // 3. 产品卡
  const useFactor = FACTOR_PERSONAS.includes(personaId);
  const productRes = useFactor ? CATALOG.factorCenter : CATALOG.qube;
  const productReason = useFactor
    ? `${tagFact(personaId, tally)}。量化因子中心能搜索、对比和诊断因子，免费版有 20 个因子的因子池，可以把这股研究劲头用在真实数据上。${voice('product')}`
    : `${tallyTotalFact(tally)}。Qube 用自然语言就能把一个想法写成策略并回测，快速试用不用登录。${voice('product')}`;
  const third = make('product', useFactor ? '把研究劲头用在因子上' : '把想法交给 Qube 回测', productReason, productRes);

  return [first, second, third];
}

/**
 * 第 4 张卡：本局遇到过的 PandaAI 事件 → 事件里点名的真实产品。
 * res 依次尝试，选第一个没被前三张卡占用的；都被占用就用社区兜底。
 * 新增 pandaai 卡时必须在这里补一条（encounterReferral.test.ts 会检查）。
 */
interface Encounter {
  /** 卡面上点名的东西，用在标题和理由里。 */
  readonly mention: string;
  readonly res: readonly CatalogId[];
  /** 选中主资源（res[0]）时的补充说明，用于活动已结束、入口不同等情况。 */
  readonly note?: string;
}

export const ENCOUNTERS: Readonly<Record<string, Encounter>> = {
  'fund-quant-factor-center': { mention: '量化因子中心', res: ['factorCenter', 'factorOnline'] },
  'fund-quant-evo': { mention: 'EVO', res: ['evo', 'community'], note: 'EVO 需要登录，Lite 会员起可用，可以先读这份使用说明。' },
  'fund-quant-factor-contest': { mention: '因子大赛', res: ['factorContest', 'factorOnline'] },
  'crypto-quant-llm-battle': { mention: 'LLM 对抗赛', res: ['qube', 'community'], note: 'LLM 对抗赛已经结束，想自己试试让大模型写策略，可以从 Qube 开始。' },
  'crypto-quant-diagnostics': { mention: '交易行为诊断', res: ['behavior', 'tradeReview'] },
  'crypto-quant-qube-learn': { mention: 'Qube', res: ['qube', 'overfit'] },
  'stock-quant-ma': { mention: '双均线模板', res: ['qube', 'maCross'], note: '双均线模板就在 Qube 首页，可以直接拿来回测。' },
  'stock-quant-turtle': { mention: '海龟突破模板', res: ['qube', 'stopLoss'], note: '海龟突破 + ATR 止损模板就在 Qube 首页，可以直接拿来回测。' },
  'stock-quant-qube': { mention: 'Qube', res: ['qube', 'overfit'] },
  'stock-quant-simnow': { mention: '全国期货模拟赛', res: ['futuresContest', 'course'], note: 'SimNow 仿真要在专业版客户端里登录，模拟赛不用真金白银，门槛更低。' },
};

const ENCOUNTER_FALLBACK: CatalogId = 'community';

/**
 * 从本局选择记录里找最近一张 PandaAI 事件卡，推荐它点名的产品。没遇到过就返回 null（结局页只显示三张卡）。
 * @param usedUrls 前三张卡已经用掉的链接，避免重复。
 */
export function buildEncounterReferral(
  log: readonly ChoiceLog[],
  cards: readonly Card[],
  usedUrls: ReadonlySet<string>,
  role: RoleId | null = null,
): Referral | null {
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const card = byId.get(log[i].cardId);
    const plan = card?.pandaai ? ENCOUNTERS[card.id] : undefined;
    if (!card || !plan) continue;
    const resId = [...plan.res, ENCOUNTER_FALLBACK].find((id) => !usedUrls.has(CATALOG[id].url));
    if (!resId) continue;
    const isMain = resId === plan.res[0];
    const tail = isMain
      ? plan.note ?? `卡里说的${plan.mention}是真实的 PandaAI 产品，可以亲手试一下。`
      : `${plan.mention}相关的入口上面已经推荐过，这里换一个相近的。`;
    const reason = `这局第 ${i + 1} 关，${card.speaker}提到了${plan.mention}，你选了“${card[log[i].side].label}”。${tail}${role ? ROLE_VOICE[role].encounter : ''}`;
    return make('encounter', `第 ${i + 1} 关遇到的${plan.mention}`, reason, CATALOG[resId]);
  }
  return null;
}
