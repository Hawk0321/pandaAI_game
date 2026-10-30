import type { Bar, Side } from '../shared/protocol';

export type Action = 'hold' | 'add' | 'reduce' | 'close';
export interface Account { position: number; units: number; entry: number; realized: number }
export const emptyAccount = (): Account => ({ position: 0, units: 0, entry: 0, realized: 0 });
export const pnl = (a: Account, price: number): number => a.realized + a.units * (price - a.entry);

/** 初始资金为 1；仓位表示投入的初始资金比例，价格变动不自动再平衡。无费用/滑点。 */
export function trade(a: Account, target: number, price: number): Account {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(target) || Math.abs(target) > 1) throw new Error('无效成交价格或仓位');
  if (a.position * target < 0) throw new Error('请先平仓再改变方向');
  const delta = Math.abs(target) - Math.abs(a.position);
  if (delta === 0) return a;
  if (delta > 0) {
    const units = a.units + Math.sign(target) * delta / price;
    return { ...a, position: target, units, entry: (Math.abs(a.units) * a.entry + delta) / Math.abs(units) };
  }
  const fraction = -delta / Math.abs(a.position);
  return { position: target, units: a.units * (1 - fraction), entry: target === 0 ? 0 : a.entry,
    realized: a.realized + a.units * fraction * (price - a.entry) };
}
export function targetPosition(position: number, action: Action, side: Exclude<Side, 'flat'>): number {
  const size = Math.abs(position);
  const sign = Math.sign(position) || (side === 'short' ? -1 : 1);
  if (action === 'close') return 0;
  if (action === 'hold') return position;
  const ladder = [0, 0.2, 0.5, 1];
  const next = action === 'add' ? ladder.find(n => n > size) ?? 1 : [...ladder].reverse().find(n => n < size) ?? 0;
  return sign * next;
}
/** 每根线按高低价检查；跳空同样按协议约定的触发价成交。 */
export function checkStop(a: Account, bar: Bar, stop: number | null): { account: Account; triggered: boolean; pnl: number } {
  if (!a.position || stop === null) return { account: a, triggered: false, pnl: pnl(a, bar.c) };
  const price = a.entry * (1 - Math.sign(a.position) * stop);
  const triggered = a.position > 0 ? bar.l <= price : bar.h >= price;
  const account = triggered ? trade(a, 0, price) : a;
  return { account, triggered, pnl: pnl(account, triggered ? price : bar.c) };
}
