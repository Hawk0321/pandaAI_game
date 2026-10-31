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
import { STAT_KEYS, STAT_LABELS } from './types';
import type { Ending, PersonaId, StatKey, Stats, StyleTag, StyleTally } from './types';

export type ReferralType = 'strategy' | 'tool' | 'product';

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
const FACTOR_PERSONAS: readonly PersonaId[] = ['owl', 'shark'];

/** 找出最能代表本局结局的数值：触底/爆满的那条，没有则取离 50 最远的一条。 */
function headlineStat(ending: Ending, stats: Stats): StatKey {
  if (ending.stat) return ending.stat;
  return STAT_KEYS.reduce((best, key) => (Math.abs(stats[key] - 50) > Math.abs(stats[best] - 50) ? key : best), STAT_KEYS[0]);
}

function endingFact(ending: Ending, stats: Stats): string {
  const key = headlineStat(ending, stats);
  return `这局以“${ending.title}”收尾，${STAT_LABELS[key]}停在 ${stats[key]}`;
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

export function buildReferrals(personaId: PersonaId, ending: Ending, stats: Stats, tally: StyleTally): Referral[] {
  // 1. 策略卡
  const strategy = PERSONA_STRATEGY[personaId];
  const fallback = FALLBACK_STRATEGY[personaId];
  const strategyRes: RecResource = CATALOG[strategy?.res ?? fallback?.res ?? 'qbti'];
  const strategyTitle = strategy?.title ?? fallback?.title ?? '先找到适合你的策略方向';
  const first = make('strategy', strategyTitle, `${tagFact(personaId, tally)}。${STRATEGY_TAIL[personaId]}`, strategyRes);

  // 2. 工具卡：主选与策略卡重复时换备选，保证三张卡指向三个不同的资源
  const used = new Set<string>([strategyRes.url]);
  const toolKey = [toolKeyFor(ending), ...TOOL_ALTERNATES].find((k) => !used.has(CATALOG[TOOL_PLANS[k].res].url)) ?? 'tradeReview';
  const plan = TOOL_PLANS[toolKey];
  const second = make('tool', plan.title, `${endingFact(ending, stats)}。${plan.tail}`, CATALOG[plan.res]);

  // 3. 产品卡
  const useFactor = FACTOR_PERSONAS.includes(personaId);
  const productRes = useFactor ? CATALOG.factorCenter : CATALOG.qube;
  const productReason = useFactor
    ? `${tagFact(personaId, tally)}。量化因子中心能搜索、对比和诊断因子，免费版有 20 个因子的因子池，可以把这股研究劲头用在真实数据上。`
    : `${tallyTotalFact(tally)}。Qube 用自然语言就能把一个想法写成策略并回测，快速试用不用登录。`;
  const third = make('product', useFactor ? '把研究劲头用在因子上' : '把想法交给 Qube 回测', productReason, productRes);

  return [first, second, third];
}
