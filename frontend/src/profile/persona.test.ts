import { describe, expect, it } from 'vitest';
import type { Feature, Features } from './features';
import { PERSONA_CARDS, pickPersona } from './persona';

const F = (value: number | null, n = 4): Feature => ({ value, n });
const base = (): Features => ({
  levels: 4, flat_rate: F(0), avg_size: F(0.5), stop_rate: F(0.5), add_on_loss: F(0), cut_on_loss: F(0),
  research_spend: F(0.5), think_sec: F(15), key_clue_hit: F(0.5), clue_agree: F(0.5), confirm_only: F(0),
  trend_follow: F(0.5), avg_confidence: F(3), hit_rate: F(0.5), overconfidence: F(0.1), reveal_dwell_sec: F(5),
});
const id = (patch: Partial<Features>) => pickPersona({ ...base(), ...patch }).card.id;

describe('人物卡：由行为特征直接判别', () => {
  it('9 张卡都能被触发', () => {
    expect(id({ flat_rate: F(0.75), avg_size: F(0.1) })).toBe('sloth');
    expect(id({ avg_size: F(1), overconfidence: F(0.3) })).toBe('bull');
    expect(id({ avg_size: F(1), avg_confidence: F(5), research_spend: F(0.2), overconfidence: F(null, 1) })).toBe('bull');
    expect(id({ add_on_loss: F(2) })).toBe('hedgehog');
    expect(id({ add_on_loss: F(1), cut_on_loss: F(0), stop_rate: F(0) })).toBe('hedgehog');
    expect(id({ research_spend: F(0.9), key_clue_hit: F(0.8), clue_agree: F(0.8) })).toBe('owl');
    expect(id({ avg_size: F(0.8), research_spend: F(0.75), clue_agree: F(1), key_clue_hit: F(0.4) })).toBe('shark');
    expect(id({ stop_rate: F(1), avg_size: F(0.3) })).toBe('turtle');
    expect(id({ trend_follow: F(1, 3) })).toBe('dolphin');
    expect(id({ trend_follow: F(0, 3) })).toBe('crab');
    expect(id({})).toBe('fox');
  });

  it('样本不够时不下结论：只有 1 关有趋势不判趋势/逆势', () => {
    expect(id({ trend_follow: F(1, 1) })).toBe('fox');
  });

  it('同时符合多张卡时，按顺序给主卡并附第二张', () => {
    const r = pickPersona({ ...base(), avg_size: F(1), overconfidence: F(0.4), add_on_loss: F(2) });
    expect(r.card.id).toBe('bull');
    expect(r.persona.also?.id).toBe('hedgehog');
    expect(r.persona.why).toContain('平均仓位 100%');
  });

  it('每张卡都有金融依据、文献、判别规则和视觉建议', () => {
    for (const c of Object.values(PERSONA_CARDS)) {
      expect(c.basis.length).toBeGreaterThan(20);
      expect(c.refs.length).toBeGreaterThan(0);
      expect(c.traits).toHaveLength(3);
      expect(c.rule.length).toBeGreaterThan(0);
      expect(c.palette.main).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
