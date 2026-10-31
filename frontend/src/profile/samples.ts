/**
 * 模拟数据生成（仅测试与演示用，全部 is_sample: true，未调用 Panda Data）：
 * - 6 关模拟关卡 S01–S06（4 关主线 + 2 关补充池），行情用确定性公式生成；
 * - 3 组模拟玩家（谨慎研究型、冲动重仓型、只看不做型）的事件。
 * 产物写在 data/samples/profile/，由 samples.test.ts 校验；改了这里后运行
 * `UPDATE_SAMPLES=1 npx vitest run src/profile/samples.test.ts` 重新生成。
 */
import type { Bar, Clue, DimensionId, LevelIndex, LevelPlay, LevelReveal } from '../shared/protocol';
import { buildEvents, type LevelScript } from './testkit';

interface LevelSpec {
  id: string;
  masked_name: string;
  scenario: LevelReveal['scenario'];
  prior: number;        // 决定前 20 根的总涨跌
  early: number;        // t=-59…-20 的总涨跌
  vol: number;          // 日波动幅度
  after: number;        // t=1…15 的总涨跌
  clues: Clue[];
  key: string[];
}

const c = (id: string, kind: Clue['kind'], title: string, signal: Clue['signal'], text: string, cost = 1): Clue =>
  ({ id, kind, title, cost, text, signal });

export const LEVEL_SPECS: LevelSpec[] = [
  { id: 'S01', masked_name: '某消费龙头（模拟）', scenario: 'uptrend', prior: 0.12, early: 0.05, vol: 0.012, after: 0.08, key: ['vol', 'idx'], clues: [
    c('ma', 'ma', '均线', 'bullish', '5 日、20 日、60 日均线多头排列。'),
    c('vol', 'volume', '成交量', 'bullish', '上涨日的成交量是下跌日的 1.6 倍，量价配合。'),
    c('idx', 'index', '同期大盘', 'bullish', '同期大盘上涨 6%，板块领涨。'),
    c('margin', 'margin', '融资余额', 'neutral', '近 10 天融资余额基本持平。'),
    c('bt', 'backtest', '趋势回测', 'bullish', '可见区间内，多头排列后 10 天上涨的比例为 5/7。', 2)] },
  { id: 'S02', masked_name: '某券商股（模拟）', scenario: 'crash', prior: 0.15, early: 0.02, vol: 0.028, after: -0.15, key: ['vol', 'nb'], clues: [
    c('ma', 'ma', '均线', 'bullish', '股价远在 20 日均线上方，短期趋势向上。'),
    c('vol', 'volume', '成交量', 'bearish', '最近 3 天放出天量但价格不再上涨，放量滞涨。'),
    c('margin', 'margin', '融资余额', 'bearish', '融资余额 20 天翻倍，杠杆资金拥挤。'),
    c('nb', 'northbound', '北向资金', 'bearish', '北向资金连续 5 天净卖出。'),
    c('bt', 'backtest', '过热回测', 'bearish', '可见区间内，20 天涨幅超 15% 后 10 天下跌的比例为 4/5。', 2)] },
  { id: 'S03', masked_name: '某公用事业股（模拟）', scenario: 'range', prior: 0.005, early: 0.0, vol: 0.01, after: 0.045, key: ['bt'], clues: [
    c('ma', 'ma', '均线', 'neutral', '均线缠绕，没有方向。'),
    c('vol', 'volume', '成交量', 'neutral', '成交量平稳，接近 20 日均量。'),
    c('idx', 'index', '同期大盘', 'bearish', '同期大盘下跌 2%。'),
    c('bt', 'backtest', '区间回测', 'bullish', '可见区间内，触及区间下沿后 10 天反弹的比例为 6/8，现在就在下沿。', 2)] },
  { id: 'S04', masked_name: '某新能源股（模拟）', scenario: 'v_reversal', prior: -0.14, early: -0.03, vol: 0.025, after: 0.1, key: ['vol', 'bt'], clues: [
    c('ma', 'ma', '均线', 'bearish', '均线空头排列，股价在 20 日均线下方。'),
    c('vol', 'volume', '成交量', 'bullish', '最近 3 天缩量到 20 日均量的 0.4 倍，抛压衰竭。'),
    c('idx', 'index', '同期大盘', 'neutral', '同期大盘横盘。'),
    c('margin', 'margin', '融资余额', 'bearish', '融资余额继续下降 5%。'),
    c('bt', 'backtest', '超跌回测', 'bullish', '可见区间内，缩量超跌后 10 天反弹的比例为 5/6。', 2)] },
  { id: 'S05', masked_name: '某科技股（模拟）', scenario: 'fake_breakout', prior: 0.06, early: -0.04, vol: 0.018, after: -0.09, key: ['vol', 'bt'], clues: [
    c('ma', 'ma', '均线', 'bullish', '刚刚突破 60 日均线。'),
    c('vol', 'volume', '成交量', 'bearish', '突破当天成交量只有 20 日均量的 0.7 倍，缩量突破。'),
    c('idx', 'index', '同期大盘', 'neutral', '同期大盘横盘。'),
    c('bt', 'backtest', '突破回测', 'bearish', '可见区间内，缩量突破后 10 天站稳的比例为 1/5。', 2)] },
  { id: 'S06', masked_name: '某周期股（模拟）', scenario: 'gap', prior: -0.05, early: 0.04, vol: 0.03, after: -0.12, key: ['vol'], clues: [
    c('ma', 'ma', '均线', 'bearish', '跌破 20 日均线。'),
    c('vol', 'volume', '成交量', 'bearish', '昨天放量跳空低开，缺口未回补。'),
    c('idx', 'index', '同期大盘', 'neutral', '同期大盘小幅下跌 0.5%。'),
    c('bt', 'backtest', '缺口回测', 'bullish', '可见区间内，跳空缺口 10 天内回补的比例为 3/5。', 2)] },
];

export const SAMPLE_INDEX: LevelIndex = {
  schema: 'level-index/v1',
  is_sample: true,
  main: ['S01', 'S02', 'S03', 'S04'],
  pool: [
    { id: 'S05', probes: ['evidence_use', 'calibration'] as DimensionId[] },
    { id: 'S06', probes: ['risk_control', 'calibration'] as DimensionId[] },
  ],
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** 确定性行情：分段几何漂移 + 正弦扰动，保证 t=-20→0 和 t=0→15 的涨跌恰好等于设定值。 */
function makeBars(s: LevelSpec, seed: number): Bar[] {
  const closes = new Map<number, number>();
  const p = 50 + seed * 7;
  const wiggle = (t: number) => s.vol * (Math.sin(t * 1.7 + seed) * 0.8 + Math.sin(t * 0.45 + seed * 2) * 0.6);
  // 基准线 base(t)，再乘以扰动；t=-20、0、15 三个锚点扰动为 0
  const base = new Map<number, number>();
  for (let t = -59; t <= 15; t++) {
    let b: number;
    if (t <= -20) b = p * Math.pow(1 + s.early, (t + 59) / 39);
    else if (t <= 0) b = p * (1 + s.early) * Math.pow(1 + s.prior, (t + 20) / 20);
    else b = p * (1 + s.early) * (1 + s.prior) * Math.pow(1 + s.after, t / 15);
    base.set(t, b);
  }
  for (let t = -59; t <= 15; t++) {
    const anchor = t === -20 || t === 0 || t === 15;
    closes.set(t, base.get(t)! * (anchor ? 1 : 1 + wiggle(t)));
  }
  const bars: Bar[] = [];
  for (let t = -59; t <= 15; t++) {
    const cl = closes.get(t)!;
    const op = closes.get(t - 1) ?? cl;
    const hi = Math.max(op, cl) * (1 + s.vol * 0.4);
    const lo = Math.min(op, cl) * (1 - s.vol * 0.4);
    const v = Math.round(1e6 * (1 + 0.3 * Math.sin(t * 0.9 + seed)));
    bars.push({ t, o: r2(op), h: r2(hi), l: r2(lo), c: r2(cl), v });
  }
  return bars;
}

export function buildSampleLevels(): { play: LevelPlay; reveal: LevelReveal }[] {
  return LEVEL_SPECS.map((s, i) => {
    const bars = makeBars(s, i + 1);
    const visible = bars.filter((b) => b.t <= 0);
    const after = bars.filter((b) => b.t > 0);
    const c0 = visible[visible.length - 1].c;
    const ret = Math.round((after[after.length - 1].c / c0 - 1) * 10000) / 10000;
    const direction = Math.abs(ret) < 0.02 ? 'flat' : ret > 0 ? 'up' : 'down';
    const play: LevelPlay = {
      schema: 'level-play/v1', id: s.id, is_sample: true, market: 'A股', timeframe: '1d',
      masked_name: s.masked_name, bars: visible, clues: s.clues, budget: 3, hold_steps: 3,
    };
    const up = s.prior > 0;
    const trend = Math.abs(s.prior) > 0.05;
    const reveal: LevelReveal = {
      schema: 'level-reveal/v1', id: s.id, is_sample: true, symbol: `SAMPLE${i + 1}.SH`, name: `模拟股票 ${s.id}（模拟数据）`,
      start_date: '2021-01-04', decision_date: '2021-03-31', end_date: '2021-04-22', scenario: s.scenario,
      after_bars: after, outcome: { ret, direction }, key_clue_ids: s.key,
      bots: [
        { id: 'ma_cross', name: '双均线', side: up ? 'long' : 'short', ret: r4(up ? ret : -ret) },
        { id: 'turtle', name: '海龟突破', side: trend ? (up ? 'long' : 'short') : 'flat', ret: trend ? r4(up ? ret : -ret) : 0 },
        { id: 'mean_revert', name: '均值回归', side: up ? 'short' : 'long', ret: r4(up ? -ret : ret) },
      ],
      source: { api: 'sample（模拟生成，未调用 Panda Data）', adjust: 'none', fields: ['open', 'high', 'low', 'close', 'volume'], fetched_at: '2026-10-30' },
    };
    return { play, reveal };
  });
}

/* ---------------- 3 组模拟玩家 ---------------- */
const pick = (levelId: string, ...ids: string[]) => {
  const spec = LEVEL_SPECS.find((l) => l.id === levelId)!;
  return ids.map((id) => {
    const cl = spec.clues.find((x) => x.id === id)!;
    return { id: cl.id, kind: cl.kind, signal: cl.signal, cost: cl.cost };
  });
};
type Step = LevelScript['steps'][number];
const hold3 = (pos: number, pnls: [number, number, number]): Step[] =>
  pnls.map((p) => ({ pnl_before: p, action: 'hold' as const, position_after: pos }));

export interface PlayerSample {
  key: 'cautious' | 'impulsive' | 'watcher';
  name: string;
  note: string;
  main: LevelScript[];
  supplementary: LevelScript;
}

export const PLAYERS: PlayerSample[] = [
  {
    key: 'cautious', name: '谨慎研究型',
    note: '模拟玩家：每关先翻关键线索、用足研究点，半仓以下并设止损，浮亏时减仓',
    main: [
      { id: 'S01', clues: pick('S01', 'vol', 'idx', 'ma'), side: 'long', size: 0.5, confidence: 4, stop: 0.05, think_ms: 38000, steps: hold3(0.5, [0.03, 0.05, 0.08]) },
      { id: 'S02', clues: pick('S02', 'vol', 'nb', 'margin'), side: 'short', size: 0.5, confidence: 4, stop: 0.05, think_ms: 42000, steps: hold3(-0.5, [0.025, 0.05, 0.075]) },
      { id: 'S03', clues: pick('S03', 'bt', 'idx'), side: 'long', size: 0.2, confidence: 2, stop: 0.05, think_ms: 35000, steps: hold3(0.2, [0.002, 0.006, 0.009]) },
      { id: 'S04', clues: pick('S04', 'vol', 'bt'), side: 'long', size: 0.5, confidence: 3, stop: 0.1, think_ms: 45000, steps: [
        { pnl_before: -0.015, action: 'reduce', position_after: 0.2 },
        { pnl_before: 0.004, action: 'hold', position_after: 0.2 },
        { pnl_before: 0.02, action: 'hold', position_after: 0.2 }] },
    ],
    supplementary: { id: 'S05', supplementary: true, clues: pick('S05', 'vol', 'bt'), side: 'short', size: 0.2, confidence: 4, stop: 0.05, think_ms: 40000, steps: hold3(-0.2, [0.006, 0.012, 0.018]) },
  },
  {
    key: 'impulsive', name: '冲动重仓型',
    note: '模拟玩家：几秒内下决定、最多翻一张线索，满仓不设止损，信心总是 5，浮亏时加仓',
    main: [
      { id: 'S01', clues: pick('S01', 'ma'), side: 'long', size: 1, confidence: 5, stop: null, think_ms: 6000, steps: [
        { pnl_before: 0.03, action: 'add', position_after: 1 }, { pnl_before: 0.05, action: 'hold', position_after: 1 }, { pnl_before: 0.08, action: 'hold', position_after: 1 }] },
      { id: 'S02', clues: pick('S02', 'ma'), side: 'long', size: 1, confidence: 5, stop: null, think_ms: 5000, steps: [
        { pnl_before: -0.05, action: 'add', position_after: 1 }, { pnl_before: -0.1, action: 'hold', position_after: 1 }, { pnl_before: -0.15, action: 'close', position_after: 0 }] },
      { id: 'S03', clues: [], side: 'long', size: 1, confidence: 5, stop: null, think_ms: 4000, steps: hold3(1, [0.01, 0.03, 0.045]) },
      { id: 'S04', clues: pick('S04', 'ma'), side: 'short', size: 1, confidence: 5, stop: null, think_ms: 7000, steps: [
        { pnl_before: -0.03, action: 'add', position_after: -1 }, { pnl_before: -0.07, action: 'hold', position_after: -1 }, { pnl_before: -0.1, action: 'hold', position_after: -1 }] },
    ],
    supplementary: { id: 'S05', supplementary: true, clues: pick('S05', 'ma'), side: 'long', size: 1, confidence: 5, stop: null, think_ms: 5000, steps: [
      { pnl_before: -0.03, action: 'add', position_after: 1 }, { pnl_before: -0.06, action: 'hold', position_after: 1 }, { pnl_before: -0.09, action: 'hold', position_after: 1 }] },
  },
  {
    key: 'watcher', name: '只看不做型',
    note: '模拟玩家：认真翻线索，但四关都选择观望不入场',
    main: [
      { id: 'S01', clues: pick('S01', 'ma', 'vol', 'idx'), side: 'flat', size: 0, confidence: 2, stop: null, think_ms: 30000, steps: hold3(0, [0, 0, 0]) },
      { id: 'S02', clues: pick('S02', 'ma', 'vol', 'margin'), side: 'flat', size: 0, confidence: 2, stop: null, think_ms: 28000, steps: hold3(0, [0, 0, 0]) },
      { id: 'S03', clues: pick('S03', 'ma', 'vol', 'idx'), side: 'flat', size: 0, confidence: 1, stop: null, think_ms: 25000, steps: hold3(0, [0, 0, 0]) },
      { id: 'S04', clues: pick('S04', 'ma', 'margin', 'idx'), side: 'flat', size: 0, confidence: 2, stop: null, think_ms: 32000, steps: hold3(0, [0, 0, 0]) },
    ],
    supplementary: { id: 'S05', supplementary: true, clues: pick('S05', 'vol', 'bt'), side: 'short', size: 0.2, confidence: 3, stop: 0.05, think_ms: 30000, steps: hold3(-0.2, [0.006, 0.012, 0.018]) },
  },
];

export function buildPlayerEvents(p: PlayerSample, withSupplementary = false) {
  return buildEvents(`sample-${p.key}`, withSupplementary ? [...p.main, p.supplementary] : p.main);
}
