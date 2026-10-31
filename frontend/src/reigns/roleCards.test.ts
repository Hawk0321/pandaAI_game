import { describe, expect, it } from 'vitest';
import { ALL_CARDS, cardsForRole } from './allCards';
import { ROLE_CARDS } from './roleCards';
import { ROLE_IDS } from './roles';
import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, RoleId, StatKey, StyleTag } from './types';

const choicesOf = (cards: readonly Card[]) => cards.flatMap((c) => [c.left, c.right]);

function statSum(cards: readonly Card[], key: StatKey): number {
  return choicesOf(cards).reduce((acc, ch) => acc + (ch.effects[key] ?? 0), 0);
}

function statTouches(cards: readonly Card[], key: StatKey): number {
  return choicesOf(cards).filter((ch) => ch.effects[key] !== undefined).length;
}

const FORBIDDEN_WORDS = [
  'BTC', 'ETH', 'USDT', 'SOL', 'DOGE', 'Binance', 'OKX', 'Coinbase',
  '比特币', '以太坊', '狗狗币', '币安', '欧易', '火币', '特斯拉', '茅台',
];

describe('角色专属卡', () => {
  it('id 全库唯一', () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('专属卡数量达标，id 前缀与 roles 对应', () => {
    const count = (role: RoleId) => ROLE_CARDS.filter((c) => c.roles?.[0] === role).length;
    expect(count('fund')).toBeGreaterThanOrEqual(10);
    expect(count('crypto')).toBeGreaterThanOrEqual(10);
    expect(count('stock')).toBeGreaterThanOrEqual(6);
    for (const card of ROLE_CARDS) {
      expect(card.roles, card.id).toHaveLength(1);
      expect(card.id.startsWith(`${card.roles?.[0]}-`), card.id).toBe(true);
      expect(card.is_sample).toBe(true);
    }
  });

  it('每个角色的可用牌库 ≥ 35 张，且含共享卡', () => {
    for (const role of ROLE_IDS) {
      const deck = cardsForRole(ALL_CARDS, role);
      expect(deck.length, role).toBeGreaterThanOrEqual(35);
      expect(deck.some((c) => c.roles === undefined), role).toBe(true);
    }
  });

  it('cardsForRole 只返回共享或包含该角色的卡', () => {
    for (const role of ROLE_IDS) {
      for (const card of cardsForRole(ALL_CARDS, role)) {
        expect(card.roles === undefined || card.roles.includes(role), card.id).toBe(true);
      }
    }
  });
});

describe('全库内容约束', () => {
  it('label ≤ 8 字，aftermath 非空且 ≤ 40 字，tags 合法且 ≤ 2 个', () => {
    for (const card of ALL_CARDS) {
      for (const ch of [card.left, card.right]) {
        expect(ch.label.length, `${card.id} label`).toBeGreaterThan(0);
        expect(ch.label.length, `${card.id} label`).toBeLessThanOrEqual(8);
        expect(ch.aftermath?.trim().length ?? 0, `${card.id} aftermath`).toBeGreaterThan(0);
        expect(ch.aftermath?.length ?? 0, `${card.id} aftermath`).toBeLessThanOrEqual(40);
        const tags = ch.tags ?? [];
        expect(tags.length, `${card.id} tags`).toBeLessThanOrEqual(2);
        for (const tag of tags) expect(STYLE_TAGS, `${card.id} tag`).toContain(tag);
      }
    }
  });

  it('effects 每项幅度 5–15，每个选项改 1–3 个数值', () => {
    for (const card of ALL_CARDS) {
      for (const ch of [card.left, card.right]) {
        const entries = Object.entries(ch.effects);
        expect(entries.length, card.id).toBeGreaterThanOrEqual(1);
        expect(entries.length, card.id).toBeLessThanOrEqual(3);
        for (const [key, value] of entries) {
          expect(STAT_KEYS).toContain(key);
          expect(Math.abs(value as number), `${card.id} ${key}`).toBeGreaterThanOrEqual(5);
          expect(Math.abs(value as number), `${card.id} ${key}`).toBeLessThanOrEqual(15);
        }
      }
    }
  });

  it('卡面（正文、label、aftermath）不含真实币种名或交易所名', () => {
    for (const card of ALL_CARDS) {
      const texts = [card.speaker, card.text, card.left.label, card.right.label,
        card.left.aftermath ?? '', card.right.aftermath ?? ''];
      for (const text of texts) {
        for (const bad of FORBIDDEN_WORDS) {
          expect(text.toLowerCase().includes(bad.toLowerCase()), `${card.id} 含有 "${bad}"`).toBe(false);
        }
      }
    }
  });

  it('奇遇卡：A 股 / 期货场景词的卡必须限定 roles，不让 Web3 玩家遇到', () => {
    for (const card of ALL_CARDS.filter((c) => c.adventure)) {
      const face = `${card.speaker}${card.text}${card.left.label}${card.right.label}`;
      if (/A 股|期货|盘中|收盘|盯盘|多单|做空/.test(face)) {
        expect(card.roles, card.id).toBeDefined();
        expect(card.roles, card.id).not.toContain('crypto');
      }
    }
  });

  it('炒股场景词只出现在限定了 roles 的卡里（共享卡正文保持中性）', () => {
    for (const card of ALL_CARDS.filter((c) => c.roles === undefined)) {
      const face = `${card.speaker}${card.text}${card.left.label}${card.right.label}`;
      expect(/股友|盯盘|收盘|A 股|龙虎榜|券商|基金经理/.test(face), card.id).toBe(false);
    }
  });
});

describe('数值与标签平衡', () => {
  it('全库每条属性净和 |sum| ≤ 6', () => {
    for (const key of STAT_KEYS) {
      expect(Math.abs(statSum(ALL_CARDS, key)), `全库 ${key}`).toBeLessThanOrEqual(6);
    }
  });

  it('每个角色可用牌库每条属性净和 |sum| ≤ 6', () => {
    for (const role of ROLE_IDS) {
      const deck = cardsForRole(ALL_CARDS, role);
      for (const key of STAT_KEYS) {
        expect(Math.abs(statSum(deck, key)), `${role} ${key}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it('每个角色可用牌库四条属性的触及次数相差不超过 1.5 倍', () => {
    for (const role of ROLE_IDS) {
      const deck = cardsForRole(ALL_CARDS, role);
      const touches = STAT_KEYS.map((k) => statTouches(deck, k));
      expect(Math.max(...touches) / Math.min(...touches), `${role} ${touches.join('/')}`).toBeLessThanOrEqual(1.5);
    }
  });

  it('9 种标签在每个角色的可用牌库里都出现', () => {
    for (const role of ROLE_IDS) {
      const seen = new Set<StyleTag>();
      for (const ch of choicesOf(cardsForRole(ALL_CARDS, role))) {
        for (const tag of ch.tags ?? []) seen.add(tag);
      }
      for (const tag of STYLE_TAGS) expect(seen.has(tag), `${role} 缺少 ${tag}`).toBe(true);
    }
  });

  it('全库 9 种标签各占总标签数的 8%–15%', () => {
    const counts = new Map<StyleTag, number>();
    let total = 0;
    for (const ch of choicesOf(ALL_CARDS)) {
      for (const tag of ch.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
        total += 1;
      }
    }
    for (const tag of STYLE_TAGS) {
      const share = (counts.get(tag) ?? 0) / total;
      expect(share, tag).toBeGreaterThanOrEqual(0.08);
      expect(share, tag).toBeLessThanOrEqual(0.15);
    }
  });

  it('每个角色可用牌库里每种标签占 6%–18%', () => {
    for (const role of ROLE_IDS) {
      const counts = new Map<StyleTag, number>();
      let total = 0;
      for (const ch of choicesOf(cardsForRole(ALL_CARDS, role))) {
        for (const tag of ch.tags ?? []) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
          total += 1;
        }
      }
      for (const tag of STYLE_TAGS) {
        const share = (counts.get(tag) ?? 0) / total;
        expect(share, `${role} ${tag}`).toBeGreaterThanOrEqual(0.06);
        expect(share, `${role} ${tag}`).toBeLessThanOrEqual(0.18);
      }
    }
  });
});
