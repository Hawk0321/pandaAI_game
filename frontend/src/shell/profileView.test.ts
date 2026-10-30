import { describe, expect, it } from 'vitest';
import sample from '../../../data/samples/sample_profile.json';
import type { Profile } from '../shared/protocol';
import { isFixedSampleProfile } from './profileView';

describe('固定示例画像标记', () => {
  it('识别只替换了会话、时间和轮次的固定占位画像', () => {
    const profile = structuredClone(sample) as Profile;
    Object.assign(profile, { session_id: 'current', generated_at: new Date().toISOString(), round: 2 });
    expect(isFixedSampleProfile(profile)).toBe(true);
  });
  it('模拟行情上按本局行为计算的画像不隐藏事件核对', () => {
    const profile = structuredClone(sample) as Profile;
    profile.dimensions[0].evidence = [{ level_id: 'L01', event_seqs: [3], text: '本局先研究再判断', direction: '+' }];
    expect(profile.is_sample).toBe(true);
    expect(isFixedSampleProfile(profile)).toBe(false);
  });
  it('真实画像不标记为固定示例', () => {
    const profile = structuredClone(sample) as Profile;
    profile.is_sample = false;
    expect(isFixedSampleProfile(profile)).toBe(false);
  });
});
