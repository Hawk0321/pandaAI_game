import { describe, expect, it } from 'vitest';
import { dangerStats, finalSfxFor, isInDanger, newlyDangerous, playBgmFor } from './bgmPlan';
import type { Stats } from '../types';

const MID: Stats = { capital: 50, risk: 50, confidence: 50, reputation: 50 };

describe('bgmPlan', () => {
  it('按角色给出安全区曲目', () => {
    expect(playBgmFor('fund')).toBe('bgm-play-fund-safe');
    expect(playBgmFor('crypto')).toBe('bgm-play-crypto-safe');
  });

  it('危险区边界：20 和 80 含端点，21 和 79 安全', () => {
    expect(isInDanger(MID)).toBe(false);
    expect(isInDanger({ ...MID, capital: 21, risk: 79 })).toBe(false);
    expect(dangerStats({ ...MID, capital: 20 })).toEqual(['capital']);
    expect(dangerStats({ ...MID, reputation: 80, risk: 0 })).toEqual(['risk', 'reputation']);
  });

  it('只报告新进入危险区的数值', () => {
    const danger = { ...MID, capital: 18 };
    expect(newlyDangerous(MID, danger)).toEqual(['capital']);
    expect(newlyDangerous(danger, { ...danger, capital: 12 })).toEqual([]);
    expect(newlyDangerous(danger, { ...danger, risk: 85 })).toEqual(['risk']);
  });

  it('结局音效：触底 low，爆满 high，其余静默', () => {
    expect(finalSfxFor({ ...MID, capital: 0 })).toBe('sfx-final-low');
    expect(finalSfxFor({ ...MID, reputation: 100 })).toBe('sfx-final-high');
    expect(finalSfxFor({ ...MID, capital: 15 })).toBeNull();
  });
});
