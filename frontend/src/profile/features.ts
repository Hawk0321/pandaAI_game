/**
 * 特征层：一局的事件 + 关卡 → 一组会话级行为特征（数字），位于"事件"和"画像"之间。
 * - 人物卡直接由这些特征判别（persona.ts），不依赖维度分数，极简规则就能区分玩家；
 * - 证据层 / 判断层仍负责逐条证据和置信度。
 * 每个特征带样本量 n，n 不够时值为 null，不硬算。定义见 docs/features.md。
 */
import type { GameEvent, LevelPlay, LevelReveal, Side } from '../shared/protocol';
import { T, collectLevels, priorTrend, type LevelFacts } from './evidence';

export interface Feature { value: number | null; n: number }

export interface Features {
  levels: number;               // 玩了几关
  flat_rate: Feature;           // 观望比例（决定时 side=flat）
  avg_size: Feature;            // 平均仓位（观望计 0）
  stop_rate: Feature;           // 入场的关里设止损的比例
  add_on_loss: Feature;         // 浮亏时加仓的次数（"摊平"）
  cut_on_loss: Feature;         // 浮亏时减仓/平仓的次数
  research_spend: Feature;      // 研究点使用率
  think_sec: Feature;           // 决定用时中位数（秒）
  key_clue_hit: Feature;        // 关键线索命中率
  clue_agree: Feature;          // 入场方向与已翻线索合计方向一致的比例
  confirm_only: Feature;        // 只翻支持自己方向的线索、漏看关键线索的次数
  trend_follow: Feature;        // 有明显趋势的关里顺势下单的比例
  avg_confidence: Feature;      // 入场时平均信心（1–5）
  hit_rate: Feature;            // 方向命中率（只作参考，不进能力）
  overconfidence: Feature;      // 平均信心换算的把握 − 命中率
  reveal_dwell_sec: Feature;    // 揭晓页停留中位数（秒，来自 C）
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const mean = (xs: number[]): Feature => ({ value: xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null, n: xs.length });
const median = (xs: number[]): Feature => {
  if (!xs.length) return { value: null, n: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return { value: s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2, n: xs.length };
};
const count = (k: number, n: number): Feature => ({ value: k, n });
const sign = (s: Side) => (s === 'long' ? 1 : s === 'short' ? -1 : 0);

function decision(f: LevelFacts) {
  const d = f.decision?.data ?? {};
  const side = ((d.side as Side) ?? 'flat');
  return { side, size: side === 'flat' ? 0 : num(d.size), stop: typeof d.stop === 'number' && d.stop > 0 ? d.stop : null,
    confidence: Math.min(5, Math.max(1, Math.round(num(d.confidence, 3)))), think: num(d.think_ms, f.decision?.t_ms ?? 0) };
}
function opened(f: LevelFacts) {
  const ids = new Set(f.clueOpens.map((e) => String(e.data.clue_id)));
  const fromDecision = f.decision?.data.clues_opened;
  if (Array.isArray(fromDecision)) for (const id of fromDecision) if (typeof id === 'string') ids.add(id);
  return f.play.clues.filter((c) => ids.has(c.id));
}

export function computeFeatures(events: GameEvent[], levels: { play: LevelPlay; reveal: LevelReveal }[]): Features {
  const facts = collectLevels(events, levels).filter((f) => f.decision);
  const ds = facts.map(decision);
  const entered = facts.map((f, i) => ({ f, d: ds[i] })).filter((x) => x.d.side !== 'flat');

  let addLoss = 0; let cutLoss = 0;
  for (const { f, d } of facts.map((f, i) => ({ f, d: ds[i] }))) {
    let pos = sign(d.side) * d.size;
    let prev = f.decision!.seq;
    for (const h of f.holdSteps) {
      if (f.stops.some((s) => s.seq > prev && s.seq < h.seq)) pos = 0;  // 自动止损先清空持仓
      if (pos !== 0 && num(h.data.pnl_before) < T.floatingLoss) {
        if (h.data.action === 'add') addLoss += 1;
        if (h.data.action === 'reduce' || h.data.action === 'close') cutLoss += 1;
      }
      pos = num(h.data.position_after, pos);
      prev = h.seq;
    }
  }

  const agree: number[] = []; let confirm = 0;
  for (const { f, d } of entered) {
    const op = opened(f);
    const net = op.reduce((s, c) => s + (c.signal === 'bullish' ? 1 : c.signal === 'bearish' ? -1 : 0), 0);
    if (net !== 0) agree.push(Math.sign(net) === sign(d.side) ? 1 : 0);
    const keyMissed = f.reveal.key_clue_ids.some((k) => !op.some((c) => c.id === k));
    const allSame = op.length >= 2 && op.every((c) => (c.signal === 'bullish' ? 1 : c.signal === 'bearish' ? -1 : 0) === sign(d.side));
    if (keyMissed && allSame) confirm += 1;
  }

  const trend: number[] = [];
  for (const { f, d } of entered) {
    const tr = priorTrend(f.play);
    if (tr !== null && Math.abs(tr) >= T.trendMin) trend.push((tr > 0) === (d.side === 'long') ? 1 : 0);
  }

  const checked = entered.filter(({ f }) => f.reveal.outcome.direction !== 'flat');
  const hits = checked.map(({ f, d }) => ((f.reveal.outcome.direction === 'up') === (d.side === 'long') ? 1 : 0));
  const hit = mean(hits);
  const avgP = mean(checked.map(({ d }) => 0.4 + d.confidence * 0.1));
  const overconfidence: Feature = checked.length >= 2 && hit.value !== null && avgP.value !== null
    ? { value: avgP.value - hit.value, n: checked.length } : { value: null, n: checked.length };

  const dwell = events.filter((e) => e.type === 'reveal_view').map((e) => num(e.data.dwell_ms) / 1000);

  return {
    levels: facts.length,
    flat_rate: mean(ds.map((d) => (d.side === 'flat' ? 1 : 0))),
    avg_size: mean(ds.map((d) => d.size)),
    stop_rate: mean(entered.map(({ d }) => (d.stop !== null ? 1 : 0))),
    add_on_loss: count(addLoss, facts.length),
    cut_on_loss: count(cutLoss, facts.length),
    research_spend: mean(facts.map((f) => {
      const budget = num(f.start?.data.budget, f.play.budget) || f.play.budget;
      return budget > 0 ? Math.min(1, opened(f).reduce((s, c) => s + c.cost, 0) / budget) : 0;
    })),
    think_sec: median(ds.map((d) => d.think / 1000)),
    key_clue_hit: mean(facts.filter((f) => f.reveal.key_clue_ids.length).map((f) => {
      const op = opened(f);
      return f.reveal.key_clue_ids.filter((k) => op.some((c) => c.id === k)).length / f.reveal.key_clue_ids.length;
    })),
    clue_agree: mean(agree),
    confirm_only: count(confirm, entered.length),
    trend_follow: mean(trend),
    avg_confidence: mean(entered.map(({ d }) => d.confidence)),
    hit_rate: hit,
    overconfidence,
    reveal_dwell_sec: median(dwell),
  };
}
