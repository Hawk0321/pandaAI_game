import { ADVENTURES } from './adventures';
import { CARDS } from './cards';
import { ROLE_CARDS } from './roleCards';
import type { Card, RoleId } from './types';

/** 日常卡 + 奇遇卡 + 角色专属卡，界面和引擎都用它（引擎按角色过滤）。 */
export const ALL_CARDS: readonly Card[] = [...CARDS, ...ADVENTURES, ...ROLE_CARDS];

/** 某个角色可用的牌：roles 省略（三角色共享）或包含该角色。 */
export function cardsForRole(cards: readonly Card[], role: RoleId): Card[] {
  return cards.filter((c) => c.roles === undefined || c.roles.includes(role));
}
