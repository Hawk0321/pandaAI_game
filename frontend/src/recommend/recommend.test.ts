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
  it('每条推荐都有依据的维度判断、证据原文、理由和可点击的下一步', async () => {
    for (const p of PLAYERS) {
      const prof = await run(p);
      const recs = prof.recommendations!;
      expect(recs.length).toBeGreaterThanOrEqual(2);
      expect(recs.length).toBeLessThanOrEqual(4);
      expect(recs.some((r) => r.type === 'task' && r.next_step.kind === 'in_app_task')).toBe(true);
      for (const r of recs) {
        expect(r.based_on.length).toBeGreaterThan(0);
        for (const b of r.based_on) {
          const dim = prof.dimensions.find((d) => d.id === b.dimension_id)!;
          expect(b.judgement).toBe(dim.judgement);
          for (const e of b.evidence) expect(dim.evidence.map((x) => x.text)).toContain(e);
        }
        expect(r.reason.length).toBeGreaterThan(10);
        if (r.next_step.kind === 'external') expect(r.next_step.url).toMatch(/^https:\/\//);
        else expect(r.next_step.task).toBeDefined();
      }
    }
  });

  it('3 组模拟玩家的推荐明显不同', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map(run));
    expect(ids(c)).toContain('task-style_match');
    expect(ids(c)).toContain('res-qube');
    expect(ids(i)).toContain('task-stop_drill');
    expect(ids(i)).toContain('task-key_clue_drill');
    expect(ids(i)).toContain('res-stop-skill');
    expect(ids(w)).toContain('task-calibration_quiz');
    expect(ids(w)).toContain('res-futures-contest');
    // 第一条推荐互不相同
    expect(new Set([c, i, w].map((p) => ids(p)[0])).size).toBe(3);
  });

  it('信息隔离：复盘类任务只用玩过（已揭晓）的关；信心小测排除玩过的关', async () => {
    const played = levels.map((l) => l.play.id);
    for (const p of PLAYERS) {
      for (const r of (await run(p)).recommendations!) {
        const t = r.next_step.task;
        if (!t) continue;
        if (t.id === 'calibration_quiz') {
          expect(t.level_ids).toEqual([]);
          expect(t.exclude_ids).toEqual(played);
        } else {
          for (const id of t.level_ids) expect(played).toContain(id);
        }
      }
    }
  });

  it('止损演练挑"重仓没设止损、方向又做反了"的那关', async () => {
    const stop = (await run(player('impulsive'))).recommendations!.find((r) => r.id === 'task-stop_drill')!;
    expect(stop.next_step.task!.level_ids).toEqual(['S02']);
  });

  it('改一个关键选择：冲动型四关都设止损、浮亏就平仓，止损演练不再排第一', async () => {
    const base = player('impulsive');
    const tweaked: PlayerSample = structuredClone(base);
    tweaked.main = tweaked.main.map((l) => ({ ...l, size: 0.5, stop: 0.05, steps: l.steps.map((s) =>
      s.pnl_before < -0.01 ? { ...s, action: 'close' as const, position_after: 0 } : { ...s, action: 'hold' as const, position_after: l.side === 'short' ? -0.5 : 0.5 }) }));
    const before = await run(base);
    const after = await run(tweaked);
    expect(ids(before)[0]).toBe('task-stop_drill');
    expect(ids(after)).not.toContain('task-stop_drill');
    expect(ids(after)).not.toContain('res-stop-skill');
    // 证据使用没改，复盘线索的推荐仍在
    expect(ids(after)).toContain('task-key_clue_drill');
  });

  it('没有短板时仍给一个能当场体验的任务', async () => {
    const prof = await run(player('cautious'));
    const strong: Profile = { ...prof, dimensions: prof.dimensions.map((d) => ({ ...d, score: 0.5, confidence: 'low' as const, conflict: false })) };
    const recs = recommend(strong, { events: buildPlayerEvents(player('cautious')), levels });
    expect(recs.some((r) => r.type === 'task')).toBe(true);
  });
});
