import { describe, expect, it } from 'vitest';
import playL01 from '../../../data/samples/levels/L01.play.json';
import revealL01 from '../../../data/samples/levels/L01.reveal.json';
import sampleEvents from '../../../data/samples/sample_events.json';
import type { GameEvent, LevelPlay, LevelReveal } from '../shared/protocol';
import { extractEvidence, type RawEvidence } from './evidence';
import { buildEvents, type LevelScript } from './testkit';

const L01 = { play: playL01 as LevelPlay, reveal: revealL01 as LevelReveal };
const clue = (id: string) => {
  const c = L01.play.clues.find((x) => x.id === id)!;
  return { id: c.id, kind: c.kind, signal: c.signal, cost: c.cost };
};
const base: LevelScript = { id: 'L01', clues: [], side: 'flat', size: 0, confidence: 3, stop: null, think_ms: 10000,
  steps: [{ pnl_before: 0, action: 'hold', position_after: 0 }, { pnl_before: 0, action: 'hold', position_after: 0 }, { pnl_before: 0, action: 'hold', position_after: 0 }] };
const run = (s: Partial<LevelScript>) => extractEvidence(buildEvents('t', [{ ...base, ...s }]), [L01]);
const of = (ev: RawEvidence[], dim: string) => ev.filter((e) => e.dim === dim);

describe('证据层', () => {
  it('仓库示例事件：每条证据都指向真实存在的事件', () => {
    const events = sampleEvents.events as GameEvent[];
    const ev = extractEvidence(events, [L01]);
    const seqs = new Set(events.map((e) => e.seq));
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) {
      expect(e.event_seqs.length).toBeGreaterThan(0);
      for (const s of e.event_seqs) expect(seqs.has(s)).toBe(true);
    }
    // 6 个维度都有证据
    expect(new Set(ev.map((e) => e.dim)).size).toBe(6);
  });

  it('证据使用：漏看关键线索、只翻支持方向的线索都会被记下', () => {
    const ev = of(run({ clues: [clue('ma')], side: 'long', size: 1 }), 'evidence_use');
    const key = ev.find((e) => e.text.includes('关键线索'))!;
    expect(key.text).toContain('没有翻开任何关键线索');
    expect(key.value).toBeLessThan(0.3);

    const good = of(run({ clues: [clue('vol'), clue('bt')], side: 'short', size: 0.5 }), 'evidence_use');
    expect(good.find((e) => e.text.includes('全部关键线索'))!.value).toBeGreaterThan(0.8);
    expect(good.find((e) => e.text.includes('一致'))!.value).toBeGreaterThan(0.7);

    const against = of(run({ clues: [clue('vol'), clue('margin')], side: 'long', size: 0.5 }), 'evidence_use');
    expect(against.find((e) => e.text.includes('相反'))!.value).toBeLessThan(0.3);
  });

  it('证据使用：没翻线索就下单记为负面，没翻线索又观望记为不确定', () => {
    expect(of(run({ side: 'long', size: 1 }), 'evidence_use').some((e) => e.text.includes('一张线索没翻就做多') && e.value! < 0.3)).toBe(true);
    expect(of(run({}), 'evidence_use').some((e) => e.value === null)).toBe(true);
  });

  it('确认偏误：翻了两张都支持自己的方向，反方向线索没看', () => {
    // 构造一个只有 2 张看跌线索被翻、做空、还有看涨均线没翻的局面
    const ev = of(run({ clues: [clue('vol'), clue('margin')], side: 'short', size: 0.5 }), 'evidence_use');
    expect(ev.some((e) => e.text.includes('只翻了支持做空的线索'))).toBe(true);
  });

  it('判断校准：只看方向对错和信心，不看赚多少', () => {
    const confidentWrong = of(run({ side: 'long', size: 0.2, confidence: 5 }), 'calibration')[0];
    const humbleWrong = of(run({ side: 'long', size: 1, confidence: 1 }), 'calibration')[0];
    const confidentRight = of(run({ side: 'short', size: 0.2, confidence: 5 }), 'calibration')[0];
    expect(confidentWrong.value).toBeLessThan(0.1);
    expect(humbleWrong.value!).toBeGreaterThan(0.6);
    expect(confidentRight.value!).toBeGreaterThan(0.95);
    expect(of(run({}), 'calibration')[0].value).toBeNull();
  });

  it('风险控制：重仓不设止损、浮亏加仓扣分，设止损、浮亏减仓加分', () => {
    const bad = of(run({ side: 'long', size: 1, steps: [
      { pnl_before: -0.03, action: 'add', position_after: 1 },
      { pnl_before: -0.08, action: 'hold', position_after: 1 },
      { pnl_before: -0.12, action: 'close', position_after: 0 }] }), 'risk_control');
    expect(bad.some((e) => e.text.includes('没有设止损') && e.value! < 0.3)).toBe(true);
    expect(bad.some((e) => e.text.includes('加仓') && e.value! < 0.2)).toBe(true);
    expect(bad.some((e) => e.text.includes('止损偏晚') && e.value! > 0.5 && e.value! < 0.7)).toBe(true);

    const good = of(run({ side: 'long', size: 0.5, stop: 0.05, stop_at: { step: 1, pnl: -0.025 }, steps: [
      { pnl_before: -0.025, action: 'close', position_after: 0 },
      { pnl_before: 0, action: 'hold', position_after: 0 },
      { pnl_before: 0, action: 'hold', position_after: 0 }] }), 'risk_control');
    expect(good.find((e) => e.text.includes('止损'))!.text).toContain('自动触发');
    expect(good.every((e) => e.value! >= 0.5)).toBe(true);
  });

  it('偏好：顺势/逆势、研究深度、仓位都能读出', () => {
    // L01 决定前 20 天上涨（假突破），做多 = 顺势
    expect(of(run({ side: 'long', size: 0.5 }), 'style')[0].value).toBe(1);
    expect(of(run({ side: 'short', size: 0.5 }), 'style')[0].value).toBe(0);
    expect(of(run({}), 'style')[0].value).toBeNull();

    const quick = of(run({ think_ms: 3000 }), 'research_depth')[0].value!;
    const deep = of(run({ think_ms: 40000, clues: [clue('vol'), clue('bt')] }), 'research_depth')[0].value!;
    expect(deep).toBeGreaterThan(0.9);
    expect(quick).toBeLessThan(0.1);

    expect(of(run({ side: 'long', size: 1 }), 'risk_appetite')[0].value).toBe(1);
    expect(of(run({}), 'risk_appetite')[0].value).toBe(0);
  });
});
