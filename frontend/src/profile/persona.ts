/**
 * 人物卡：由会话级行为特征（features.ts）直接判别，每张卡对应一个有文献依据的行为金融学概念。
 * 人物卡只是画像的趣味表达（is_fun_label: true），不代替维度判断，也不是投资建议。
 * 规则按顺序匹配：第一条命中为主卡，第二条命中作为"另外也有点像"。卡片说明见 docs/personas.md。
 */
import type { Profile } from '../shared/protocol';
import type { Feature, Features } from './features';

export type PersonaId = 'sloth' | 'bull' | 'hedgehog' | 'owl' | 'shark' | 'turtle' | 'dolphin' | 'crab' | 'fox';

export interface PersonaCard {
  id: PersonaId;
  name: string;
  emoji: string;
  archetype: string;        // 对应的金融学概念
  tagline: string;
  traits: [string, string, string];
  strength: string;
  blind_spot: string;
  basis: string;            // 金融依据（一两句话）
  refs: string[];           // 文献
  rule: string;             // 判别规则（人话）
  palette: { main: string; soft: string };  // 给视觉的建议色
  mood: string;             // 给插画/动效的关键词
}

export const PERSONA_CARDS: Record<PersonaId, PersonaCard> = {
  sloth: {
    id: 'sloth', name: '树懒观察员', emoji: '🦥', archetype: '损失厌恶 · 维持现状偏差',
    tagline: '看得多、动得少，按兵不动也是一种选择',
    traits: ['爱观望', '怕亏损', '重研究轻行动'],
    strength: '不会因为冲动而亏钱，耐心是稀缺品质',
    blind_spot: '把"不确定"当成"不行动"的理由，也就没机会验证自己的判断',
    basis: '前景理论发现，同样金额的损失带来的痛苦约是收益快乐的两倍，人因此倾向回避可能亏钱的选择；面对模糊信息时，人还会偏好"什么都不改"的默认选项。',
    refs: ['Kahneman & Tversky (1979), Prospect Theory, Econometrica', 'Samuelson & Zeckhauser (1988), Status Quo Bias in Decision Making, J. Risk & Uncertainty', 'Ellsberg (1961), Risk, Ambiguity, and the Savage Axioms, QJE'],
    rule: '至少 3/4 的关选择观望', palette: { main: '#8FB8A8', soft: '#1E3530' }, mood: '慢、安静、树枝上眯眼看盘',
  },
  bull: {
    id: 'bull', name: '冲锋蛮牛', emoji: '🐂', archetype: '过度自信',
    tagline: '看到机会就冲，先上车再说',
    traits: ['重仓', '决定快', '信心满格'],
    strength: '执行力强，机会来时不犹豫',
    blind_spot: '信心常常高过实际把握，重仓放大了每一次看错',
    basis: '对数万个券商账户的研究发现，交易越频繁、越自信的散户，扣费后收益越差；过度自信表现为高估自己信息的准确度，并因此下更大的注。',
    refs: ['Barber & Odean (2000), Trading Is Hazardous to Your Wealth, J. Finance', 'Odean (1999), Do Investors Trade Too Much?, AER', 'Lichtenstein, Fischhoff & Phillips (1982), Calibration of Probabilities'],
    rule: '平均仓位 ≥ 70%，且信心比命中率高 15 个百分点以上（或平均信心 ≥ 4.5 且研究点用不到 40%）', palette: { main: '#F28C6B', soft: '#3A2219' }, mood: '冲刺、红色尘土、低头顶角',
  },
  hedgehog: {
    id: 'hedgehog', name: '死扛刺猬', emoji: '🦔', archetype: '处置效应',
    tagline: '亏了不认，缩成一团等它涨回来',
    traits: ['浮亏加仓', '不愿止损', '摊平成本'],
    strength: '不怕波动，有坚持的韧劲',
    blind_spot: '用加仓"摊平"来回避认错，小亏容易拖成大亏',
    basis: '处置效应指投资者倾向过早卖出赚钱的仓位、过久持有亏钱的仓位；对真实账户的研究证实，散户实现盈利的概率明显高于实现亏损。浮亏时加仓是它最典型的表现之一。',
    refs: ['Shefrin & Statman (1985), The Disposition to Sell Winners Too Early and Ride Losers Too Long, J. Finance', 'Odean (1998), Are Investors Reluctant to Realize Their Losses?, J. Finance'],
    rule: '浮亏时加仓 ≥ 2 次；或浮亏加仓 1 次、从不在浮亏时减仓且很少设止损', palette: { main: '#C9A36B', soft: '#33291B' }, mood: '蜷成球、刺竖起、咬牙坚持',
  },
  owl: {
    id: 'owl', name: '夜猫研究员', emoji: '🦉', archetype: '证据驱动 · 慢思考',
    tagline: '线索翻遍才出手，证据说话',
    traits: ['研究点用足', '先看关键线索', '跟着证据走'],
    strength: '决定有依据，不容易被单一信号带偏',
    blind_spot: '研究得越多越容易觉得"已经想清楚了"，仍需检验规则是否只是巧合',
    basis: '双系统理论区分快速直觉（系统 1）与慢速推理（系统 2）；预测研究发现，愿意主动找反方证据、按新信息更新判断的人预测更准。确认偏误则是只找支持自己观点的证据。',
    refs: ['Kahneman (2011), Thinking, Fast and Slow', 'Nickerson (1998), Confirmation Bias, Review of General Psychology', 'Tetlock & Gardner (2015), Superforecasting'],
    rule: '研究点使用率 ≥ 80%，关键线索命中率 ≥ 70%，入场方向与线索一致率 ≥ 67%', palette: { main: '#9CE5CB', soft: '#17332C' }, mood: '夜色、台灯、翻卡片',
  },
  shark: {
    id: 'shark', name: '深海猎鲨', emoji: '🦈', archetype: '高确信集中下注',
    tagline: '研究透了就下重注',
    traits: ['研究深', '仓位重', '方向坚定'],
    strength: '把研究优势转化为足够的仓位',
    blind_spot: '集中下注时一次看错的代价很大，更需要止损和仓位上限',
    basis: '对主动管理基金的研究发现，持仓更集中的基金经理平均表现更好，说明有信息优势时集中是合理的；但凯利公式也提醒，下注比例应和真实胜率匹配，过度下注会显著增加破产风险。',
    refs: ['Kacperczyk, Sialm & Zheng (2005), On the Industry Concentration of Actively Managed Equity Mutual Funds, J. Finance', 'Kelly (1956), A New Interpretation of Information Rate, Bell System Technical Journal'],
    rule: '平均仓位 ≥ 70%，研究点使用率 ≥ 70%，入场方向与线索一致率 ≥ 67%', palette: { main: '#6FA8DC', soft: '#16263A' }, mood: '深蓝、静默逼近、一击即中',
  },
  turtle: {
    id: 'turtle', name: '稳健老龟', emoji: '🐢', archetype: '风险预算',
    tagline: '慢一点没关系，先保住本金',
    traits: ['轻仓', '必设止损', '不摊平'],
    strength: '每笔交易都事先限定最大亏损，能活得久',
    blind_spot: '仓位太轻时，看对了也赚不到多少',
    basis: '研究表明，在趋势性行情里，系统化止损规则能在不明显牺牲收益的情况下降低回撤；凯利框架下，在胜率不确定时用较小的下注比例更稳健。',
    refs: ['Kaminski & Lo (2014), When Do Stop-Loss Rules Stop Losses?, J. Financial Markets', 'Kelly (1956), A New Interpretation of Information Rate, Bell System Technical Journal'],
    rule: '入场的关至少 3/4 设了止损，平均仓位 ≤ 50%，从不浮亏加仓', palette: { main: '#A3C77A', soft: '#232F18' }, mood: '龟壳、稳步前行、盾牌',
  },
  dolphin: {
    id: 'dolphin', name: '冲浪海豚', emoji: '🐬', archetype: '趋势跟随 · 动量',
    tagline: '顺着浪头走，趋势就是朋友',
    traits: ['涨了追', '跌了空', '顺势而为'],
    strength: '跟上大级别趋势，和许多 CTA 基金的思路一致',
    blind_spot: '趋势反转或假突破时容易追在最高点',
    basis: '动量效应是金融学最稳健的发现之一：过去 3–12 个月涨得多的资产，之后一段时间往往继续跑赢；时间序列动量在期货、股指、外汇等几十个市场中都存在。',
    refs: ['Jegadeesh & Titman (1993), Returns to Buying Winners and Selling Losers, J. Finance', 'Moskowitz, Ooi & Pedersen (2012), Time Series Momentum, J. Financial Economics'],
    rule: '有明显趋势的关里，至少 2/3 顺势下单（至少 2 关）', palette: { main: '#5EC8E5', soft: '#123039' }, mood: '海浪、跃出水面、流线',
  },
  crab: {
    id: 'crab', name: '逆行螃蟹', emoji: '🦀', archetype: '逆向投资 · 均值回归',
    tagline: '别人追涨我抄底，偏爱反着走',
    traits: ['跌多了买', '涨多了空', '不随大流'],
    strength: '能在市场过度反应时找到机会',
    blind_spot: '"便宜还能更便宜"，逆势时更需要止损',
    basis: '研究发现市场会对消息过度反应：过去几年跌得最多的股票之后往往跑赢涨得最多的；短期（一周到一个月）也存在收益反转。',
    refs: ['De Bondt & Thaler (1985), Does the Stock Market Overreact?, J. Finance', 'Jegadeesh (1990), Evidence of Predictable Behavior of Security Returns, J. Finance'],
    rule: '有明显趋势的关里，至多 1/3 顺势下单（至少 2 关）', palette: { main: '#E5736B', soft: '#3A1C1A' }, mood: '横着走、钳子、逆流',
  },
  fox: {
    id: 'fox', name: '灵活狐狸', emoji: '🦊', archetype: '适应性市场',
    tagline: '没有固定套路，看情况出牌',
    traits: ['风格多变', '随行情调整', '不走极端'],
    strength: '不被单一框架锁死，能根据情境调整',
    blind_spot: '没有固定规则时，很难复盘到底是哪一步做对了',
    basis: '适应性市场假说认为，没有一种策略永远有效，参与者会随环境变化调整行为；有效的做法是知道自己在什么情境下用什么规则。',
    refs: ['Lo (2004), The Adaptive Markets Hypothesis, J. Portfolio Management'],
    rule: '以上都不满足', palette: { main: '#F2B35E', soft: '#3A2A14' }, mood: '机敏、回头张望、尾巴一甩',
  },
};

const v = (f: Feature) => f.value;
const ge = (f: Feature, x: number) => f.value !== null && f.value >= x;
const le = (f: Feature, x: number) => f.value !== null && f.value <= x;
/** 一致率没有样本（例如线索都是中性）时不卡人。 */
const agreeOk = (f: Feature) => f.value === null || f.value >= 0.67;

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export const PERSONA_RULES: { id: PersonaId; when: (f: Features) => boolean; why: (f: Features) => string }[] = [
  { id: 'sloth', when: (f) => f.levels >= 2 && ge(f.flat_rate, 0.75), why: (f) => `${f.levels} 关里观望 ${pct(v(f.flat_rate))}` },
  { id: 'bull', when: (f) => ge(f.avg_size, 0.7) && (ge(f.overconfidence, 0.15) || (ge(f.avg_confidence, 4.5) && le(f.research_spend, 0.4))),
    why: (f) => `平均仓位 ${pct(v(f.avg_size))}，平均信心 ${v(f.avg_confidence)?.toFixed(1) ?? '—'}/5，命中率 ${pct(v(f.hit_rate))}` },
  { id: 'hedgehog', when: (f) => ge(f.add_on_loss, 2) || (ge(f.add_on_loss, 1) && le(f.cut_on_loss, 0) && le(f.stop_rate, 0.25)),
    why: (f) => `浮亏时加仓 ${v(f.add_on_loss)} 次，浮亏时减仓 ${v(f.cut_on_loss)} 次` },
  { id: 'owl', when: (f) => ge(f.research_spend, 0.8) && ge(f.key_clue_hit, 0.7) && agreeOk(f.clue_agree) && le(f.flat_rate, 0.5),
    why: (f) => `研究点使用 ${pct(v(f.research_spend))}，关键线索命中 ${pct(v(f.key_clue_hit))}` },
  { id: 'shark', when: (f) => ge(f.avg_size, 0.7) && ge(f.research_spend, 0.7) && agreeOk(f.clue_agree),
    why: (f) => `平均仓位 ${pct(v(f.avg_size))}，研究点使用 ${pct(v(f.research_spend))}` },
  { id: 'turtle', when: (f) => ge(f.stop_rate, 0.75) && le(f.avg_size, 0.5) && le(f.add_on_loss, 0),
    why: (f) => `入场时设止损 ${pct(v(f.stop_rate))}，平均仓位 ${pct(v(f.avg_size))}` },
  { id: 'dolphin', when: (f) => f.trend_follow.n >= 2 && ge(f.trend_follow, 0.67), why: (f) => `有趋势的 ${f.trend_follow.n} 关里顺势 ${pct(v(f.trend_follow))}` },
  { id: 'crab', when: (f) => f.trend_follow.n >= 2 && le(f.trend_follow, 0.33), why: (f) => `有趋势的 ${f.trend_follow.n} 关里顺势只有 ${pct(v(f.trend_follow))}` },
];

export function pickPersona(f: Features): { persona: Profile['persona']; why: string; card: PersonaCard } {
  const hits = PERSONA_RULES.filter((r) => r.when(f));
  const main = hits[0];
  const card = PERSONA_CARDS[main?.id ?? 'fox'];
  const also = hits[1] ? PERSONA_CARDS[hits[1].id] : undefined;
  const why = main ? main.why(f) : '各项行为特征都不极端';
  return {
    card, why,
    persona: {
      name: card.name, emoji: card.emoji, tagline: card.tagline, is_fun_label: true,
      id: card.id, archetype: card.archetype, traits: card.traits, strength: card.strength, blind_spot: card.blind_spot,
      basis: card.basis, refs: card.refs, why,
      ...(also ? { also: { id: also.id, name: also.name, emoji: also.emoji, why: hits[1].why(f) } } : {}),
    },
  };
}
