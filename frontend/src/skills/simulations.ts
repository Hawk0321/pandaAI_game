import type { Bar, GameEvent } from '../shared/protocol';
import { emptyAccount, pnl, trade } from '../play/trading';
import type { Account } from '../play/trading';
import type { CompletedLevel } from './model';

export interface Fill { t: number; price: number; target: number; reason: string }
export interface Simulation { points: { t: number; equity: number }[]; fills: Fill[]; ret: number; drawdown: number }
const mean = (xs: number[]) => xs.reduce((s, n) => s + n, 0) / xs.length;
function finish(points: Simulation['points'], fills: Fill[]): Simulation {
  let peak = 1, drawdown = 0;
  for (const p of points) { peak = Math.max(peak, p.equity); drawdown = Math.max(drawdown, (peak - p.equity) / peak); }
  return { points, fills, ret: points.at(-1)!.equity - 1, drawdown };
}
function setPosition(account: Account, target: number, price: number): Account {
  return trade(account.position * target < 0 ? trade(account, 0, price) : account, target, price);
}
function run(level: CompletedLevel, signal: (history: Bar[]) => number, reason: string): Simulation {
  const history = [...level.play.bars];
  let account = emptyAccount();
  const points = [{ t: 0, equity: 1 }], fills: Fill[] = [];
  for (const bar of level.reveal.after_bars) {
    // Only history through yesterday determines today's opening order.
    const target = signal(history);
    if (target !== account.position) {
      account = setPosition(account, target, bar.o);
      fills.push({ t: bar.t, price: bar.o, target, reason });
    }
    points.push({ t: bar.t, equity: 1 + pnl(account, bar.c) });
    history.push(bar);
  }
  return finish(points, fills);
}
export function trend(level: CompletedLevel, fast: number, slow: number, size: number): Simulation {
  if (!Number.isInteger(fast) || fast < 1 || fast >= slow || slow > level.play.bars.length || size <= 0 || size > 1) throw new Error('无效均线或仓位参数');
  return run(level, history => {
    const closes = history.map(b => b.c);
    const gap = mean(closes.slice(-fast)) - mean(closes.slice(-slow));
    return Math.abs(gap) < 1e-10 ? 0 : Math.sign(gap) * size;
  }, `${fast}/${slow} 日双均线，使用前一收盘信号`);
}

/** A long-only exercise: falling pressure-line breach, then a later green-bar recovery. */
export function reversal(level: CompletedLevel, window: number, size: number, wait: boolean): Simulation {
  if (!Number.isInteger(window) || window < 1 || window > 5 || size <= 0 || size > 1) throw new Error('无效确认窗口或仓位');
  let pending: { t: number; close: number } | null = null;
  let entered = false;
  // Warm the signal using known candles, so an ongoing setup at t=0 is not discarded.
  function next(history: Bar[]): number {
    if (entered) return size;
    const bar = history.at(-1)!;
    if (pending && bar.t > pending.t) {
      if (bar.t >= 0 && bar.t - pending.t <= window && bar.c > pending.close && bar.c > bar.o) entered = true;
      if (bar.t - pending.t >= window || entered) pending = null;
    }
    if (!pending && !entered && history.length >= 21) {
      const highs = history.slice(-21, -1).map(b => b.h);
      const avg = mean(highs), center = 9.5;
      const slope = highs.reduce((s, h, i) => s + (i - center) * (h - avg), 0) / 665;
      const pressure = avg + slope * (20 - center);
      if (slope < 0 && pressure > 0 && bar.c <= pressure * .98) {
        pending = { t: bar.t, close: bar.c };
        if (!wait && bar.t >= 0) entered = true;
      }
    }
    return entered ? size : 0;
  }
  for (let i = 21; i < level.play.bars.length; i++) next(level.play.bars.slice(0, i));
  return run(level, next, wait ? `下破后 ${window} 根内收复确认，下一根开盘入场` : '下破触发后直接在下一根开盘入场');
}

export function shield(level: CompletedLevel, side: 1 | -1, size: number, stop: number | null, take: number | null): Simulation {
  if (![1, -1].includes(side) || size <= 0 || size > 1 || [stop, take].some(v => v !== null && (v <= 0 || v >= 1))) throw new Error('无效保护线参数');
  const entry = level.play.bars.at(-1)!.c;
  let account = trade(emptyAccount(), side * size, entry);
  const points = [{ t: 0, equity: 1 }], fills: Fill[] = [{ t: 0, price: entry, target: side * size, reason: '相同初始入场' }];
  const stopPrice = stop === null ? null : entry * (1 - side * stop);
  const takePrice = take === null ? null : entry * (1 + side * take);
  for (const bar of level.reveal.after_bars) {
    if (account.position) {
      const hitStop = stopPrice !== null && (side > 0 ? bar.l <= stopPrice : bar.h >= stopPrice);
      const hitTake = takePrice !== null && (side > 0 ? bar.h >= takePrice : bar.l <= takePrice);
      let price: number | null = null, reason = '';
      // Opening gaps have known precedence; otherwise ambiguous intrabar order uses stop first.
      if (stopPrice !== null && side * (bar.o - stopPrice) <= 0) { price = bar.o; reason = '跳空越过止损，按开盘价退出'; }
      else if (takePrice !== null && side * (bar.o - takePrice) >= 0) { price = bar.o; reason = '跳空越过止盈，按开盘价退出'; }
      else if (hitStop) { price = stopPrice; reason = hitTake ? '同根触及两线，保守按止损优先' : '触及止损线'; }
      else if (hitTake) { price = takePrice; reason = '触及止盈线'; }
      if (price !== null) { account = trade(account, 0, price); fills.push({ t: bar.t, price, target: 0, reason }); }
    }
    points.push({ t: bar.t, equity: 1 + pnl(account, bar.c) });
  }
  return finish(points, fills);
}

export interface ReviewItem { title: string; text: string; seqs: number[] }
export function review(level: CompletedLevel, events: GameEvent[]): ReviewItem[] {
  const own = [...events].filter(e => e.level_id === level.play.id).sort((a, b) => a.seq - b.seq);
  const d = own.find(e => e.type === 'decision');
  if (!d) return [];
  const opened = new Set(own.filter(e => e.type === 'clue_open').map(e => e.data.clue_id));
  const hit = level.reveal.key_clue_ids.filter(id => opened.has(id));
  const direction = level.reveal.outcome.direction;
  const decided = d.data.side;
  const checked = decided !== 'flat' && direction !== 'flat';
  const right = checked && ((decided === 'long') === (direction === 'up'));
  let position = decided === 'flat' ? 0 : Number(d.data.size);
  const adds: number[] = [];
  for (const event of own) {
    if (event.type === 'stop_triggered') position = 0;
    if (event.type === 'hold_step') {
      if (position !== 0 && Number(event.data.pnl_before) < -.01 && event.data.action === 'add') adds.push(event.seq);
      position = Number(event.data.position_after);
    }
  }
  return [
    { title: '决定前的依据', text: `查看了 ${hit.length}/${level.reveal.key_clue_ids.length} 张关键线索。${hit.length ? '可以继续核对这些线索是否支持你的方向。' : '下次先选一条能推翻自己判断的线索。'}`, seqs: [d.seq] },
    { title: '信心与结果', text: checked ? `信心 ${d.data.confidence}/5，这次方向${right ? '正确' : '错误'}。一次结果不足以确认长期校准能力。` : '本关观望或走势横盘，无法检验方向信心。先保留不确定项。', seqs: [d.seq] },
    { title: '持仓中的动作', text: adds.length ? `有 ${adds.length} 次持仓亏损时加仓，值得核对加仓前是否出现新证据。` : '没有记录到持仓亏损时加仓；这不等于已证明风险管理稳定。', seqs: adds.length ? adds : [d.seq] },
  ];
}
