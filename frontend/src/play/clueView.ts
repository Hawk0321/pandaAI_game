/**
 * 线索卡的"人话版"：把关卡数据里的专业表述翻译成一句结论 + 一个方向标 + 一个小图。
 *
 * 为什么放在前端而不改关卡数据：线索文字由 backend/levels/build.py 生成并有离线校验，
 * 画像只依赖线索的 id / kind / signal，不依赖文字。这里只改"怎么展示"，原文一字不动地留在「看数据」里。
 * 提取不到数字（旧数据、文案改版）时返回 null，界面退回显示原文，不会白屏也不会瞎编。
 *
 * 只用卡面已有的信息（text、series、signal），不引入任何决定时刻之后的数据。
 */
import type { Clue } from '../shared/protocol';

export type Lean = 'up' | 'down' | 'flat';

export interface ClueView {
  /** 玩家看的名字，替换「均线方向」「历史信号核验」这类标题 */
  name: string;
  /** 一句话结论，不含专业缩写 */
  verdict: string;
  /** 这张线索本身指向哪边：偏多 / 偏空 / 看不出 */
  lean: Lean;
  leanText: string;
  /** 小图：折线 / 柱 / 进度条 / 区间，只给 UI 画，值已归一到 0–1 */
  chart?:
    | { kind: 'line'; values: number[]; compare?: number[] }
    | { kind: 'bars'; values: number[] }
    | { kind: 'meter'; value: number; label: string }
    | { kind: 'range'; position: number; label: string };
  /** 一句提醒，来自原文里的免责/限定，用人话重写 */
  caveat?: string;
}

const LEAN: Record<Clue['signal'], { lean: Lean; leanText: string }> = {
  bullish: { lean: 'up', leanText: '偏多' },
  bearish: { lean: 'down', leanText: '偏空' },
  neutral: { lean: 'flat', leanText: '看不出方向' },
};

const num = (text: string, pattern: RegExp): number | null => {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replace('+', ''));
  return Number.isFinite(value) ? value : null;
};

/** 把一串数值压到 0–1，方便画小图；全相等时画成一条中线。 */
export function normalize(values: number[]): number[] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [];
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  if (high === low) return finite.map(() => 0.5);
  return finite.map((value) => (value - low) / (high - low));
}

const pct = (value: number, digits = 1) => `${Math.abs(value).toFixed(digits)}%`;

function volume(clue: Clue): ClueView | null {
  const ratio = num(clue.text, /是此前 20 日均量的\s*([\d.]+)\s*倍/);
  const move = num(clue.text, /近 5 日价格变动\s*([+-]?[\d.]+)%/);
  if (ratio === null) return null;
  const heat = ratio >= 1.5 ? '成交明显放大，很多人在交易' : ratio >= 1.15 ? '成交比平时多一些' : ratio <= 0.7 ? '成交很清淡，没什么人参与' : ratio <= 0.9 ? '成交比平时少一些' : '成交和平时差不多';
  const price = move === null ? '' : move > 0.3 ? `，价格近 5 天涨了 ${pct(move)}` : move < -0.3 ? `，价格近 5 天跌了 ${pct(move)}` : '，价格近 5 天基本没动';
  return {
    name: '交易热度', verdict: `${heat}${price}。`, ...LEAN[clue.signal],
    chart: clue.series && clue.series.length > 1 ? { kind: 'bars', values: normalize(clue.series) } : undefined,
    caveat: '放量不等于一定会涨或会跌。',
  };
}

function trend(clue: Clue): ClueView | null {
  const gap = num(clue.text, /短均线相对长均线\s*([+-]?[\d.]+)%/);
  if (gap === null) return null;
  const verdict = gap >= 2 ? `近期价格明显高于一个月的平均水平（高 ${pct(gap)}），走势向上。` : gap > 0.3 ? `近期价格略高于一个月的平均水平（高 ${pct(gap)}），有点向上。`
    : gap <= -2 ? `近期价格明显低于一个月的平均水平（低 ${pct(gap)}），走势向下。` : gap < -0.3 ? `近期价格略低于一个月的平均水平（低 ${pct(gap)}），有点向下。` : '近期价格和一个月的平均水平几乎一样，没有明显趋势。';
  return { name: '近期趋势', verdict, ...LEAN[clue.signal], chart: clue.series && clue.series.length > 1 ? { kind: 'line', values: normalize(clue.series) } : undefined };
}

function market(clue: Clue): ClueView | null {
  const move = num(clue.text, /近 5 个交易日变动\s*([+-]?[\d.]+)%/);
  if (move === null) return null;
  const verdict = move >= 1.5 ? `整个大盘最近一周涨了 ${pct(move)}，市场情绪偏暖。` : move > 0.3 ? `整个大盘最近一周小涨 ${pct(move)}。` : move <= -1.5 ? `整个大盘最近一周跌了 ${pct(move)}，市场情绪偏冷。` : move < -0.3 ? `整个大盘最近一周小跌 ${pct(move)}。` : '整个大盘最近一周几乎没动。';
  const cross = clue.text.includes('跨市场');
  return { name: '大盘冷暖', verdict, ...LEAN[clue.signal], chart: clue.series && clue.series.length > 1 ? { kind: 'line', values: normalize(clue.series) } : undefined, caveat: cross ? '这只标的不属于股票大盘，只能当背景，别直接据此买卖。' : undefined };
}

function track(clue: Clue): ClueView | null {
  const total = num(clue.text, /在\s*(\d+)\s*次下一日检验/);
  const hit = num(clue.text, /命中\s*(\d+)\s*次/);
  if (total === null || hit === null || total === 0) return null;
  const rate = hit / total;
  const verdict = rate >= 0.55 ? `这条规律过去 ${total} 次里对了 ${hit} 次，有一定参考价值。` : rate <= 0.45 ? `这条规律过去 ${total} 次里只对了 ${hit} 次，还不如抛硬币，别太信。` : `这条规律过去 ${total} 次里对了 ${hit} 次，和抛硬币差不多。`;
  return { name: '过去准不准', verdict, ...LEAN[clue.signal], chart: { kind: 'meter', value: rate, label: `${hit} / ${total} 次` }, caveat: '只用了这一段之前的历史，次数不多，没算手续费。' };
}

function swing(clue: Clue): ClueView | null {
  const daily = num(clue.text, /ATR14 约为现价的\s*([\d.]+)%/);
  const multiple = num(clue.text, /约相当于\s*([\d.]+)\s*倍历史日波动/);
  if (daily === null) return null;
  const level = daily >= 3 ? '波动很大' : daily >= 1.8 ? '波动中等' : '波动较小';
  const guard = multiple === null ? '' : multiple >= 4 ? ' 设「亏 5% 就自动卖出」，离日常波动比较远，不容易被误触发。' : multiple >= 2 ? ' 设「亏 5% 就自动卖出」，大致相当于几天的正常波动。' : ' 设「亏 5% 就自动卖出」，正常波动就可能碰到，容易被提前赶下车。';
  return { name: '每天晃多大', verdict: `平时每天大约上下晃 ${pct(daily)}，${level}。${guard}`.replace('。 ', '。'), ...LEAN[clue.signal], chart: { kind: 'meter', value: Math.min(daily / 5, 1), label: `日均约 ${pct(daily)}` }, caveat: '这张只告诉你风险有多大，不提示涨还是跌。' };
}

function breakout(clue: Clue): ClueView | null {
  const high = num(clue.text, /本根最高价相对前高\s*([+-]?[\d.]+)%/);
  const close = num(clue.text, /收盘相对前高\s*([+-]?[\d.]+)%/);
  if (high === null || close === null) return null;
  const verdict = high > 0 && close <= 0 ? '今天盘中一度冲到近 20 天最高价之上，但收盘又掉了回来，没站稳。'
    : close > 0 ? '今天收盘价站上了近 20 天的最高价，突破有了确认。'
      : `今天离近 20 天的最高价还差 ${pct(close)}，还没有突破。`;
  const position = Math.max(0, Math.min(1, 1 + close / 5));
  return { name: '有没有突破', verdict, ...LEAN[clue.signal], chart: { kind: 'range', position, label: close > 0 ? '已站上前高' : '前高在上方' }, caveat: '盘中冲高不算数，要收盘站住才算。' };
}

const BUILDERS: Record<string, (clue: Clue) => ClueView | null> = { vol: volume, ma: trend, index: market, backtest: track, risk: swing, breakout };

/** 卡片正面（还没翻开时）显示的名字：认得的线索用人话名，不认得的保留原标题。 */
export const CLUE_NAMES: Record<string, string> = { vol: '交易热度', ma: '近期趋势', index: '大盘冷暖', backtest: '过去准不准', risk: '每天晃多大', breakout: '有没有突破' };
/** 没翻开时的一句话预告：这张线索能回答什么问题，帮玩家决定值不值得花点数。 */
export const CLUE_TEASERS: Record<string, string> = { vol: '现在有多少人在买卖？', ma: '价格是在往上走还是往下走？', index: '整个市场的情绪怎么样？', backtest: '照这个趋势规律操作，过去灵不灵？', risk: '每天价格晃得厉不厉害？', breakout: '有没有真的冲过前面的高点？' };
export const clueTeaser = (clue: Clue): string => CLUE_TEASERS[clue.id] ?? '点击翻开线索';
export const clueName = (clue: Clue): string => CLUE_NAMES[clue.id] ?? clue.title;

/** 按线索 id 生成人话版；id 不认识或数字提取失败时返回 null，由界面显示原文。 */
export function clueView(clue: Clue): ClueView | null {
  try { return BUILDERS[clue.id]?.(clue) ?? null; } catch { return null; }
}
