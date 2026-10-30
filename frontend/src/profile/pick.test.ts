import { describe, expect, it } from 'vitest';
import type { Dimension, DimensionId, LevelIndex, Profile } from '../shared/protocol';
import { pickNextLevel } from './index';

const dim = (id: DimensionId, group: Dimension['group'], confidence: Dimension['confidence'], conflict = false): Dimension =>
  ({ id, group, name: id, judgement: 'x', score: 0.5, evidence: [], confidence, uncertain: '', conflict });

const profile = (dims: Dimension[], round: 1 | 2 = 1): Profile => ({
  schema: 'profile/v1', session_id: 's', is_sample: true, generated_at: '', method: 'rules', round, dimensions: dims,
  persona: { name: '', emoji: '', tagline: '', is_fun_label: true }, summary: '', needs_more: [],
});

const allHigh = (): Dimension[] => [
  dim('evidence_use', 'ability', 'high'), dim('calibration', 'ability', 'high'), dim('risk_control', 'ability', 'high'),
  dim('style', 'preference', 'high'), dim('research_depth', 'preference', 'high'), dim('risk_appetite', 'preference', 'high'),
];
const with_ = (id: DimensionId, confidence: Dimension['confidence'], conflict = false) =>
  allHigh().map((d) => (d.id === id ? { ...d, confidence, conflict } : d));

const index: LevelIndex = {
  schema: 'level-index/v1', main: ['L01', 'L02', 'L03', 'L04'],
  pool: [
    { id: 'P1', probes: ['evidence_use'] },
    { id: 'P2', probes: ['calibration', 'risk_control'] },
    { id: 'P3', probes: ['risk_control'] },
  ],
};

describe('pickNextLevel()', () => {
  it('能力维度都看准了就返回 null', () => {
    expect(pickNextLevel(profile(allHigh()), index, ['L01'])).toBeNull();
    expect(pickNextLevel(profile(with_('calibration', 'medium')), index, [])).toBeNull();
  });

  it('只看能力维度：偏好维度不准不触发补充关卡', () => {
    expect(pickNextLevel(profile(with_('style', 'low', true)), index, [])).toBeNull();
  });

  it('选置信度低的能力维度对应的关卡', () => {
    expect(pickNextLevel(profile(with_('risk_control', 'low')), index, [])).toBe('P2');
    expect(pickNextLevel(profile(with_('evidence_use', 'low')), index, [])).toBe('P1');
  });

  it('有冲突的维度也要补；同为低置信度时冲突优先', () => {
    expect(pickNextLevel(profile(with_('calibration', 'medium', true)), index, [])).toBe('P2');
    const dims = allHigh().map((d) =>
      d.id === 'evidence_use' ? { ...d, confidence: 'low' as const } : d.id === 'risk_control' ? { ...d, confidence: 'low' as const, conflict: true } : d);
    expect(pickNextLevel(profile(dims), index, [])).toBe('P2');
  });

  it('跳过玩过的关卡；对应维度没有可用关卡时换下一个维度，都没有则 null', () => {
    expect(pickNextLevel(profile(with_('risk_control', 'low')), index, ['P2'])).toBe('P3');
    expect(pickNextLevel(profile(with_('risk_control', 'low')), index, ['P2', 'P3'])).toBeNull();
    const dims = allHigh().map((d) => (d.group === 'ability' && d.id !== 'calibration' ? { ...d, confidence: 'low' as const } : d));
    expect(pickNextLevel(profile(dims), index, ['P1'])).toBe('P2');
  });

  it('第 2 轮之后不再补关', () => {
    expect(pickNextLevel(profile(with_('risk_control', 'low'), 2), index, [])).toBeNull();
  });
});
