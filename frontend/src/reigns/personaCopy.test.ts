import { describe, expect, it } from 'vitest';
import { buildEvidenceChips, buildWhyLine } from './personaCopy';
import type { PersonaId, ResolvedPersona, RoleId } from './types';

const PERSONAS: PersonaId[] = ['sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox'];
const ROLES: RoleId[] = ['fund', 'crypto', 'stock'];
const BANNED = ['买入', '卖出', '稳赚'];
const ROLE_BANNED: Readonly<Record<RoleId, readonly string[]>> = {
  fund: ['股友', '营业部'] as const,
  crypto: ['营业部', '股友'] as const,
  stock: [] as const,
};

function makeResolved(
  id: PersonaId,
  rawId: PersonaId,
  source: 'tally' | 'seeded',
  count: number,
  total: number,
  isTop: boolean,
  isTied: boolean,
): ResolvedPersona {
  return { id, rawId, source, count, total, isTop, isTied };
}

describe('buildWhyLine', () => {
  describe('文案分支表', () => {
    it('tally + 唯一最高 + count>=3: 次数和占比', () => {
      const resolved = makeResolved('bull', 'bull', 'tally', 5, 20, true, false);
      const line = buildWhyLine(resolved, '冲锋蛮牛', '爆仓离场', 'stock');
      expect(line).toContain('5 次');
      expect(line).toContain('25%');
      expect(line).toContain('偏冲动');
      expect(line).not.toContain('0 次');
      expect(line).not.toContain('0%');
    });

    it('tally + 并列最高: 不写占比', () => {
      const resolved = makeResolved('owl', 'owl', 'tally', 7, 21, true, true);
      const line = buildWhyLine(resolved, '夜猫研究员', '活到收盘', 'fund');
      expect(line).toContain('好几种风格不相上下');
      expect(line).toContain('各 7 次');
      expect(line).toContain('偏重研究');
      expect(line).not.toContain('%');
    });

    it('tally + 0<count<3: 不写占比', () => {
      const resolved = makeResolved('turtle', 'turtle', 'tally', 2, 10, true, false);
      const line = buildWhyLine(resolved, '稳健老龟', '清盘通知', 'crypto');
      expect(line).toContain('选择比较分散');
      expect(line).toContain('2 次');
      expect(line).toContain('偏谨慎');
      expect(line).not.toContain('%');
    });

    it('tally + 不是最高(兜底): 不写占比', () => {
      const resolved = makeResolved('owl', 'owl', 'tally', 4, 20, false, false);
      const line = buildWhyLine(resolved, '夜猫研究员', '活到收盘', 'stock');
      expect(line).toContain('4 次');
      expect(line).not.toContain('%');
    });

    it('tally + count=0(标签全空): 不写任何数字', () => {
      const resolved = makeResolved('fox', 'fox', 'tally', 0, 0, false, false);
      const line = buildWhyLine(resolved, '灵活狐狸', '活到收盘', 'fund');
      expect(line).not.toMatch(/\d/);
    });

    it('seeded + count>0: 补充次数', () => {
      const resolved = makeResolved('shark', 'dolphin', 'seeded', 3, 15, false, false);
      const line = buildWhyLine(resolved, '深海猎鲨', '明星基金经理的倒计时', 'fund');
      expect(line).toContain('“明星基金经理的倒计时”这样的结局');
      expect(line).toContain('常见于深海猎鲨这类');
      expect(line).toContain('选择比较分散');
      expect(line).toContain('按结局的气质给你配了这张卡');
      expect(line).toContain('你有 3 次选择偏重仓集中');
    });

    it('seeded + count=0: 不提次数，不写 0', () => {
      const resolved = makeResolved('hedgehog', 'owl', 'seeded', 0, 12, false, false);
      const line = buildWhyLine(resolved, '死扛刺猬', '套牢信徒', 'stock');
      expect(line).toContain('“套牢信徒”这样的结局');
      expect(line).toContain('常见于死扛刺猬这类');
      expect(line).toContain('选择比较分散');
      expect(line).not.toContain('0 次');
      expect(line).not.toContain('0%');
      expect(line).not.toMatch(/\d+ 次/);
    });
  });

  describe('禁用词：买入/卖出/稳赚', () => {
    const cases: Array<{ resolved: ResolvedPersona; persona: string; ending: string }> = [
      { resolved: makeResolved('bull', 'bull', 'tally', 8, 20, true, false), persona: '冲锋蛮牛', ending: '爆仓离场' },
      { resolved: makeResolved('owl', 'owl', 'tally', 4, 18, true, true), persona: '夜猫研究员', ending: '清盘通知' },
      { resolved: makeResolved('shark', 'dolphin', 'seeded', 5, 15, false, false), persona: '深海猎鲨', ending: '赢了业绩输了人心' },
      { resolved: makeResolved('hedgehog', 'owl', 'seeded', 0, 10, false, false), persona: '死扛刺猬', ending: '套牢信徒' },
    ];

    for (const { resolved, persona, ending } of cases) {
      for (const role of ROLES) {
        it(`${persona} / ${ending} / ${role}`, () => {
          const line = buildWhyLine(resolved, persona, ending, role);
          for (const word of BANNED) expect(line).not.toContain(word);
        });
      }
    }
  });

  describe('角色措辞：基金经理不说"股友""营业部"，Web3 不说"营业部""股友"', () => {
    const cases: Array<{ resolved: ResolvedPersona; persona: string; ending: string }> = [
      { resolved: makeResolved('bull', 'bull', 'tally', 6, 18, true, false), persona: '冲锋蛮牛', ending: '爆仓离场' },
      { resolved: makeResolved('shark', 'dolphin', 'seeded', 3, 12, false, false), persona: '深海猎鲨', ending: '赢了业绩输了人心' },
      { resolved: makeResolved('hedgehog', 'owl', 'seeded', 0, 10, false, false), persona: '死扛刺猬', ending: '登月成功' },
    ];

    for (const { resolved, persona, ending } of cases) {
      for (const role of ['fund', 'crypto'] as const) {
        it(`${role} / ${persona} / ${ending}`, () => {
          const line = buildWhyLine(resolved, persona, ending, role);
          for (const word of ROLE_BANNED[role]) expect(line).not.toContain(word);
        });
      }
    }
  });

  describe('seeded 且 count=0: 不出现"0 次"或"0%"', () => {
    for (const persona of PERSONAS) {
      it(persona, () => {
        const resolved = makeResolved(persona, 'fox', 'seeded', 0, 15, false, false);
        const line = buildWhyLine(resolved, `人物卡-${persona}`, '测试结局', 'stock');
        expect(line).not.toContain('0 次');
        expect(line).not.toContain('0%');
      });
    }
  });
});

describe('buildEvidenceChips', () => {
  it('tally + 唯一最高 + count>=3: 次数 + 占比 + 主要线索', () => {
    const resolved = makeResolved('bull', 'bull', 'tally', 8, 20, true, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips).toHaveLength(3);
    expect(chips.some((c) => c.label.includes('偏冲动') && c.label.includes('8 次'))).toBe(true);
    expect(chips.some((c) => c.label.includes('占比') && c.label.includes('40%'))).toBe(true);
    expect(chips.some((c) => c.label === '主要线索')).toBe(true);
  });

  it('tally + 并列最高: 次数 + 并列最高', () => {
    const resolved = makeResolved('owl', 'owl', 'tally', 5, 20, true, true);
    const chips = buildEvidenceChips(resolved);
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.some((c) => c.label.includes('偏重研究') && c.label.includes('5 次'))).toBe(true);
    expect(chips.some((c) => c.label === '并列最高')).toBe(true);
    expect(chips.every((c) => !c.label.includes('占比'))).toBe(true);
  });

  it('tally + 0<count<3: 次数 + 主要线索，不放占比', () => {
    const resolved = makeResolved('turtle', 'turtle', 'tally', 2, 10, true, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips.some((c) => c.label.includes('偏谨慎') && c.label.includes('2 次'))).toBe(true);
    expect(chips.some((c) => c.label === '主要线索')).toBe(true);
    expect(chips.every((c) => !c.label.includes('占比'))).toBe(true);
  });

  it('seeded + count>0: 只放次数胶囊，不放占比', () => {
    const resolved = makeResolved('shark', 'dolphin', 'seeded', 4, 16, false, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toContain('偏重仓集中');
    expect(chips[0].label).toContain('4 次');
    expect(chips.every((c) => !c.label.includes('占比') && !c.label.includes('%'))).toBe(true);
  });

  it('seeded + count=0: 一个都不放', () => {
    const resolved = makeResolved('hedgehog', 'owl', 'seeded', 0, 12, false, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips).toHaveLength(0);
  });

  it('tally + count=0: 一个都不放', () => {
    const resolved = makeResolved('fox', 'fox', 'tally', 0, 10, false, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips).toHaveLength(0);
  });

  describe('胶囊与 resolved 一致', () => {
    const cases: ResolvedPersona[] = [
      makeResolved('bull', 'bull', 'tally', 7, 21, true, false),
      makeResolved('owl', 'owl', 'tally', 3, 12, false, false),
      makeResolved('turtle', 'dolphin', 'seeded', 5, 18, false, false),
      makeResolved('shark', 'fox', 'seeded', 0, 15, false, false),
    ];

    for (const resolved of cases) {
      it(`${resolved.id} (source=${resolved.source}, count=${resolved.count})`, () => {
        const chips = buildEvidenceChips(resolved);
        const countChip = chips.find((c) => c.label.includes('次'));
        if (countChip && resolved.count > 0) expect(countChip.label).toContain(`${resolved.count} 次`);

        const shareChip = chips.find((c) => c.label.includes('占比'));
        if (shareChip) {
          const expected = Math.round((resolved.count / resolved.total) * 100);
          expect(shareChip.label).toContain(`${expected}%`);
        }

        if (resolved.source === 'seeded' && resolved.count === 0) {
          expect(chips.every((c) => !c.label.includes('次') && !c.label.includes('%'))).toBe(true);
        }
      });
    }
  });

  it('最多返回 3 个', () => {
    const resolved = makeResolved('bull', 'bull', 'tally', 10, 20, true, false);
    const chips = buildEvidenceChips(resolved);
    expect(chips.length).toBeLessThanOrEqual(3);
  });
});
