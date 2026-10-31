import { describe, expect, it } from 'vitest';
import { ADVENTURES } from './adventures';
import { ALL_CARDS } from './allCards';
import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, StyleTag } from './types';

// 没装 @types/node，用 vite 的 import.meta.glob 读 public/levels（与 profile/samples.test.ts 同做法）。
const revealFiles = import.meta.glob('../../public/levels/L*.reveal.json', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;
const LEVEL_IDS = Array.from({ length: 10 }, (_, i) => `L${String(i + 1).padStart(2, '0')}`);

interface RevealFile {
  symbol: string;
  name: string;
  start_date: string;
  decision_date: string;
  end_date: string;
  scenario: string;
  after_bars: { o: number; h: number; l: number; c: number }[];
}

function loadReveal(levelId: string): RevealFile {
  const entry = Object.entries(revealFiles).find(([path]) => path.endsWith(`/${levelId}.reveal.json`));
  if (!entry) throw new Error(`找不到 ${levelId}.reveal.json`);
  return JSON.parse(entry[1]) as RevealFile;
}

const reveals: Readonly<Record<string, RevealFile>> = Object.fromEntries(
  LEVEL_IDS.map((id) => [id, loadReveal(id)]),
);

/** 卡面文字：正文 + 两个选项的 label（aftermath 选完才显示，不算卡面）。 */
function faceTexts(card: Card): string[] {
  return [card.text, card.left.label, card.right.label];
}

/** 从 reveal 里取出所有不该出现在卡面上的字符串。 */
function forbiddenStrings(reveal: RevealFile): string[] {
  const code = reveal.symbol.split('.')[0] ?? reveal.symbol;
  const dates = [reveal.start_date, reveal.decision_date, reveal.end_date];
  const compactDates = dates.map((d) => d.replace(/-/g, ''));
  const prices = reveal.after_bars.flatMap((b) =>
    [b.o, b.h, b.l, b.c].flatMap((p) => [p.toFixed(2), p.toFixed(1)]),
  );
  return [reveal.symbol, code, reveal.name, ...dates, ...compactDates, ...prices];
}

describe('奇遇卡内容', () => {
  it('共 20 张，id 唯一且以 adv- 开头', () => {
    expect(ADVENTURES).toHaveLength(20);
    const ids = ADVENTURES.map((c) => c.id);
    expect(new Set(ids).size).toBe(20);
    for (const id of ids) expect(id.startsWith('adv-')).toBe(true);
  });

  it('每关 2 张，id 形如 adv-Lxx-a/b，scenario 与 reveal 一致', () => {
    for (const levelId of LEVEL_IDS) {
      const cards = ADVENTURES.filter((c) => c.adventure?.levelId === levelId);
      expect(cards.map((c) => c.id).sort()).toEqual([`adv-${levelId}-a`, `adv-${levelId}-b`]);
      for (const card of cards) {
        expect(card.adventure?.scenario).toBe(reveals[levelId]?.scenario);
      }
    }
    for (const card of ADVENTURES) {
      expect(card.is_sample).toBe(true);
      expect(card.adventure).toBeDefined();
    }
  });

  it('选项都有 aftermath，长度合规，label ≤ 8 字', () => {
    for (const card of ADVENTURES) {
      for (const choice of [card.left, card.right]) {
        expect(choice.label.length, `${card.id} label`).toBeGreaterThan(0);
        expect(choice.label.length, `${card.id} label`).toBeLessThanOrEqual(8);
        expect(choice.aftermath, `${card.id} aftermath`).toBeTruthy();
        expect(choice.aftermath?.length ?? 0, `${card.id} aftermath`).toBeLessThanOrEqual(40);
      }
    }
  });

  it('effects 每项 5–18，每个选项改 1–3 个数值', () => {
    for (const card of ADVENTURES) {
      for (const choice of [card.left, card.right]) {
        const entries = Object.entries(choice.effects);
        expect(entries.length, card.id).toBeGreaterThanOrEqual(1);
        expect(entries.length, card.id).toBeLessThanOrEqual(3);
        for (const [key, value] of entries) {
          expect(STAT_KEYS).toContain(key);
          expect(Math.abs(value as number), `${card.id} ${key}`).toBeGreaterThanOrEqual(5);
          expect(Math.abs(value as number), `${card.id} ${key}`).toBeLessThanOrEqual(18);
        }
      }
    }
  });

  it('9 种风格标签都出现，每个选项最多 2 个标签', () => {
    const counts = new Map<StyleTag, number>();
    for (const card of ADVENTURES) {
      for (const choice of [card.left, card.right]) {
        const tags = choice.tags ?? [];
        expect(tags.length, card.id).toBeLessThanOrEqual(2);
        for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    for (const tag of STYLE_TAGS) {
      expect(counts.get(tag) ?? 0, tag).toBeGreaterThanOrEqual(2);
    }
  });

  it('同一张卡的两个选项标签不完全相同', () => {
    for (const card of ADVENTURES) {
      const l = [...(card.left.tags ?? [])].sort().join(',');
      const r = [...(card.right.tags ?? [])].sort().join(',');
      expect(l, card.id).not.toBe(r);
    }
  });
});

describe('信息隔离', () => {
  it('卡面文字不含 reveal 里的代码、名称、日期和后续价格', () => {
    for (const card of ADVENTURES) {
      const levelId = card.adventure?.levelId ?? '';
      const reveal = reveals[levelId];
      expect(reveal, `${card.id} 对应的 reveal`).toBeDefined();
      if (!reveal) continue;
      const forbidden = forbiddenStrings(reveal);
      for (const face of faceTexts(card)) {
        for (const bad of forbidden) {
          expect(face.includes(bad), `${card.id} 含有 "${bad}"`).toBe(false);
        }
      }
    }
  });

  it('任何卡面文字都不含其他关卡的代码、名称、日期', () => {
    const all = LEVEL_IDS.flatMap((id) => {
      const r = reveals[id];
      return r ? [r.symbol, r.name, r.start_date, r.decision_date, r.end_date] : [];
    });
    for (const card of ADVENTURES) {
      for (const text of [...faceTexts(card), card.left.aftermath ?? '', card.right.aftermath ?? '']) {
        for (const bad of all) expect(text.includes(bad), `${card.id} 含有 "${bad}"`).toBe(false);
      }
    }
  });
});

describe('ALL_CARDS', () => {
  it('id 全库唯一，且包含全部奇遇卡', () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const adv of ADVENTURES) expect(ids).toContain(adv.id);
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(ADVENTURES.length);
  });
});
