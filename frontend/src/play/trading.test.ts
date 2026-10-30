import { describe, expect, it } from 'vitest';
import { checkStop, emptyAccount, pnl, targetPosition, trade } from './trading';

describe('模拟成交', () => {
  it('轻仓收益、加仓成本与减仓已实现收益一致', () => {
    let a = trade(emptyAccount(), 0.2, 100);
    expect(pnl(a, 110)).toBeCloseTo(0.02);
    a = trade(a, 0.5, 110);
    const before = pnl(a, 120);
    a = trade(a, 0.2, 120);
    expect(pnl(a, 120)).toBeCloseTo(before);
    expect(pnl(trade(a, 0, 120), 999)).toBeCloseTo(before);
  });
  it('空头止损按触发价成交且只触发一次', () => {
    const a = trade(emptyAccount(), -0.5, 100);
    expect(pnl(a, 90)).toBeCloseTo(0.05);
    const bar = { t: 1, o: 100, h: 110, l: 90, c: 99, v: 1 };
    const stopped = checkStop(a, bar, 0.05);
    expect(stopped.triggered).toBe(true);
    expect(stopped.pnl).toBeCloseTo(-0.025);
    expect(checkStop(stopped.account, bar, 0.05).triggered).toBe(false);
  });
  it('多头跳空按约定触发价，观望可按档位入场', () => {
    const a = trade(emptyAccount(), 1, 100);
    expect(checkStop(a, { t:1,o:80,h:85,l:75,c:82,v:1 },0.1).pnl).toBeCloseTo(-0.1);
    expect(targetPosition(0,'add','short')).toBe(-0.2);
    expect(targetPosition(-0.5,'reduce','long')).toBe(-0.2);
    expect(targetPosition(1,'add','long')).toBe(1);
  });
});
