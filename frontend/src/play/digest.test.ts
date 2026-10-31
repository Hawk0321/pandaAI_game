import { describe, expect, it } from 'vitest';
import type { Bar, LevelPlay } from '../shared/protocol';
import { buildDigest, chartFacts } from './digest';

// 直接读正式关卡：关卡数据或线索文案变了，这里会第一时间发现。
const modules = import.meta.glob('../../public/levels/L*.play.json', { eager: true, import: 'default' }) as Record<string, LevelPlay>;
const levels: LevelPlay[] = Object.keys(modules).sort().map(key => modules[key]);
const JARGON = /ATR|MA\d|归一化|均线|K 线|止损|\bt=|命中|样本|信号|量价|倍历史日波动/;
const everything = (d: ReturnType<typeof buildDigest>) => [
  d.headline, ...d.facts, ...d.reads.flatMap(r => [r.name, r.leanText, r.verdict]),
  ...d.missing.flatMap(m => [m.name, m.teaser]), d.wrapUp, d.note,
].join('\n');
const bars = (closes: number[]): Bar[] => closes.map((c, i) => ({ t: i - closes.length + 1, o: c, h: c + 1, l: c - 1, c, v: 1 }));

describe('综合解读', () => {
  it('每个真实关卡、不同翻牌组合下都能生成，且没有专业缩写', () => {
    for (const level of levels) {
      const ids = level.clues.map(c => c.id);
      for (const opened of [[], ids.slice(0, 1), ids.slice(0, 2), ids]) {
        const d = buildDigest({ bars: level.bars, clues: level.clues, opened, budget: level.budget });
        expect(d.headline.length, `${level.id} ${opened}`).toBeGreaterThan(6);
        expect(d.facts).toHaveLength(3);
        expect(d.reads.map(r => r.id)).toEqual(ids.filter(id => opened.includes(id)));
        expect(everything(d), `${level.id} ${opened}`).not.toMatch(JARGON);
      }
    }
  });

  it('统计的是关卡数据里的方向，不自己重新判断', () => {
    for (const level of levels) {
      const opened = level.clues.map(c => c.id);
      const d = buildDigest({ bars: level.bars, clues: level.clues, opened, budget: 0 });
      expect(d.tally.up).toBe(level.clues.filter(c => c.signal === 'bullish').length);
      expect(d.tally.down).toBe(level.clues.filter(c => c.signal === 'bearish').length);
      expect(d.tally.flat).toBe(level.clues.filter(c => c.signal === 'neutral').length);
      expect(d.tally.up + d.tally.down + d.tally.flat).toBe(opened.length);
    }
  });

  it('不给买卖建议，也不暗示哪张线索是关键线索', () => {
    for (const level of levels) {
      const d = buildDigest({ bars: level.bars, clues: level.clues, opened: [level.clues[0].id], budget: level.budget });
      expect(everything(d)).not.toMatch(/建议(你)?(做多|做空|买入|卖出|观望|加仓)|应该(买|卖|做多|做空)|关键线索|最重要/);
      expect(d.note).toContain('不是买卖建议');
    }
  });

  it('提示还能翻什么：只列翻得起的未翻线索，最多 3 张', () => {
    const level = levels[0];
    const d = buildDigest({ bars: level.bars, clues: level.clues, opened: [], budget: 1 });
    expect(d.missing.length).toBeLessThanOrEqual(3);
    for (const m of d.missing) expect(level.clues.find(c => c.id === m.id)!.cost).toBeLessThanOrEqual(1);
    const none = buildDigest({ bars: level.bars, clues: level.clues, opened: [level.clues[0].id], budget: 0 });
    expect(none.missing).toEqual([]);
    expect(none.wrapUp).toContain('研究点用完了');
    expect(buildDigest({ bars: level.bars, clues: level.clues, opened: level.clues.map(c => c.id), budget: 3 }).wrapUp).toContain('翻完了');
  });

  it('没有专门预告语的线索，只显示名字和点数，不写「点击翻开线索」这种空话', () => {
    const level = levels[0];
    const odd = [{ ...level.clues[0], id: 'mystery', title: '神秘线索' }];
    const d = buildDigest({ bars: level.bars, clues: odd, opened: [], budget: 3 });
    expect(d.missing).toEqual([{ id: 'mystery', name: '神秘线索', teaser: '', cost: odd[0].cost }]);
    expect(buildDigest({ bars: level.bars, clues: level.clues, opened: [], budget: 3 }).missing.every(m => m.teaser.endsWith('？'))).toBe(true);
  });

  it('线索有分歧时明确说出来', () => {
    const level = levels.find(l => l.clues.some(c => c.signal === 'bullish') && l.clues.some(c => c.signal === 'bearish'))!;
    const up = level.clues.find(c => c.signal === 'bullish')!;
    const down = level.clues.find(c => c.signal === 'bearish')!;
    const d = buildDigest({ bars: level.bars, clues: level.clues, opened: [up.id, down.id], budget: 0 });
    expect(d.conflict).toBe(true);
    expect(d.headline).toContain('分歧');
    const same = buildDigest({ bars: level.bars, clues: level.clues, opened: [up.id], budget: 0 });
    expect(same.conflict).toBe(false);
    expect(same.headline).toContain('偏多');
  });

  it('一张线索都没翻时只讲可见走势', () => {
    const d = buildDigest({ bars: levels[0].bars, clues: levels[0].clues, opened: [], budget: 3 });
    expect(d.reads).toEqual([]);
    expect(d.headline).toContain('还没翻线索');
    expect(d.facts.length).toBe(3);
  });

  it('走势描述的数字算对了', () => {
    const rise = chartFacts(bars([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 110]));
    expect(rise[0]).toContain('涨了 10.0%');
    expect(rise[1]).toContain('高位');
    expect(rise[2]).toContain('涨了 10.0%');
    expect(chartFacts(bars([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 90]))[0]).toContain('跌了 10.0%');
    expect(chartFacts(bars(Array(12).fill(100)))[0]).toContain('基本在原地');
    expect(chartFacts(bars([1, 2, 3]))).toEqual([]);
  });

  it('同样输入永远得到同样结果', () => {
    const level = levels[2];
    const input = { bars: level.bars, clues: level.clues, opened: [level.clues[1].id], budget: 2 };
    expect(buildDigest(input)).toEqual(buildDigest(structuredClone(input)));
  });
});
