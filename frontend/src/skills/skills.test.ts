import { describe, expect, it } from 'vitest';
import type { Bar, GameEvent, Profile } from '../shared/protocol';
import { analyze } from '../profile';
import { PLAYERS, SAMPLE_INDEX, buildPlayerEvents, buildSampleLevels } from '../profile/samples';
import { CARDS, recommendSkills } from './model';
import { buildSubmission } from './submission';
import type { CompletedLevel } from './model';
import { review, reversal, shield, trend } from './simulations';
import p from '../../public/levels/L01.play.json';
import r from '../../public/levels/L01.reveal.json';

const level = { play: p, reveal: r, result: { level_id: 'L01', pnl: 0, final_position: 0 } } as CompletedLevel;
const bar = (t: number, c: number, o = c): Bar => ({ t, o, c, h: Math.max(c, o) + .1, l: Math.min(c, o) - .1, v: 100 });
function synthetic(known: Bar[], future: Bar[]): CompletedLevel {
  const copy = structuredClone(level);
  copy.play.bars = known;
  copy.reveal.after_bars = future;
  return copy;
}

describe('画像后的推荐规则', () => {
  it('三种玩家得到不同优先推荐，且推荐证据属于本局', async () => {
    const samples = buildSampleLevels().filter(l => SAMPLE_INDEX.main.includes(l.play.id));
    const lists: string[] = [];
    for (const player of PLAYERS) {
      const events = buildPlayerEvents(player);
      const profile = await analyze({ session_id: `sample-${player.key}`, round: 1, events, levels: samples });
      const cards = recommendSkills(profile, events);
      expect(new Set(cards.map(c => c.id)).size).toBe(4);
      lists.push(cards.slice(0, 2).map(c => c.id).join(','));
      for (const c of cards) for (const e of c.evidence) for (const seq of e.event_seqs) {
        expect(events.some(event => event.seq === seq && event.level_id === e.level_id && event.session_id === profile.session_id)).toBe(true);
      }
      if (player.key === 'impulsive') expect(cards[0].id).toBe('shield');
      if (player.key === 'watcher') {
        expect(cards[0].id).toBe('review');
        expect(cards[0].reason).toContain('证据不足');
      }
    }
    expect(new Set(lists).size).toBeGreaterThan(1);
  });

  it('复盘卡由证据使用触发时，维度与理由必须一起改成 evidence_use', async () => {
    const events = buildPlayerEvents(PLAYERS[0]);
    const base = await analyze({ session_id: 'sample-cautious', round: 1, events, levels: buildSampleLevels() });
    const profile: Profile = {
      ...base,
      dimensions: base.dimensions.map((d) =>
        d.id === 'calibration' ? { ...d, score: .8, confidence: 'high' as const, conflict: false }
          : d.id === 'evidence_use' ? { ...d, score: .3, confidence: 'high' as const, conflict: false } : d),
    };
    const card = recommendSkills(profile, events).find((c) => c.id === 'review')!;
    expect(card.dimension).toBe('evidence_use');
    expect(card.reason).toContain('线索');
    // 推荐的证据与它声称的维度属于同一维度，不会拿校准的证据去解释证据使用的问题
    const source = profile.dimensions.find((d) => d.id === 'evidence_use')!.evidence;
    for (const e of card.evidence) {
      expect(source.some((s) => s.level_id === e.level_id && s.text === e.text)).toBe(true);
    }
  });

  it('不以人物名或盈亏排名推荐；忽略其他会话的同序号证据', async () => {
    const events = buildPlayerEvents(PLAYERS[0]);
    const profile = await analyze({ session_id: 'sample-cautious', round: 1, events, levels: buildSampleLevels() });
    const changed: Profile = { ...profile, persona: { ...profile.persona, name: '任意人物' } };
    expect(recommendSkills(profile, events)).toEqual(recommendSkills(changed, events));
    expect(recommendSkills(profile, events.map(e => ({ ...e, session_id: 'someone-else' }))).every(c => c.evidence.length === 0)).toBe(true);
  });
});

describe('提交版 JSON 导出', () => {
  it('六个维度都带判断、依据、置信度和不确定项，四张卡都有理由和下一步', async () => {
    const events = buildPlayerEvents(PLAYERS[0]);
    const profile = await analyze({ session_id: 'sample-cautious', round: 1, events, levels: buildSampleLevels() });
    const submission = buildSubmission(profile, events);
    expect(submission.schema).toBe('submission/v1');
    expect(submission.dimensions).toHaveLength(6);
    for (const dimension of submission.dimensions) {
      expect(dimension.judgement.length).toBeGreaterThan(0);
      expect(dimension.evidence.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(dimension.confidence);
      // 高置信度可以不写不确定项；其余情况必须写出来，导出不能把"还不知道"吞掉
      if (dimension.confidence !== 'high') expect(dimension.uncertain.length).toBeGreaterThan(0);
      // 证据排成字符串后仍然保留关卡和方向，评委不必回看界面
      expect(dimension.evidence[0]).toMatch(/^(L\d+|S\d+|补充关|\S+ · )/);
    }
    expect(submission.recommendations).toHaveLength(4);
    for (const recommendation of submission.recommendations) {
      expect(recommendation.reason.length).toBeGreaterThan(0);
      expect(recommendation.next_step).toContain(CARDS[recommendation.id].name);
      expect(recommendation.is_sample).toBe(true);
    }
  });

  it('导出不引入画像里没有的维度，也不改画像本身的判断', async () => {
    const events = buildPlayerEvents(PLAYERS[1]);
    const profile = await analyze({ session_id: 'sample-impulsive', round: 1, events, levels: buildSampleLevels() });
    const submission = buildSubmission(profile, events);
    expect(submission.dimensions.map(d => d.id)).toEqual(profile.dimensions.map(d => d.id));
    expect(submission.summary).toBe(profile.summary);
    expect(submission.persona).toEqual(profile.persona);
  });
});

describe('实际可运行的策略练习', () => {
  it('均线使用前收盘信号，在次日开盘成交；多空收益按实际持仓计算', () => {
    const known = Array.from({ length: 60 }, (_, i) => bar(i - 59, 100 + i));
    const future = [bar(1, 170, 160), bar(2, 180, 170)];
    const result = trend(synthetic(known, future), 5, 20, .5);
    expect(result.fills[0]).toMatchObject({ t: 1, price: 160, target: .5 });
    expect(result.ret).toBeCloseTo(.5 * (180 / 160 - 1));
    expect(result.drawdown).toBe(0);
  });

  it('未来行情的改动不能改变更早的信号或成交', () => {
    const changed = structuredClone(level);
    for (const b of changed.reveal.after_bars.filter(b => b.t >= 8)) for (const key of ['o', 'h', 'l', 'c'] as const) b[key] *= 3;
    for (const simulate of [(l: CompletedLevel) => trend(l, 5, 20, .5), (l: CompletedLevel) => reversal(l, 3, .5, true)]) {
      const before = simulate(level), after = simulate(changed);
      expect(after.fills.filter(f => f.t <= 8)).toEqual(before.fills.filter(f => f.t <= 8));
      expect(after.points.filter(p => p.t < 8)).toEqual(before.points.filter(p => p.t < 8));
    }
  });

  it('没有反转确认时不强行制造成交', () => {
    const known = Array.from({ length: 60 }, (_, i) => bar(i - 59, 200 - i));
    const future = Array.from({ length: 15 }, (_, i) => bar(i + 1, 140 - i));
    const result = reversal(synthetic(known, future), 3, .5, true);
    expect(result.fills).toHaveLength(0);
    expect(result.ret).toBe(0);
  });

  it('先下破、后收复的确认只能在下一根开盘成交，不能在确认前入场', () => {
    const known = Array.from({ length: 60 }, (_, i) => bar(i - 59, 200 - i));
    known[59] = bar(0, 130);
    const future = [bar(1, 133, 131), bar(2, 135, 134), bar(3, 137, 136)];
    const exercise = synthetic(known, future);
    expect(reversal(exercise, 3, .5, true).fills[0]).toMatchObject({ t: 2, price: 134, target: .5 });
    expect(reversal(exercise, 3, .5, false).fills[0]).toMatchObject({ t: 1, price: 131, target: .5 });
  });

  it('跳空越过止损按开盘价退出；同根触及两线采用保守顺序', () => {
    const exercise = synthetic([bar(0, 100)], [{ t: 1, o: 90, h: 105, l: 85, c: 92, v: 10 }]);
    const gap = shield(exercise, 1, .5, .05, .1);
    expect(gap.fills.at(-1)).toMatchObject({ price: 90, target: 0 });
    expect(gap.ret).toBeCloseTo(-.05);
    exercise.reveal.after_bars = [{ t: 1, o: 100, h: 120, l: 90, c: 110, v: 10 }];
    expect(shield(exercise, 1, 1, .05, .1).ret).toBeCloseTo(-.05);
    expect(shield(exercise, -1, 1, .05, .1).ret).toBeCloseTo(-.05);
  });

  it('保护线、方向和仓位确实改变结果；不设保护线的对照为相同入场持有', () => {
    const exercise = synthetic([bar(0, 100)], [{ t: 1, o: 100, h: 102, l: 94, c: 96, v: 10 }, bar(2, 120)]);
    expect(shield(exercise, 1, .5, .05, .1).ret).toBeCloseTo(-.025);
    expect(shield(exercise, 1, 1, .1, .1).ret).toBeCloseTo(.2); // 开盘直接跳过止盈线，按 120 退出。
    expect(shield(exercise, 1, .5, null, null).ret).toBeCloseTo(.1);
    expect(shield(exercise, -1, .5, null, null).ret).toBeCloseTo(-.1);
  });

  it('止损后等待不误记为浮亏加仓；随后重新入场的持仓动作仍可复盘', () => {
    const events = [
      { seq: 1, type: 'decision', data: { side: 'long', size: .5, confidence: 5 } },
      { seq: 2, type: 'stop_triggered', data: { pnl: -.025, step: 1 } },
      { seq: 3, type: 'hold_step', data: { pnl_before: -.025, action: 'add', position_after: .2 } },
      { seq: 4, type: 'hold_step', data: { pnl_before: -.05, action: 'add', position_after: .5 } },
    ].map(e => ({ ...e, level_id: 'L01', session_id: 't', at: '', t_ms: 0 })) as GameEvent[];
    expect(review(level, events)[2].seqs).toEqual([4]);
    expect(review(level, events)[2].text).toContain('1 次');
    expect(review(level, [])).toEqual([]);
  });

  it('观望复盘保留校准不确定项，不虚构成交；练习不修改原数据', () => {
    const before = structuredClone(level);
    const events = [{ seq: 1, session_id: 't', level_id: 'L01', t_ms: 0, at: '', type: 'decision', data: { side: 'flat', size: 0 } }] as GameEvent[];
    expect(review(level, events)[1].text).toContain('无法检验');
    trend(level, 5, 20, .5); reversal(level, 3, .5, true); shield(level, 1, .5, .05, .1);
    expect(level).toEqual(before);
  });
});
