/**
 * 判断层（规则）：证据 → 维度判断、分数、置信度、冲突和不确定项。
 */
import type { Dimension, DimensionId, EvidenceItem } from '../shared/protocol';
import type { RawEvidence } from './evidence';

interface DimSpec {
  id: DimensionId;
  group: 'ability' | 'preference';
  name: string;
  /** 分数 → 判断，三档：高 / 中 / 低 */
  high: string; mid: string; low: string;
  /** 证据不足时还不确定什么 */
  unknown: string;
  /** 证据冲突时还不确定什么 */
  conflict: string;
  /** 证据只有 1 关时还不确定什么 */
  thin: string;
}

export const DIMS: DimSpec[] = [
  { id: 'evidence_use', group: 'ability', name: '证据使用',
    high: '会先找关键线索，决定和证据一致', mid: '会看线索，但关键线索常有遗漏', low: '倾向先下结论，较少依据线索',
    unknown: '还没有足够的决定可以看出怎么用线索',
    conflict: '有时紧跟证据、有时与证据相反，还不清楚是看不懂线索还是有意逆向判断',
    thin: '只有 1 关证据，还不清楚是不会看关键线索，还是不想花研究点' },
  { id: 'calibration', group: 'ability', name: '判断校准',
    high: '信心和对错比较匹配', mid: '信心和对错时准时不准', low: '信心和实际对错不匹配',
    unknown: '还没有做出可检验的方向判断（观望或横盘），无法评估信心准不准',
    conflict: '有的关信心和结果很匹配、有的关差得很远，可能受行情难度影响',
    thin: '只有 1 次可检验的判断，一次对错可能只是运气' },
  { id: 'risk_control', group: 'ability', name: '风险控制',
    high: '会用止损和仓位管住风险', mid: '有风险意识，但执行不稳定', low: '风险敞口偏大，浮亏时不太收手',
    unknown: '还没有真正入场持仓，看不出遇到浮亏会怎么做',
    conflict: '有时及时止损、有时浮亏加仓，还不清楚哪种才是习惯',
    thin: '只有 1 关持仓记录，还不清楚遇到不同行情时是否一致' },
  { id: 'style', group: 'preference', name: '趋势 vs 反转',
    high: '偏趋势跟随：涨了追、跌了空', mid: '趋势和反转都做，没有明显偏好', low: '偏逆势反转：涨多了空、跌多了买',
    unknown: '还没有在明显上涨或下跌的行情里下过方向，看不出偏好',
    conflict: '顺势和逆势都做过，可能是在看具体线索而不是固定风格',
    thin: '只在 1 关有明显趋势时下过单，还不能说是稳定偏好' },
  { id: 'research_depth', group: 'preference', name: '研究深度',
    high: '偏研究型：先把研究点用足再决定', mid: '研究和直觉兼顾', low: '偏直觉型：很少翻线索、决定快',
    unknown: '还没有足够的决定记录',
    conflict: '有的关研究很久、有的关秒下决定，可能和行情是否一眼看清有关',
    thin: '只有 1 关记录，还不清楚是习惯还是这关碰巧' },
  { id: 'risk_appetite', group: 'preference', name: '风险偏好',
    high: '偏激进：常常重仓、愿意加仓', mid: '仓位适中', low: '偏保守：轻仓或观望为主',
    unknown: '还没有足够的仓位记录',
    conflict: '有时满仓有时观望，仓位跟着信心大幅波动',
    thin: '只有 1 关仓位记录，还不能说是稳定偏好' },
];

const STRONG = 0.2;   // |value-0.5| ≥ 0.2 才算"有明确方向"的证据

export interface Judged extends Dimension { levelsWithSignal: number; consistency: number }

function judgeOne(spec: DimSpec, raw: RawEvidence[]): Judged {
  const valued = raw.filter((r) => r.value !== null) as (RawEvidence & { value: number })[];
  const w = (r: RawEvidence) => r.weight ?? 1;
  const sum = (xs: RawEvidence[]) => xs.reduce((s, r) => s + w(r), 0);
  const score = valued.length ? valued.reduce((s, r) => s + r.value * w(r), 0) / sum(valued) : null;
  const levels = new Set(valued.filter((r) => !r.weight || r.weight === 1).map((r) => r.level_id)).size;

  // 一致性：有明确方向的证据里（按权重），和多数方向同一侧的比例
  const strong = valued.filter((r) => Math.abs(r.value - 0.5) >= STRONG);
  const hi = sum(strong.filter((r) => r.value > 0.5));
  const lo = sum(strong) - hi;
  const total = hi + lo;
  const consistency = total ? Math.max(hi, lo) / total : 1;
  const conflict = hi > 0 && lo > 0 && Math.min(hi, lo) / total >= 1 / 3;

  let confidence: Dimension['confidence'] = 'low';
  if (score !== null && levels >= 3 && consistency >= 0.8 && !conflict) confidence = 'high';
  else if (score !== null && levels >= 2 && consistency >= 0.6) confidence = 'medium';

  let judgement: string;
  if (score === null) judgement = '证据不足，暂不下结论';
  else judgement = score >= 0.65 ? spec.high : score <= 0.35 ? spec.low : spec.mid;

  let uncertain = '';
  if (score === null) uncertain = spec.unknown;
  else if (conflict) uncertain = spec.conflict;
  else if (levels < 2) uncertain = spec.thin;
  else if (confidence === 'medium') uncertain = `证据来自 ${levels} 关，方向基本一致，再多几关会更有把握`;

  const side = score === null ? 0 : score >= 0.5 + 0.05 ? 1 : score <= 0.5 - 0.05 ? -1 : 0;
  const evidence: EvidenceItem[] = raw.map((r) => ({
    level_id: r.level_id,
    event_seqs: r.event_seqs,
    text: r.text,
    direction: r.value === null || side === 0 || Math.abs(r.value - 0.5) < 0.1
      ? '?'
      : (r.value > 0.5 ? 1 : -1) === side ? '+' : '-',
  }));

  return {
    id: spec.id, group: spec.group, name: spec.name, judgement,
    score: score === null ? null : Math.round(score * 100) / 100,
    evidence, confidence, uncertain, conflict,
    levelsWithSignal: levels, consistency,
  };
}

export function judge(raw: RawEvidence[]): Judged[] {
  return DIMS.map((spec) => judgeOne(spec, raw.filter((r) => r.dim === spec.id)));
}

export const CONF_RANK: Record<Dimension['confidence'], number> = { low: 0, medium: 1, high: 2 };
