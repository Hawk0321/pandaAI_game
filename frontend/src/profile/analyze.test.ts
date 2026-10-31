import { describe, expect, it } from 'vitest';
import playL01 from '../../../data/samples/levels/L01.play.json';
import revealL01 from '../../../data/samples/levels/L01.reveal.json';
import sampleEvents from '../../../data/samples/sample_events.json';
import type { GameEvent, LevelPlay, LevelReveal, Profile } from '../shared/protocol';
import { analyze } from './index';
import { judge } from './judge';
import type { RawEvidence } from './evidence';

const L01 = { play: playL01 as LevelPlay, reveal: revealL01 as LevelReveal };
const events = sampleEvents.events as GameEvent[];

function checkShape(p: Profile) {
  expect(p.schema).toBe('profile/v1');
  expect(p.dimensions.map((d) => d.id)).toEqual(['evidence_use', 'calibration', 'risk_control', 'style', 'research_depth', 'risk_appetite']);
  expect(p.dimensions.filter((d) => d.group === 'ability')).toHaveLength(3);
  expect(p.persona.is_fun_label).toBe(true);
  for (const d of p.dimensions) {
    expect(Object.keys(d).sort()).toEqual(['confidence', 'conflict', 'evidence', 'group', 'id', 'judgement', 'name', 'score', 'uncertain']);
    // 有判断（score 不为空）就至少有一条证据
    if (d.score !== null) expect(d.evidence.length).toBeGreaterThan(0);
    // 置信度不是 high 时必须写清还不确定什么
    if (d.confidence !== 'high') expect(d.uncertain.length).toBeGreaterThan(0);
  }
}

describe('判断层 analyze()', () => {
  it('仓库示例事件：结构符合协议，只有 1 关时全部为低置信度并列入 needs_more', async () => {
    const p = await analyze({ session_id: 'sample-0001', round: 1, events, levels: [L01] });
    checkShape(p);
    expect(p.method).toBe('rules');
    expect(p.is_sample).toBe(true);
    expect(p.dimensions.every((d) => d.confidence === 'low')).toBe(true);
    expect(p.needs_more.length).toBeGreaterThan(0);
    expect(p.needs_more[0].dimension_id).toBe('evidence_use');
    expect(p.dimensions.find((d) => d.id === 'evidence_use')!.uncertain).toContain('只有 1 关');
  });

  it('置信度：关数越多、方向越一致越高；有方向相反的证据标 conflict', () => {
    const ev = (level: string, value: number): RawEvidence => ({ dim: 'risk_control', level_id: level, event_seqs: [1], text: level, value });
    const [, , consistent] = judge([ev('a', 0.9), ev('b', 0.85), ev('c', 0.8)]);
    expect(consistent.confidence).toBe('high');
    expect(consistent.conflict).toBe(false);
    expect(consistent.evidence.every((e) => e.direction === '+')).toBe(true);

    const [, , mixed] = judge([ev('a', 0.9), ev('b', 0.1), ev('c', 0.85)]);
    expect(mixed.conflict).toBe(true);
    expect(mixed.confidence).not.toBe('high');
    expect(mixed.evidence.map((e) => e.direction)).toEqual(['+', '-', '+']);

    const [, , thin] = judge([ev('a', 0.9)]);
    expect(thin.confidence).toBe('low');

    const [, , none] = judge([{ ...ev('a', 0), value: null }]);
    expect(none.score).toBeNull();
    expect(none.judgement).toContain('证据不足');
  });

  it('round 2：根据 previous 输出 changes', async () => {
    const r1 = await analyze({ session_id: 's', round: 1, events, levels: [L01] });
    // 人为把 round 1 的一个判断改掉，模拟"补充关卡前后判断不同"
    const prev = structuredClone(r1);
    prev.dimensions[0].judgement = '旧判断';
    const r2 = await analyze({ session_id: 's', round: 2, events, levels: [L01], previous: prev });
    expect(r2.round).toBe(2);
    expect(r2.changes).toEqual([{ dimension_id: 'evidence_use', before: '旧判断（置信度低）', after: `${r1.dimensions[0].judgement}（置信度低）` }]);

    const same = await analyze({ session_id: 's', round: 2, events, levels: [L01], previous: r1 });
    expect(same.changes).toEqual([]);
    expect(same.summary).toContain('没有改变');
  });
});
