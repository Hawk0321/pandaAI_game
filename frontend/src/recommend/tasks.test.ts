import { describe, expect, it } from 'vitest';
import type { Bar, LevelPlay, LevelReveal } from '../shared/protocol';
import { quizSummary, replayStop, scoreClues, styleMatch } from './tasks';

const bar = (t: number, c: number, l = c, h = c): Bar => ({ t, o: c, h, l, c, v: 1 });
const play = { bars: [bar(-1, 100), bar(0, 100)] } as LevelPlay;
const reveal = { after_bars: [bar(1, 98, 97), bar(2, 94, 93), bar(3, 90, 89)] } as LevelReveal;

describe('练习任务计算', () => {
  it('止损演练：触及止损价按止损价离场，否则持有到最后', () => {
    expect(replayStop(play, reveal, 'long', 1, null).ret).toBeCloseTo(-0.1);
    const s5 = replayStop(play, reveal, 'long', 1, 0.05);
    expect(s5.stopped).toBe(true);
    expect(s5.exitT).toBe(2);
    expect(s5.ret).toBeCloseTo(-0.05);
    expect(replayStop(play, reveal, 'long', 0.5, 0.03).ret).toBeCloseTo(-0.015);
    expect(replayStop(play, reveal, 'short', 1, 0.05).ret).toBeCloseTo(0.1);
    expect(replayStop(play, reveal, 'long', 1, null).worst).toBeCloseTo(-0.11);
  });

  it('关键线索复盘打分', () => {
    expect(scoreClues(['vol', 'ma'], ['vol', 'bt'])).toEqual({ hits: ['vol'], total: 2 });
  });

  it('信心小测：与画像的判断校准同一口径，横盘不计', () => {
    const over = quizSummary([{ confidence: 5, right: false }, { confidence: 5, right: true }, { confidence: 5, right: null }])!;
    expect(over.n).toBe(2);
    expect(over.verdict).toContain('偏高');
    expect(quizSummary([{ confidence: 3, right: null }])).toBeNull();
  });

  it('风格对照：观望的关不计，找出方向一致最多的策略', () => {
    const bots = (a: 'long' | 'short', b: 'long' | 'short' | 'flat', c: 'long' | 'short') => [
      { id: 'ma_cross' as const, name: '双均线', side: a, ret: 0 }, { id: 'turtle' as const, name: '海龟突破', side: b, ret: 0 }, { id: 'mean_revert' as const, name: '均值回归', side: c, ret: 0 }];
    const m = styleMatch([
      { levelId: 'L1', side: 'long', bots: bots('long', 'long', 'short') },
      { levelId: 'L2', side: 'short', bots: bots('short', 'flat', 'long') },
      { levelId: 'L3', side: 'flat', bots: bots('long', 'long', 'short') },
    ]);
    expect(m.counted).toBe(2);
    expect(m.best!.id).toBe('ma_cross');
    expect(m.best!.same).toBe(2);
  });
});
