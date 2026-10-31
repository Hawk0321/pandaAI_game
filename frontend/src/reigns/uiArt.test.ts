import { describe, expect, it } from 'vitest';
import { hintIcon, statIcon, statVisualState } from './uiArt';
import { STAT_KEYS } from './types';
import { ROLE_IDS } from './roles';

describe('pixel stat artwork', () => {
  it('uses the shared danger thresholds', () => {
    expect(statVisualState(20)).toBe('low');
    expect(statVisualState(21)).toBe('normal');
    expect(statVisualState(79)).toBe('normal');
    expect(statVisualState(80)).toBe('high');
  });

  it('has every role, stat and state plus hint icons', () => {
    for (const role of ROLE_IDS) for (const stat of STAT_KEYS) {
      for (const value of [10, 50, 90]) expect(statIcon(role, stat, value)).toBeTruthy();
      expect(hintIcon(stat)).toBeTruthy();
    }
  });
});
