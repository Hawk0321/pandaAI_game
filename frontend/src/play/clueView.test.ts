import { describe, expect, it } from 'vitest';
import type { Clue, LevelPlay } from '../shared/protocol';
import { CLUE_NAMES, CLUE_TEASERS, clueName, clueTeaser, clueView, normalize } from './clueView';

// 直接读正式关卡（frontend/public/levels），关卡数据或文案变了，这里会第一时间发现译不出来。
const modules = import.meta.glob('../../public/levels/L*.play.json', { eager: true, import: 'default' }) as Record<string, LevelPlay>;
const levels: LevelPlay[] = Object.keys(modules).sort().map(key => modules[key]);
const clue = (id: string, text: string, signal: Clue['signal'] = 'neutral', series?: number[]): Clue => ({ id, kind: 'ma', title: id, cost: 1, text, signal, series });

// 玩家界面里不该再出现的专业缩写和符号
const JARGON = /ATR|MA\d|归一化|均线|K 线|止损|\bt=|命中|样本|信号|量价|%\s*倍|倍历史日波动/;

describe('线索卡人话版', () => {
  it('真实关卡里的每一张线索都能翻译，且译文没有专业缩写', () => {
    expect(levels.length).toBeGreaterThanOrEqual(10);
    for (const level of levels) for (const c of level.clues) {
      const view = clueView(c);
      expect(view, `${level.id}/${c.id} 应能翻译`).not.toBeNull();
      expect(view!.verdict.length).toBeGreaterThan(8);
      expect(`${view!.name}${view!.verdict}${view!.caveat ?? ''}`, `${level.id}/${c.id}: ${view!.verdict}`).not.toMatch(JARGON);
    }
  });

  it('方向标和关卡数据里的 signal 一致，不自己重新判断涨跌', () => {
    for (const level of levels) for (const c of level.clues) {
      const view = clueView(c)!;
      expect(view.lean).toBe(c.signal === 'bullish' ? 'up' : c.signal === 'bearish' ? 'down' : 'flat');
    }
  });

  it('只引用卡面原文里已有的数字，不凭空编出新数据', () => {
    for (const level of levels) for (const c of level.clues) {
      const view = clueView(c)!;
      const shown = (view.verdict.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      const source = (c.text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      for (const n of shown) expect(source.some(s => Math.abs(s - n) < 0.06 || Math.abs(Math.round(s) - n) < 0.01) || [5, 20].includes(n), `${level.id}/${c.id}: ${n} 不在原文 ${source}`).toBe(true);
    }
  });

  it('图表数值已归一到 0–1，序列只来自卡面自带的 series', () => {
    for (const level of levels) for (const c of level.clues) {
      const chart = clueView(c)!.chart;
      if (!chart) continue;
      if (chart.kind === 'line' || chart.kind === 'bars') {
        expect(c.series?.length).toBeGreaterThan(1);
        expect(chart.values).toHaveLength(c.series!.length);
        for (const v of chart.values) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      }
      if (chart.kind === 'meter') { expect(chart.value).toBeGreaterThanOrEqual(0); expect(chart.value).toBeLessThanOrEqual(1); }
      if (chart.kind === 'range') { expect(chart.position).toBeGreaterThanOrEqual(0); expect(chart.position).toBeLessThanOrEqual(1); }
    }
  });

  it('各档位给出不同的结论', () => {
    const t = (gap: string) => clueView(clue('ma', `归一化 MA5=1，MA20=1，短均线相对长均线 ${gap}。`))!.verdict;
    expect(new Set([t('+3.00%'), t('+1.00%'), t('+0.00%'), t('-1.00%'), t('-3.00%')]).size).toBe(5);
    const v = (r: string) => clueView(clue('vol', `最近 3 日均量是此前 20 日均量的 ${r} 倍；近 5 日价格变动 +1.00%。`))!.verdict;
    expect(v('1.80')).toContain('放大'); expect(v('0.60')).toContain('清淡');
    const b = (hit: number) => clueView(clue('backtest', `在 40 次下一日检验中命中 ${hit} 次（x%）。`))!.verdict;
    expect(b(28)).toContain('参考价值'); expect(b(14)).toContain('别太信'); expect(b(20)).toContain('抛硬币');
  });

  it('认不出的线索或提取不到数字时返回 null，由界面显示原文', () => {
    expect(clueView(clue('unknown', '随便一句话'))).toBeNull();
    expect(clueView(clue('ma', '没有数字的均线描述'))).toBeNull();
    expect(clueView(clue('backtest', '检验中命中 3 次'))).toBeNull();
  });

  it('每张线索的卡面名字和预告都是人话，且与翻开后的名字一致', () => {
    expect(Object.keys(CLUE_TEASERS).sort()).toEqual(Object.keys(CLUE_NAMES).sort());
    for (const level of levels) for (const c of level.clues) {
      expect(clueName(c)).toBe(clueView(c)!.name);
      expect(`${clueName(c)}${clueTeaser(c)}`).not.toMatch(JARGON);
      expect(clueTeaser(c).endsWith('？')).toBe(true);
    }
    expect(clueTeaser(clue('mystery', ''))).toBe('点击翻开线索');
  });

  it('归一化：全相等画中线，空数组返回空', () => {
    expect(normalize([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
    expect(normalize([])).toEqual([]);
    expect(normalize([1, 3, 2])).toEqual([0, 1, 0.5]);
  });
});
