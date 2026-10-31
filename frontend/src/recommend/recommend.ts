/**
 * 推荐（规则）：画像 → 最多 4 张推荐卡片，指向 PandaAI 产品/活动/课程和 QuantSkills 技能包。
 * 每张卡写清依据哪项维度判断、引用哪条证据原文、为什么推荐，按钮直接跳到真实页面。
 * 每类（策略 / 工具 / 产品 / 活动 / 学习）最多一张，至少一张 PandaAI 产品卡；策略卡优先按人物卡挑。规则说明见 docs/recommend.md。
 */
import type { Dimension, DimensionId, Profile, Recommendation, RecResource } from '../shared/protocol';
import { CATALOG, type CatalogId } from './catalog';

/** 推荐阈值，docs/recommend.md 逐条解释。 */
export const R = {
  weak: 0.45,          // 能力分 ≤ 0.45 视为需要补
  strong: 0.65,        // 能力分 ≥ 0.65 视为已经不错；偏好分 ≥ 0.65 / ≤ 0.35 视为倾向明确
  watcher: 0.2,        // 风险偏好 ≤ 0.2 视为几乎不入场
  maxCards: 4,
};

/** 人物卡 → 策略卡：每张人物卡对应一个 QuantSkills 技能包，dim 是理由里引用的维度。蛮牛、刺猬先补短板，按偏好推荐。 */
export const PERSONA_STRATEGY: Partial<Record<string, { res: CatalogId; dim: DimensionId; title: string; pitch: string }>> = {
  sloth: { res: 'kline', dim: 'risk_appetite', title: '先在历史里找相似走势', pitch: '相似 K 线搜索能看到历史上走势相似的标的后来怎样，不用下单也能积累判断。' },
  owl: { res: 'factorOnline', dim: 'evidence_use', title: '把找线索的本事用到因子上', pitch: '你翻线索的习惯就是因子研究的雏形，这个技能包带你在 PandaAI 上在线挖因子、参加因子大赛。' },
  shark: { res: 'dossier', dim: 'research_depth', title: '重仓之前，先做一份个股档案', pitch: '集中下注靠的是研究深度，个股档案把基本面、行情和风险整理在一页里。' },
  turtle: { res: 'allWeather', dim: 'risk_control', title: '把风险预算扩展到资产配置', pitch: '全天候用风险平价分配仓位，和你"先定好最多亏多少"的思路一致。' },
  dolphin: { res: 'maCross', dim: 'style', title: '把"顺势"写成均线策略', pitch: '均线金叉死叉是最经典的趋势规则，可以检验你的直觉在更多行情里是否成立。' },
  crab: { res: 'oversold', dim: 'style', title: '把"跌多了买"量化检验', pitch: '超跌反弹技能包把抄底拆成择时和选股条件，能检验你的逆势直觉。' },
  fox: { res: 'regime', dim: 'style', title: '先认清市场状态，再选策略', pitch: '你会随行情换打法，市场状态划分能把"看情况"变成可复盘的规则。' },
};

interface Candidate { rec: Recommendation; priority: number }
type Dims = Record<DimensionId, Dimension>;

const CONF: Record<Dimension['confidence'], string> = { low: '置信度低', medium: '置信度中', high: '置信度高' };

/** 取支持该判断的证据原文（最多 2 条），没有则取任意证据。 */
function quotes(d: Dimension, n = 2): string[] {
  const pro = d.evidence.filter((e) => e.direction === '+').map((e) => e.text);
  const any = d.evidence.map((e) => e.text);
  return (pro.length ? pro : any).slice(0, n);
}
const basis = (d: Dimension) => ({ dimension_id: d.id, judgement: d.judgement, evidence: quotes(d) });
const said = (d: Dimension) => `${d.name}判断为"${d.judgement}"（${CONF[d.confidence]}）`;
const first = (d: Dimension) => (quotes(d, 1)[0] ? `，例如${quotes(d, 1)[0]}` : '');

const isWeak = (d: Dimension) => d.score !== null && d.score <= R.weak;
const isStrong = (d: Dimension) => d.score !== null && d.score >= R.strong;
const clear = (d: Dimension) => d.score !== null && d.confidence !== 'low' && !d.conflict;

const LABEL: Record<Recommendation['type'], string> = { strategy: '查看策略', tool: '查看工具', product: '去试试', event: '去看活动', learn: '去学习' };

function card(id: string, type: Recommendation['type'], title: string, res: RecResource, reason: string, based: Dimension[], label = LABEL[type]): Recommendation {
  return { id, type, title, resource: res, reason, based_on: based.map(basis), next_step: { label, url: res.url } };
}

function candidates(dims: Dims, persona: Profile['persona']): Candidate[] {
  const out: Candidate[] = [];
  const add = (priority: number, rec: Recommendation) => out.push({ priority, rec });
  const { evidence_use: ev, calibration: cal, risk_control: rc, style, research_depth: rd, risk_appetite: ra } = dims;
  const trend = clear(style) && style.score! >= R.strong;
  const reversal = clear(style) && style.score! <= 1 - R.strong;

  // ---- 策略：优先按人物卡，其次按"趋势 vs 反转"偏好推荐可回测的规则 ----
  const ps = persona.id ? PERSONA_STRATEGY[persona.id] : undefined;
  if (ps) {
    const d = dims[ps.dim];
    add(70, card(`strategy-${persona.id}`, 'strategy', ps.title, CATALOG[ps.res],
      `这局的人物卡是${persona.emoji}${persona.name}${persona.why ? `（${persona.why}）` : ''}，${said(d)}。${ps.pitch}`, [d]));
  } else if (trend) {
    add(70, card('strategy-ma-cross', 'strategy', '把"顺势"写成均线策略', CATALOG.maCross,
      `${said(style)}${first(style)}。均线金叉死叉是最经典的趋势规则，可以检验你的直觉在更多行情里是否成立。`, [style]));
  } else if (reversal) {
    add(70, card('strategy-oversold', 'strategy', '把"跌多了买"量化检验', CATALOG.oversold,
      `${said(style)}${first(style)}。这个技能包把超跌反弹拆成择时和选股条件，能检验你的逆势直觉。`, [style]));
  } else {
    add(40, card('strategy-qbti', 'strategy', '先找到适合你的策略方向', CATALOG.qbti,
      `${said(style)}，${style.score === null || style.confidence === 'low' ? '风格还不明显' : '倾向还不够强，暂不据此定策略'}。QBTI 用五组问答把投资性格翻译成策略参数，可以和这份画像对照着看。`, [style]));
  }

  // ---- 工具：能力短板越明显越靠前 ----
  if (isWeak(rc)) {
    add(100 - rc.score! * 100, card('tool-stop-loss', 'tool', '把止损写成规则', CATALOG.stopLoss,
      `${said(rc)}${first(rc)}。这个技能包按入场价自动执行止损和仓位上限，把"事前定好最多亏多少"变成习惯。`, [rc, ra]));
  }
  if (isWeak(cal)) {
    add(92 - cal.score! * 100, card('tool-behavior', 'tool', '诊断过度自信等行为偏差', CATALOG.behavior,
      `${said(cal)}${first(cal)}。它从交易记录里识别过度自信等偏差，适合拿模拟盘记录继续检查。`, [cal]));
  }
  if (isWeak(ev)) {
    add(95 - ev.score! * 100, card('tool-trade-review', 'tool', '逐笔复盘下单前看了什么', CATALOG.tradeReview,
      `${said(ev)}${first(ev)}。逐笔复盘能帮你看清每次下单前到底依据了什么。`, [ev, rd]));
  }
  if (isStrong(ev) && isStrong(rd)) {
    add(50, card('tool-overfit', 'tool', '规则写出来后，先查过拟合', CATALOG.overfit,
      `${said(ev)}，${said(rd)}。下一步把判断写成规则时，最容易踩的坑是回测过拟合。`, [ev, rd]));
  } else if (isWeak(rd)) {
    add(45, card('tool-daily-review', 'tool', '每天花 3 分钟看一份收盘复盘', CATALOG.dailyReview,
      `${said(rd)}${first(rd)}。游戏里的线索都来自 Panda Data，这份自动复盘把成交量、板块、资金这些线索每天整理好。`, [rd]));
  }

  // ---- 产品：至少一张 PandaAI 产品卡 ----
  if (isStrong(ev) && isStrong(rd)) {
    add(60, card('product-factor-center', 'product', '在因子中心把研究做成因子', CATALOG.factorCenter,
      `${said(ev)}，${said(rd)}。你习惯先看证据再决定，因子中心可以把"看什么"变成可检验的因子，免费版就能用。`, [ev, rd]));
  } else {
    const reason = trend ? `${said(style)}。Qube 首页有双均线、海龟突破 + ATR 止损等趋势模板，可以直接回测，快速试用不用登录。`
      : reversal ? `${said(style)}。在 Qube 里一句话描述"超跌后买入"，它会生成策略并用历史数据回测，快速试用不用登录。`
      : `${said(rd)}。把"我觉得会涨"写成一句话交给 Qube，它会生成策略并用历史数据回测，快速试用不用登录。`;
    add(55, card('product-qube', 'product', '用一句话把想法变成可回测的策略', CATALOG.qube, reason, [trend || reversal ? style : rd]));
  }

  // ---- 活动 ----
  if (ra.score !== null && ra.score <= R.watcher) {
    add(80, card('event-futures-contest', 'event', '在模拟盘上迈出第一步', CATALOG.futuresContest,
      `${said(ra)}${first(ra)}。模拟赛不用真金白银，适合先用小仓位把"看懂了"变成"做一次"。`, [ra]));
  } else if ([ev, cal, rc].every(isStrong)) {
    add(58, card('event-factor-contest', 'event', '去因子大赛试试身手', CATALOG.factorContest,
      `三项能力都表现不错（${[ev, cal, rc].map((d) => d.name).join('、')}）。因子大赛随时可以参加，适合把研究能力放到真实数据上检验。`, [ev, cal, rc]));
  }

  // ---- 学习 ----
  if (isWeak(rd) || isWeak(ev)) {
    const d = isWeak(rd) ? rd : ev;
    add(48, card('learn-course', 'learn', '系统学一遍量化思维', CATALOG.course,
      `${said(d)}。量变学院的 L1 从"为什么要用数据和规则做决定"讲起，正好补上这一块。`, [d]));
  } else if (cal.score === null) {
    add(35, card('learn-guide', 'learn', '先看看量化交易怎么入门', CATALOG.guide,
      `${said(cal)}：${cal.uncertain}。PandaAI 的新手入门文档免费，适合边看边在 Qube 里试。`, [cal]));
  }
  return out;
}

export function recommend(profile: Profile): Recommendation[] {
  const dims = Object.fromEntries(profile.dimensions.map((d) => [d.id, d])) as Dims;
  const all = candidates(dims, profile.persona).sort((a, b) => b.priority - a.priority);
  // 每类只留优先级最高的一张
  const best = all.filter((c, i) => all.findIndex((x) => x.rec.type === c.rec.type) === i);
  const product = best.find((c) => c.rec.type === 'product')!;
  const others = best.filter((c) => c !== product).slice(0, R.maxCards - 1);
  return [...others, product].sort((a, b) => b.priority - a.priority).map((c) => c.rec);
}
