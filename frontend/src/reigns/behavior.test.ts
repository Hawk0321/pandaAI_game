import { describe, expect, it } from 'vitest';
import { behaviorPersona } from './behavior';
import type { BehaviorAnalysis } from './types';

const base = (patch: Partial<BehaviorAnalysis>): BehaviorAnalysis => ({
  decisions: 12, longestStreak: 2, chaseCount: 0, dipCount: 0, panicFollowCount: 0,
  riskActionCount: 0, cautionCount: 0, reviewCount: 0, nightChaseCount: 0,
  lateFlipCount: 0, lateDecisionCount: 4, adventureCount: 0, endingPath: '', evidence: [], ...patch,
});

describe('composite behavior personas', () => {
  it.each([
    [{ chaseCount: 5, dipCount: 1 }, 'puffin'],
    [{ dipCount: 4, chaseCount: 1 }, 'raccoon'],
    [{ cautionCount: 4, riskActionCount: 1 }, 'gecko'],
    [{ reviewCount: 4, cautionCount: 2 }, 'squirrel'],
    [{ nightChaseCount: 2 }, 'bat'],
    [{ lateFlipCount: 4, lateDecisionCount: 6 }, 'panda'],
  ] as const)('detects repeated evidence %o', (patch, expected) => {
    expect(behaviorPersona(base(patch))).toBe(expected);
  });

  it('does not label a short or ambiguous sequence', () => {
    expect(behaviorPersona(base({ decisions: 5, chaseCount: 5 }))).toBeNull();
    expect(behaviorPersona(base({ chaseCount: 1, dipCount: 1 }))).toBeNull();
    expect(behaviorPersona(base({ lateFlipCount: 2 }))).toBeNull();
  });
});
