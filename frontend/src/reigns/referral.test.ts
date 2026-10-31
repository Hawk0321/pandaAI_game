import { describe, expect, it } from 'vitest';
import { PERSONA_CARDS } from '../profile/persona';
import { CATALOG } from '../recommend/catalog';
import { buildReferrals, tagFact, toolKeyFor } from './referral';
import { ROLES, ROLE_IDS } from './roles';
import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Ending, PersonaId, RoleId, StatKey, Stats, StyleTally } from './types';

const PERSONAS = Object.keys(PERSONA_CARDS) as PersonaId[];
const CATALOG_URLS = new Set(Object.values(CATALOG).map((r) => r.url));
const BANNED = ['买入', '卖出', '稳赚'];

const normal = (stat: StatKey, kind: 'low' | 'high', role: RoleId = 'stock'): Ending => ({
  id: `${role}-${kind}-${stat}`, role, stat, kind, title: `${stat}-${kind}`, description: '示例结局', special: false,
});
const endingsFor = (role: RoleId): Ending[] => [
  ...STAT_KEYS.flatMap((k) => [normal(k, 'low', role), normal(k, 'high', role)]),
  { id: 'sp-survive', role: 'all', stat: null, kind: 'survive', title: '平稳走完', description: '示例存活结局', special: true },
  { id: `sp-${role}-demo`, role, stat: null, kind: 'special', title: '隐藏示例', description: '示例特殊结局', special: true },
];
const ENDINGS: Ending[] = endingsFor('stock');

const stats = (v: number): Stats => ({ capital: v, risk: v, confidence: v, reputation: v });
const tallyOf = (personaId: PersonaId, n: number): StyleTally => {
  const base = Object.fromEntries(STYLE_TAGS.map((t) => [t, 0])) as Record<string, number>;
  const tag = { sloth: 'passive', bull: 'impulsive', hedgehog: 'stubborn', owl: 'research', shark: 'concentrated', turtle: 'cautious', dolphin: 'trend', crab: 'contrarian', fox: 'adaptive' }[personaId];
  return { ...base, [tag]: n } as StyleTally;
};

describe('buildReferrals', () => {
  for (const role of ROLE_IDS) {
   for (const persona of PERSONAS) {
    for (const ending of endingsFor(role)) {
      it(`${role} / ${persona} / ${ending.id}: 3 张卡、链接来自 CATALOG、产品卡在内、文案合规`, () => {
        const list = buildReferrals(persona, ending, stats(ending.kind === 'low' ? 0 : 100), tallyOf(persona, 7), role);
        expect(list).toHaveLength(3);
        expect(list.map((r) => r.type)).toEqual(['strategy', 'tool', 'product']);
        expect(list.some((r) => r.resource.provider === 'PandaAI' && r.type === 'product')).toBe(true);
        expect(new Set(list.map((r) => r.resource.url)).size).toBe(3);
        for (const r of list) {
          expect(r.resource.url.startsWith('https://')).toBe(true);
          expect(CATALOG_URLS.has(r.resource.url)).toBe(true);
          expect(r.title.trim()).not.toBe('');
          expect(r.cta.trim()).not.toBe('');
          expect(r.reason.trim()).not.toBe('');
          for (const word of BANNED) {
            expect(r.reason).not.toContain(word);
            expect(r.title).not.toContain(word);
            expect(r.cta).not.toContain(word);
          }
        }
      });
    }
   }
  }

  it('产品卡：owl / shark 给量化因子中心，其余给 Qube', () => {
    for (const persona of PERSONAS) {
      const product = buildReferrals(persona, ENDINGS[0], stats(50), tallyOf(persona, 3))[2];
      expect(product.resource).toBe(persona === 'owl' || persona === 'shark' ? CATALOG.factorCenter : CATALOG.qube);
    }
  });

  it('策略卡：蛮牛、刺猬走兜底，树懒走 PERSONA_STRATEGY', () => {
    const pick = (p: PersonaId) => buildReferrals(p, ENDINGS[2], stats(50), tallyOf(p, 2))[0].resource;
    expect(pick('bull')).toBe(CATALOG.stopLoss);
    expect(pick('hedgehog')).toBe(CATALOG.behavior);
    expect(pick('sloth')).toBe(CATALOG.kline);
  });

  it('理由里引用 tally 的次数', () => {
    const first = buildReferrals('bull', ENDINGS[0], stats(0), tallyOf('bull', 5))[0];
    expect(first.reason).toContain('5 次');
    expect(first.reason).toContain('冲动');
  });

  it('次数为 0 时不写“0 次”', () => {
    expect(tagFact('bull', tallyOf('bull', 0))).not.toContain('0 次');
  });

  it('角色口吻：基金经理提到持有人，Web3 提到链上，资源映射不随角色变化', () => {
    const at = (role: RoleId) => buildReferrals('owl', normal('risk', 'low', role), stats(0), tallyOf('owl', 4), role);
    expect(at('fund').some((r) => r.reason.includes('持有人'))).toBe(true);
    expect(at('crypto').some((r) => r.reason.includes('链上'))).toBe(true);
    const urls = (role: RoleId) => at(role).map((r) => r.resource.url);
    expect(urls('fund')).toEqual(urls('stock'));
    expect(urls('crypto')).toEqual(urls('stock'));
  });

  it('角色标签：工具卡理由用该角色对这条数值的叫法；未传 role 时取 ending.role', () => {
    const tool = buildReferrals('fox', normal('risk', 'low', 'crypto'), stats(0), tallyOf('fox', 3))[1];
    expect(tool.reason).toContain(ROLES.crypto.stats.risk.label);
    expect(tool.reason).toContain('链上');
  });

  it('共用结局（role=all）且没传 role 时不带角色口吻', () => {
    const shared = endingsFor('fund').find((e) => e.role === 'all')!;
    const list = buildReferrals('fox', shared, stats(50), tallyOf('fox', 3));
    expect(list.some((r) => /持有人|链上/.test(r.reason))).toBe(false);
  });

  it('结局 → 工具卡映射', () => {
    expect(toolKeyFor(normal('risk', 'low'))).toBe('stopLoss');
    expect(toolKeyFor(normal('confidence', 'high'))).toBe('calibration');
    expect(toolKeyFor(normal('reputation', 'low'))).toBe('tradeReview');
    expect(toolKeyFor(ENDINGS[8])).toBe('dailyReview');
  });
});
