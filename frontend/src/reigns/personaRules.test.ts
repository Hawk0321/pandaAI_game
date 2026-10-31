/**
 * 兼容人格表（COMPATIBLE_PERSONAS）的契约测试。
 * 只依据 types.ts 里 ResolvedPersona 的规则和结局语义写，不依赖实现细节。
 */
import { describe, expect, it } from 'vitest';
import { getEndings } from './endings';
import { COMPATIBLE_PERSONAS } from './personaRules';
import { ROLE_IDS } from './roles';
import type { PersonaId, RoleId } from './types';

const ALL_PERSONAS: readonly PersonaId[] = [
  'sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox',
];

const ALL_ENDING_IDS: readonly string[] = Array.from(
  new Set(ROLE_IDS.flatMap((role) => getEndings(role).map((e) => e.id))),
);

function compat(endingId: string): readonly PersonaId[] {
  return Array.from(COMPATIBLE_PERSONAS(endingId));
}

describe('结局清单本身', () => {
  it('三个角色合计 38 个不同的结局 id', () => {
    // 24 个普通结局（3 角色 x 8）+ 9 个角色专属 + 5 个通用特殊
    expect(ALL_ENDING_IDS.length).toBe(38);
  });
});

describe('COMPATIBLE_PERSONAS：基本形状', () => {
  for (const role of ROLE_IDS) {
    describe(`角色 ${role}`, () => {
      for (const ending of getEndings(role)) {
        it(`${ending.id}：合法、不重复、黑名单实现`, () => {
          const list = compat(ending.id);
          // 黑名单实现：白名单 = 全部 9 个 - 黑名单，黑名单可以是空（白名单就是 9 个）
          expect(list.length).toBeGreaterThanOrEqual(1);
          expect(list.length).toBeLessThanOrEqual(9);
          for (const p of list) expect(ALL_PERSONAS).toContain(p);
          expect(new Set(list).size).toBe(list.length);
        });
      }
    });
  }

  it('同一个 id 多次调用结果一致', () => {
    for (const id of ALL_ENDING_IDS) expect(compat(id)).toEqual(compat(id));
  });

  it('未知 id 返回全部 9 个人格', () => {
    for (const id of ['', 'nope', 'fund-low-nothing', 'sp-does-not-exist', 'stock-low-capital-x']) {
      const list = compat(id);
      expect(list.length).toBe(9);
      expect(new Set(list)).toEqual(new Set(ALL_PERSONAS));
    }
  });
});

/**
 * 语义护栏（死逻辑）：这些结局下，某些人格与结局描述直接矛盾，兼容表必须排除。
 * ending 后缀模板里的 {role} 会对三个角色各展开一次。
 */
interface Guard {
  readonly endingTemplate: string; // 含 {role}，或是固定 id
  readonly forbidden: readonly PersonaId[];
  readonly reason: string;
}

const GUARDS: readonly Guard[] = [
  {
    endingTemplate: '{role}-low-capital',
    forbidden: ['turtle', 'sloth'],
    reason: '资金触底（爆仓/清盘/空钱包）：稳健老龟的风控和树懒的不操作都不会把本金亏光',
  },
  {
    endingTemplate: '{role}-high-risk',
    forbidden: ['bull'],
    reason: '风控爆满（管得过严、只看不买）：冲锋蛮牛是冲动重仓型，不可能风控爆满',
  },
  {
    endingTemplate: '{role}-high-confidence',
    forbidden: ['sloth', 'turtle'],
    reason: '信心爆满（盲目自信/死多头）：树懒观察员和稳健老龟本质谨慎，与盲目自信矛盾',
  },
  {
    endingTemplate: '{role}-low-risk',
    forbidden: ['turtle', 'sloth'],
    reason: '风控触底（重仓失守/被清算）：稳健老龟和树懒不会把仓位打穿',
  },
  {
    endingTemplate: 'sp-survivor',
    forbidden: ['bull'],
    reason: '活到收盘（没爆仓也没封神）：冲锋蛮牛的冲动操作与平稳走完全程矛盾',
  },
];

function expandGuard(guard: Guard): readonly string[] {
  return guard.endingTemplate.includes('{role}')
    ? ROLE_IDS.map((role: RoleId) => guard.endingTemplate.replace('{role}', role))
    : [guard.endingTemplate];
}

describe('COMPATIBLE_PERSONAS：语义护栏', () => {
  for (const guard of GUARDS) {
    for (const endingId of expandGuard(guard)) {
      it(`${endingId} 不得包含 ${guard.forbidden.join('、')}（${guard.reason}）`, () => {
        expect(ALL_ENDING_IDS).toContain(endingId); // 护栏指向的结局必须真实存在
        const list = compat(endingId);
        for (const banned of guard.forbidden) expect(list).not.toContain(banned);
      });
    }
  }

  it('sp-obsessive（偏执专家）允许全部 9 个人格', () => {
    expect(ALL_ENDING_IDS).toContain('sp-obsessive');
    const list = compat('sp-obsessive');
    expect(list.length).toBe(9);
    expect(new Set(list)).toEqual(new Set(ALL_PERSONAS));
  });
});
