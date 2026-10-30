/**
 * 证据层（纯规则）：events + levels → 每个维度的证据。
 * 每条证据都带 event_seqs，并附一个 0–1 的 value，供判断层汇总：
 * - 能力维度：value 越高表示这一条行为越"做得好"；
 * - 偏好维度：value 表示倾向位置（style 1=趋势 0=反转；research_depth 1=研究 0=直觉；risk_appetite 1=激进 0=保守）。
 * value 为 null 表示这条行为与该维度相关，但看不出方向（例如观望时无法检验信心）。
 * 收益 pnl 不参与任何能力打分。
 */
import type { Clue, DimensionId, GameEvent, LevelPlay, LevelReveal, Side } from '../shared/protocol';

export interface RawEvidence {
  dim: DimensionId;
  level_id: string;
  event_seqs: number[];
  text: string;
  value: number | null;
  /** 汇总证据的权重（默认 1）。跨关汇总的一条证据按它覆盖的关数计权。 */
  weight?: number;
}

export interface LevelFacts {
  levelId: string;
  label: string;               // "第 2 关" / "补充关"
  play: LevelPlay;
  reveal: LevelReveal;
  start?: GameEvent;
  clueOpens: GameEvent[];
  decision?: GameEvent;
  holdSteps: GameEvent[];
  stops: GameEvent[];
}

/** 规则阈值集中在这里，docs/profile.md 逐条解释。 */
export const T = {
  trendLookback: 20,         // 看决定前 20 根的涨跌判断"之前是涨还是跌"
  trendMin: 0.03,            // 20 日涨跌超过 3% 才算有方向
  volLookback: 20,
  highVol: 0.02,             // 日收益标准差 > 2% 视为高波动
  floatingLoss: -0.01,       // 浮亏超过 1% 才看加仓/减仓
  lateCut: -0.08,            // 浮亏超过 8% 才减仓/平仓，算止损偏晚
  overconfident: 0.15,       // 平均信心比实际命中率高 15 个百分点以上算信心偏高
  underconfident: 0.25,      // 平均信心比实际命中率低 25 个百分点以上算信心偏低
  thinkFullMs: 30000,        // 思考 30 秒算"想得充分"
};

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const pct = (x: number) => `${(Math.abs(x) * 100).toFixed(1)}%`;
const sideSign = (s: Side) => (s === 'long' ? 1 : s === 'short' ? -1 : 0);
const sideText = (s: Side) => (s === 'long' ? '做多' : s === 'short' ? '做空' : '观望');
const sizeText = (size: number) =>
  size >= 1 ? '满仓' : size >= 0.5 ? '半仓' : size > 0 ? '轻仓' : '空仓';
const clueSign = (c: Pick<Clue, 'signal'>) => (c.signal === 'bullish' ? 1 : c.signal === 'bearish' ? -1 : 0);
const titles = (clues: Clue[]) => clues.map((c) => `「${c.title}」`).join('');

/** 按事件分组成每关事实；关卡顺序以 level_start 出现顺序为准。 */
export function collectLevels(
  events: GameEvent[],
  levels: { play: LevelPlay; reveal: LevelReveal }[],
): LevelFacts[] {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const byId = new Map(levels.map((l) => [l.play.id, l]));
  const order: string[] = [];
  for (const e of sorted) if (e.level_id && byId.has(e.level_id) && !order.includes(e.level_id)) order.push(e.level_id);
  let mainNo = 0;
  return order.map((id) => {
    const lv = byId.get(id)!;
    const evs = sorted.filter((e) => e.level_id === id);
    const start = evs.find((e) => e.type === 'level_start');
    const supp = start?.data.is_supplementary === true;
    if (!supp) mainNo += 1;
    return {
      levelId: id,
      label: supp ? '补充关' : `第 ${mainNo} 关`,
      play: lv.play,
      reveal: lv.reveal,
      start,
      clueOpens: evs.filter((e) => e.type === 'clue_open'),
      decision: evs.find((e) => e.type === 'decision'),
      holdSteps: evs.filter((e) => e.type === 'hold_step').sort((a, b) => num(a.data.step) - num(b.data.step)),
      stops: evs.filter((e) => e.type === 'stop_triggered'),
    };
  });
}

function closeAt(play: LevelPlay, t: number): number | undefined {
  return play.bars.find((b) => b.t === t)?.c;
}

/** 决定前 lookback 根的涨跌幅（只用 t<=0 的可见数据）。 */
export function priorTrend(play: LevelPlay, lookback = T.trendLookback): number | null {
  const c0 = closeAt(play, 0);
  const minT = Math.min(...play.bars.map((b) => b.t));
  const cp = closeAt(play, Math.max(-lookback, minT));
  if (c0 === undefined || cp === undefined || cp === 0) return null;
  return c0 / cp - 1;
}

/** 决定前 lookback 根的日收益标准差（只用 t<=0 的可见数据）。 */
export function visibleVolatility(play: LevelPlay, lookback = T.volLookback): number | null {
  const bars = play.bars.filter((b) => b.t <= 0 && b.t >= -lookback).sort((a, b) => a.t - b.t);
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) if (bars[i - 1].c) rets.push(bars[i].c / bars[i - 1].c - 1);
  if (rets.length < 5) return null;
  const m = rets.reduce((s, r) => s + r, 0) / rets.length;
  return Math.sqrt(rets.reduce((s, r) => s + (r - m) ** 2, 0) / rets.length);
}

function openedClues(f: LevelFacts): Clue[] {
  const ids = new Set<string>(f.clueOpens.map((e) => str(e.data.clue_id)));
  const fromDecision = f.decision?.data.clues_opened;
  if (Array.isArray(fromDecision)) for (const id of fromDecision) if (typeof id === 'string') ids.add(id);
  return f.play.clues.filter((c) => ids.has(c.id));
}

const seqs = (...evs: (GameEvent | undefined)[]) => evs.filter((e): e is GameEvent => !!e).map((e) => e.seq);

/* ---------------- 能力：证据使用 ---------------- */
function evidenceUse(f: LevelFacts): RawEvidence[] {
  const out: RawEvidence[] = [];
  const d = f.decision;
  if (!d) return out;
  const side = str(d.data.side) as Side;
  const opened = openedClues(f);
  const openSeqs = [...seqs(...f.clueOpens), d.seq];
  const key = f.play.clues.filter((c) => f.reveal.key_clue_ids.includes(c.id));
  const base = { dim: 'evidence_use' as const, level_id: f.levelId, event_seqs: openSeqs };

  // 1) 关键线索覆盖
  if (key.length) {
    const hit = key.filter((c) => opened.includes(c));
    const miss = key.filter((c) => !opened.includes(c));
    const ratio = hit.length / key.length;
    const text = hit.length === key.length
      ? `${f.label}翻开了全部关键线索${titles(key)}`
      : hit.length === 0
        ? `${f.label}没有翻开任何关键线索（本关关键是${titles(key)}）`
        : `${f.label}翻开了关键线索${titles(hit)}，漏看了${titles(miss)}`;
    out.push({ ...base, text, value: 0.15 + 0.75 * ratio });
  }

  // 2) 决定方向与已翻线索是否一致
  const net = opened.reduce((s, c) => s + clueSign(c), 0);
  const sign = sideSign(side);
  if (opened.length === 0) {
    out.push(sign === 0
      ? { ...base, text: `${f.label}一张线索没翻就选择观望，看不出如何使用证据`, value: null }
      : { ...base, text: `${f.label}一张线索没翻就${sideText(side)}`, value: 0.15 });
  } else if (sign !== 0 && net !== 0) {
    const agree = Math.sign(net) === sign;
    out.push({
      ...base,
      text: agree
        ? `${f.label}翻开的线索整体${net > 0 ? '看涨' : '看跌'}，决定${sideText(side)}与线索一致`
        : `${f.label}翻开的线索整体${net > 0 ? '看涨' : '看跌'}，却选择${sideText(side)}，决定与证据相反`,
      // 只翻了 1 张就下单，"一致"说明不了多少，权重放轻
      value: opened.length >= 2 ? (agree ? 0.8 : 0.2) : (agree ? 0.6 : 0.3),
    });
  } else if (sign === 0 && net === 0 && opened.some((c) => c.signal !== 'neutral')) {
    out.push({ ...base, text: `${f.label}看到多空线索互相抵消后选择观望，和证据一致`, value: 0.7 });
  } else if (sign === 0 && net !== 0) {
    out.push({ ...base, text: `${f.label}线索整体${net > 0 ? '看涨' : '看跌'}，但仍选择观望`, value: null });
  }

  // 3) 确认偏误：翻了 ≥2 张且全部和自己方向一致，反向线索没翻，同时还漏了关键线索
  const missedKey = key.some((c) => !opened.includes(c));
  if (sign !== 0 && missedKey && opened.length >= 2 && opened.every((c) => clueSign(c) === sign)) {
    const unopenedOpp = f.play.clues.filter((c) => !opened.includes(c) && clueSign(c) === -sign);
    if (unopenedOpp.length) {
      out.push({ ...base, text: `${f.label}只翻了支持${sideText(side)}的线索，没看反方向的${titles(unopenedOpp)}`, value: 0.25 });
    }
  }
  return out;
}

/* ---------------- 能力：判断校准（不看赚多少） ---------------- */
/** 信心 1–5 视为"自认为判断正确的概率" 50%–90%。 */
const confToProb = (conf: number) => 0.4 + conf * 0.1;

/**
 * 跨关汇总：平均信心（换算成概率）和实际命中率比较。
 * 单关的对错有运气成分，这条汇总证据按可检验的关数计权，是校准判断的主要依据。
 */
function calibrationOverall(facts: LevelFacts[]): RawEvidence[] {
  const checked = facts.flatMap((f) => {
    const d = f.decision;
    const side = str(d?.data.side) as Side;
    const dir = f.reveal.outcome.direction;
    if (!d || side === 'flat' || dir === 'flat') return [];
    const conf = Math.min(5, Math.max(1, Math.round(num(d.data.confidence, 3))));
    return [{ f, d, conf, right: (dir === 'up') === (side === 'long') }];
  });
  if (checked.length < 2) return [];
  const avgConf = checked.reduce((s, x) => s + x.conf, 0) / checked.length;
  const avgP = confToProb(avgConf);
  const hits = checked.filter((x) => x.right).length;
  const gap = avgP - hits / checked.length;
  const value = Math.max(0, Math.min(1, 1 - 2 * Math.max(0, gap) - Math.max(0, -gap)));
  const verdict = gap > T.overconfident ? '信心偏高' : gap < -T.underconfident ? '信心偏低' : '信心和命中率大致匹配';
  const last = checked[checked.length - 1];
  return [{
    dim: 'calibration', level_id: last.f.levelId, event_seqs: [last.d.seq], value, weight: checked.length,
    text: `截至${last.f.label}，${checked.length} 次可检验的判断平均信心 ${avgConf.toFixed(1)}/5（约 ${Math.round(avgP * 100)}% 把握），实际对了 ${hits} 次（${Math.round((hits / checked.length) * 100)}%）：${verdict}`,
  }];
}

function calibration(f: LevelFacts): RawEvidence[] {
  const d = f.decision;
  if (!d) return [];
  const side = str(d.data.side) as Side;
  const conf = Math.min(5, Math.max(1, Math.round(num(d.data.confidence, 3))));
  const base = { dim: 'calibration' as const, level_id: f.levelId, event_seqs: [d.seq] };
  if (side === 'flat') return [{ ...base, text: `${f.label}选择观望，这关无法检验信心是否准确`, value: null }];
  const dir = f.reveal.outcome.direction;
  if (dir === 'flat') return [{ ...base, text: `${f.label}之后走势横盘，${sideText(side)}的对错不明显`, value: null }];
  const right = (dir === 'up') === (side === 'long');
  const p = confToProb(conf);
  const value = 1 - (p - (right ? 1 : 0)) ** 2 / 0.81;
  const verdict = right
    ? conf >= 4 ? '信心高且方向判断正确' : '方向对了，但信心给得偏低'
    : conf >= 4 ? '信心很高，但方向判断错了' : '方向错了，好在信心本来就不高';
  return [{ ...base, text: `${f.label}信心 ${conf}/5，${sideText(side)}，之后${dir === 'up' ? '上涨' : '下跌'}：${verdict}`, value }];
}

/* ---------------- 能力：风险控制 ---------------- */
function riskControl(f: LevelFacts): RawEvidence[] {
  const d = f.decision;
  if (!d) return [];
  const out: RawEvidence[] = [];
  const side = str(d.data.side) as Side;
  const size = num(d.data.size);
  const stop = d.data.stop;
  const base = { dim: 'risk_control' as const, level_id: f.levelId };
  const vol = visibleVolatility(f.play);

  if (side !== 'flat' && size > 0) {
    // 1) 止损
    if (typeof stop === 'number' && stop > 0) {
      const fired = f.stops[0];
      out.push({ ...base, event_seqs: seqs(d, fired), value: 0.85,
        text: fired
          ? `${f.label}设了 ${pct(stop)} 止损，并在第 ${num(fired.data.step)} 步自动触发，把亏损控制在 ${pct(num(fired.data.pnl))}`
          : `${f.label}${sizeText(size)}${sideText(side)}时设了 ${pct(stop)} 止损` });
    } else if (size >= 0.5) {
      out.push({ ...base, event_seqs: [d.seq], value: 0.2, text: `${f.label}${sizeText(size)}${sideText(side)}却没有设止损` });
    } else {
      out.push({ ...base, event_seqs: [d.seq], value: 0.55, text: `${f.label}轻仓没设止损，风险本身不大` });
    }
    // 2) 仓位与波动是否匹配
    if (vol !== null && vol > T.highVol) {
      if (size >= 1) out.push({ ...base, event_seqs: [d.seq], value: 0.2, text: `${f.label}走势波动大（日波动约 ${pct(vol)}），仍然满仓` });
      else out.push({ ...base, event_seqs: [d.seq], value: 0.75, text: `${f.label}走势波动大（日波动约 ${pct(vol)}），只用了${sizeText(size)}` });
    }
  }

  // 3) 浮亏时加仓还是减仓（按每步之前的持仓）
  let position = sideSign(side) * size;
  for (const h of f.holdSteps) {
    const pnl = num(h.data.pnl_before);
    const action = str(h.data.action);
    if (position !== 0 && pnl < T.floatingLoss) {
      const label = `${f.label}第 ${num(h.data.step)} 步浮亏 ${pct(pnl)} 时`;
      const cut = action === 'close' ? '平仓' : '减仓';
      if (action === 'add') out.push({ ...base, event_seqs: [h.seq], value: 0.1, text: `${label}选择加仓` });
      else if ((action === 'reduce' || action === 'close') && pnl < T.lateCut) out.push({ ...base, event_seqs: [h.seq], value: 0.6, text: `${label}才${cut}，止损偏晚` });
      else if (action === 'reduce' || action === 'close') out.push({ ...base, event_seqs: [h.seq], value: 0.85, text: `${label}选择${cut}` });
      else out.push({ ...base, event_seqs: [h.seq], value: 0.45, text: `${label}继续持有` });
    }
    position = num(h.data.position_after, position);
  }
  return out;
}

/* ---------------- 偏好：趋势 vs 反转 ---------------- */
function style(f: LevelFacts): RawEvidence[] {
  const d = f.decision;
  if (!d) return [];
  const side = str(d.data.side) as Side;
  const tr = priorTrend(f.play);
  if (tr === null || Math.abs(tr) < T.trendMin || side === 'flat') return [];
  const up = tr > 0;
  const follow = (up && side === 'long') || (!up && side === 'short');
  return [{
    dim: 'style', level_id: f.levelId, event_seqs: [d.seq], value: follow ? 1 : 0,
    text: `${f.label}决定前 ${T.trendLookback} 天${up ? '上涨' : '下跌'} ${pct(tr)}，选择${sideText(side)}（${follow ? '顺势' : '逆势'}）`,
  }];
}

/* ---------------- 偏好：研究深度 ---------------- */
function researchDepth(f: LevelFacts): RawEvidence[] {
  const d = f.decision;
  if (!d) return [];
  const budget = num(f.start?.data.budget, f.play.budget) || f.play.budget;
  const spent = openedClues(f).reduce((s, c) => s + c.cost, 0);
  const ratio = budget > 0 ? Math.min(1, spent / budget) : 0;
  const think = num(d.data.think_ms, d.t_ms);
  const value = 0.6 * ratio + 0.4 * Math.min(1, think / T.thinkFullMs);
  return [{
    dim: 'research_depth', level_id: f.levelId, event_seqs: [...seqs(...f.clueOpens), d.seq], value,
    text: `${f.label}${budget} 个研究点用了 ${spent} 个，思考 ${Math.round(think / 1000)} 秒后决定`,
  }];
}

/* ---------------- 偏好：风险偏好 ---------------- */
function riskAppetite(f: LevelFacts): RawEvidence[] {
  const d = f.decision;
  if (!d) return [];
  const side = str(d.data.side) as Side;
  const size = side === 'flat' ? 0 : num(d.data.size);
  const adds = f.holdSteps.filter((h) => h.data.action === 'add');
  const value = Math.min(1, size + 0.15 * adds.length);
  const addText = adds.length ? `，之后又加仓 ${adds.length} 次` : '';
  return [{
    dim: 'risk_appetite', level_id: f.levelId, event_seqs: seqs(d, ...adds), value,
    text: side === 'flat'
      ? `${f.label}选择观望不入场${adds.length ? `，揭晓途中入场 ${adds.length} 次` : ''}`
      : `${f.label}${sizeText(size)}${sideText(side)}${addText}`,
  }];
}

export function extractEvidence(
  events: GameEvent[],
  levels: { play: LevelPlay; reveal: LevelReveal }[],
): RawEvidence[] {
  const facts = collectLevels(events, levels);
  return [
    ...facts.flatMap((f) => [
      ...evidenceUse(f), ...calibration(f), ...riskControl(f),
      ...style(f), ...researchDepth(f), ...riskAppetite(f),
    ]),
    ...calibrationOverall(facts),
  ];
}
