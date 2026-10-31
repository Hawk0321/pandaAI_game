import { describe, expect, it } from 'vitest';
import { ALL_CARDS, cardsForRole } from './allCards';
import { createGame, PANDAAI_WEIGHT } from './engine';
import type { RoleId } from './types';

const ROLES: readonly RoleId[] = ['fund', 'crypto', 'stock'];
const PRODUCT = /PandaAI|QuantSkills|Qube|SimNow|EVO|因子中心|因子大赛|LLM ?对抗赛|期货模拟赛/;

describe('PandaAI 事件加权', () => {
  it('权重大于 1', () => {
    expect(PANDAAI_WEIGHT).toBeGreaterThan(1);
  });

  it('标了 pandaai 的卡正文都点名了 PandaAI 产品或活动，每个角色至少 3 张', () => {
    for (const card of ALL_CARDS.filter((c) => c.pandaai)) expect(PRODUCT.test(card.text), card.id).toBe(true);
    for (const role of ROLES) expect(cardsForRole(ALL_CARDS, role).filter((c) => c.pandaai).length, role).toBeGreaterThanOrEqual(3);
  });

  it('同一 seed 的牌序仍然确定', () => {
    for (const role of ROLES) {
      const a = createGame(ALL_CARDS, 42, role);
      const b = createGame(ALL_CARDS, 42, role);
      expect([a.current?.id, ...a.deck]).toEqual([b.current?.id, ...b.deck]);
    }
  });

  it('PandaAI 卡在牌堆里的平均位置明显比普通卡靠前', () => {
    for (const role of ROLES) {
      let pandaSum = 0, pandaN = 0, otherSum = 0, otherN = 0;
      for (let seed = 0; seed < 400; seed += 1) {
        const g = createGame(ALL_CARDS, seed, role);
        const order = [g.current!.id, ...g.deck];
        const byId = new Map(ALL_CARDS.map((c) => [c.id, c] as const));
        order.forEach((id, i) => {
          if (byId.get(id)?.pandaai) { pandaSum += i; pandaN += 1; } else { otherSum += i; otherN += 1; }
        });
      }
      expect(pandaSum / pandaN, role).toBeLessThan((otherSum / otherN) * 0.6);
    }
  });
});
