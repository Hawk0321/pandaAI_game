import { describe, expect, it } from 'vitest';
import type { Profile } from '../shared/protocol';
import { analyze } from '../profile/index';
import { PLAYERS, buildPlayerEvents, buildSampleLevels, type PlayerSample } from '../profile/samples';
import { recommend } from './recommend';

const levels = buildSampleLevels().slice(0, 4);
const player = (key: PlayerSample['key']) => PLAYERS.find((p) => p.key === key)!;
const run = (p: PlayerSample) => analyze({ session_id: p.key, round: 1, events: buildPlayerEvents(p), levels });
const ids = (p: Profile) => p.recommendations!.map((r) => r.id);

describe('推荐 recommend()', () => {
  it('每张卡都有依据的维度判断、证据原文、理由和真实链接', async () => {
    for (const p of PLAYERS) {
      const prof = await run(p);
      const recs = prof.recommendations!;
      expect(recs.length).toBeGreaterThanOrEqual(2);
      expect(recs.length).toBeLessThanOrEqual(4);
      // 每类最多一张，且至少一张 PandaAI 产品卡
      expect(new Set(recs.map((r) => r.type)).size).toBe(recs.length);
      expect(recs.some((r) => r.type === 'product' && r.resource.provider === 'PandaAI')).toBe(true);
      for (const r of recs) {
        expect(r.based_on.length).toBeGreaterThan(0);
        for (const b of r.based_on) {
          const dim = prof.dimensions.find((d) => d.id === b.dimension_id)!;
          expect(b.judgement).toBe(dim.judgement);
          for (const e of b.evidence) expect(dim.evidence.map((x) => x.text)).toContain(e);
        }
        expect(r.reason.length).toBeGreaterThan(10);
        expect(r.next_step.url).toBe(r.resource.url);
        expect(r.next_step.url).toMatch(/^https:\/\/(www\.pandaaiquant\.com|github\.com\/quantskills)\//);
        expect(r.resource.is_sample).toBe(false);
      }
    }
  });

  it('3 组模拟玩家的推荐明显不同', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map(run));
    expect(ids(c)).toContain('product-factor-center');
    expect(ids(c)).toContain('tool-overfit');
    expect(ids(i)).toContain('tool-stop-loss');
    expect(ids(i)).toContain('product-qube');
    expect(ids(w)).toContain('event-futures-contest');
    // 第一张卡互不相同
    expect(new Set([c, i, w].map((p) => ids(p)[0])).size).toBe(3);
  });

  it('改一个关键选择：冲动型四关都设止损、浮亏就平仓，止损工具不再出现', async () => {
    const base = player('impulsive');
    const tweaked: PlayerSample = structuredClone(base);
    tweaked.main = tweaked.main.map((l) => ({ ...l, size: 0.5, stop: 0.05, steps: l.steps.map((s) =>
      s.pnl_before < -0.01 ? { ...s, action: 'close' as const, position_after: 0 } : { ...s, action: 'hold' as const, position_after: l.side === 'short' ? -0.5 : 0.5 }) }));
    expect(ids(await run(base))[0]).toBe('tool-stop-loss');
    expect(ids(await run(tweaked))).not.toContain('tool-stop-loss');
  });

  it('趋势偏好明确时推荐均线策略，逆势时推荐超跌反弹，不明显时推荐 QBTI', async () => {
    const prof = await run(player('cautious'));
    const withStyle = (score: number | null): Profile => ({ ...prof, persona: { ...prof.persona, id: undefined }, dimensions: prof.dimensions.map((d) =>
      d.id === 'style' ? { ...d, score, confidence: 'medium' as const, conflict: false } : d) });
    const strategy = (p: Profile) => recommend(p).find((r) => r.type === 'strategy')?.id;
    expect(strategy(withStyle(0.8))).toBe('strategy-ma-cross');
    expect(strategy(withStyle(0.2))).toBe('strategy-oversold');
    expect(strategy(withStyle(0.5))).toBe('strategy-qbti');
  });

  it('策略卡优先按人物卡挑：猫头鹰 → 因子大赛上手技能包；蛮牛没有专属策略，按趋势偏好推荐', async () => {
    const [c, i] = await Promise.all([run(player('cautious')), run(player('impulsive'))]);
    const strategy = (p: Profile) => p.recommendations!.find((r) => r.type === 'strategy')!;
    expect(c.persona.id).toBe('owl');
    expect(strategy(c).resource.name).toBe('skill-pandaai-factor-online');
    expect(strategy(c).reason).toContain('夜猫研究员');
    expect(i.persona.id).toBe('bull');
    expect(strategy(i).id).toBe('strategy-ma-cross');
  });

  it('各项都不明显时，仍给 PandaAI 产品卡', async () => {
    const prof = await run(player('cautious'));
    const flat: Profile = { ...prof, dimensions: prof.dimensions.map((d) => ({ ...d, score: 0.5, confidence: 'low' as const, conflict: false })) };
    const recs = recommend(flat);
    expect(recs.map((r) => r.id)).toContain('product-qube');
  });
});
