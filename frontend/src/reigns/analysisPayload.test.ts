import { describe, expect, it } from 'vitest';
import { CATALOG } from '../recommend/catalog';
import { ALL_CARDS } from './allCards';
import { MAX_CHOICES, buildAnalysisPayload, parseAnalysis } from './analysisPayload';
import { choose, createGame } from './engine';
import type { GameState } from './types';

/** 用固定种子一直选左（或交替）直到结束，得到一局完整对局。 */
function play(seed: number, role: GameState['role'] = 'stock'): GameState {
  let s = createGame(ALL_CARDS, seed, role);
  let i = 0;
  while (!s.ending) {
    s = choose(s, i % 3 === 0 ? 'right' : 'left', ALL_CARDS);
    i += 1;
  }
  return s;
}

const ok = {
  summary: '这局你在风控上很稳，但几次跟风让信心起伏很大。',
  strengths: ['第 3 关面对加杠杆邀请时选择了拒绝'],
  blindSpots: ['第 7 关和第 12 关都跟着群里的消息走'],
  nextStep: '下一局试试每次跟风前先看一眼风控数值。',
  resourceIds: ['qube'],
};

describe('buildAnalysisPayload', () => {
  it('未结束的对局抛错', () => {
    expect(() => buildAnalysisPayload(createGame(ALL_CARDS, 1, 'fund'), ALL_CARDS)).toThrow();
  });

  it('包含角色、存活关数、结局、四项数值（角色叫法）、人格和选择记录', () => {
    const s = play(7, 'fund');
    const p = buildAnalysisPayload(s, ALL_CARDS);
    expect(p.role.name).toBe('基金经理');
    expect(p.survival.turns).toBe(s.turn);
    expect(p.ending.id).toBe(s.ending!.id);
    expect(p.stats.capital.label).toBe('业绩');
    expect(p.persona.name.length).toBeGreaterThan(0);
    expect(p.totalChoices).toBe(s.log.length);
    expect(p.choices.length).toBe(Math.min(s.log.length, MAX_CHOICES));
    expect(p.choices[0].turn).toBe(s.log.length - p.choices.length + 1);
    expect(p.is_sample).toBe(true);
  });

  it('选择记录里的 picked / other 与卡面一致', () => {
    const s = play(11, 'crypto');
    const p = buildAnalysisPayload(s, ALL_CARDS);
    for (const c of p.choices) {
      const card = ALL_CARDS.find((x) => x.id === c.cardId)!;
      expect([card.left.label, card.right.label]).toContain(c.picked);
      expect([card.left.label, card.right.label]).toContain(c.other);
      expect(c.picked).not.toBe(c.other);
      expect(c.pandaai).toBe(card.pandaai === true);
    }
  });

  it('白名单资源覆盖整个 CATALOG，且不含任何链接以外的密钥类字段', () => {
    const p = buildAnalysisPayload(play(3), ALL_CARDS);
    expect(p.allowedResources.map((r) => r.id).sort()).toEqual(Object.keys(CATALOG).sort());
    expect(JSON.stringify(p)).not.toMatch(/api[_-]?key|token|password|sk-/i);
  });

  it('纯函数：同一局两次结果相同，且可以 JSON 序列化', () => {
    const s = play(5);
    const a = buildAnalysisPayload(s, ALL_CARDS);
    expect(buildAnalysisPayload(s, ALL_CARDS)).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});

describe('parseAnalysis', () => {
  it('合格的对象和 JSON 字符串都能解析', () => {
    expect(parseAnalysis(ok)?.summary).toBe(ok.summary);
    expect(parseAnalysis(JSON.stringify(ok))?.resourceIds).toEqual(['qube']);
  });

  it('坏 JSON、缺字段、空列表返回 null', () => {
    expect(parseAnalysis('{not json')).toBeNull();
    expect(parseAnalysis(null)).toBeNull();
    expect(parseAnalysis({ ...ok, summary: '' })).toBeNull();
    expect(parseAnalysis({ ...ok, strengths: [] })).toBeNull();
    const { nextStep: _drop, ...noNext } = ok;
    expect(parseAnalysis(noNext)).toBeNull();
  });

  it('超长、含投资建议禁词、白名单外资源一律拒绝', () => {
    expect(parseAnalysis({ ...ok, summary: '长'.repeat(121) })).toBeNull();
    expect(parseAnalysis({ ...ok, nextStep: '下一局直接买入就稳赚' })).toBeNull();
    expect(parseAnalysis({ ...ok, resourceIds: ['made-up'] })).toBeNull();
    expect(parseAnalysis({ ...ok, resourceIds: ['qube', 'evo', 'community'] })).toBeNull();
  });

  it('resourceIds 可以省略', () => {
    const { resourceIds: _drop, ...rest } = ok;
    expect(parseAnalysis(rest)?.resourceIds).toEqual([]);
  });
});
