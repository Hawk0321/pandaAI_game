import { describe, expect, it } from 'vitest';
import { CATALOG } from '../recommend/catalog';
import { ALL_CARDS } from './allCards';
import { ENCOUNTERS, buildEncounterReferral } from './referral';
import type { ChoiceLog } from './types';

const PANDAAI_IDS = ALL_CARDS.filter((c) => c.pandaai).map((c) => c.id);
const CATALOG_URLS = new Set(Object.values(CATALOG).map((r) => r.url));
const BANNED = ['买入', '卖出', '稳赚'];
const none = new Set<string>();
const at = (cardId: string, side: 'left' | 'right' = 'left'): ChoiceLog => ({ cardId, side });

describe('结局页第 4 张卡：本局遇到的 PandaAI 事件', () => {
  it('每张 pandaai 卡都有映射，映射里也没有多余的卡', () => {
    expect(PANDAAI_IDS.length).toBeGreaterThan(0);
    expect(Object.keys(ENCOUNTERS).sort()).toEqual([...PANDAAI_IDS].sort());
  });

  it('没遇到 PandaAI 事件时返回 null', () => {
    const plain = ALL_CARDS.filter((c) => !c.pandaai).slice(0, 5).map((c) => at(c.id));
    expect(buildEncounterReferral(plain, ALL_CARDS, none)).toBeNull();
    expect(buildEncounterReferral([], ALL_CARDS, none)).toBeNull();
  });

  it('每张 pandaai 卡都能生成合规的卡片：链接来自 CATALOG，理由引用关数、人物和所选选项', () => {
    for (const id of PANDAAI_IDS) {
      const card = ALL_CARDS.find((c) => c.id === id)!;
      for (const side of ['left', 'right'] as const) {
        const ref = buildEncounterReferral([at('more-wedding-gift'), at(id, side)], ALL_CARDS, none, 'stock');
        expect(ref, id).not.toBeNull();
        expect(ref!.type).toBe('encounter');
        expect(CATALOG_URLS.has(ref!.resource.url), id).toBe(true);
        expect(ref!.resource.url).toBe(CATALOG[ENCOUNTERS[id].res[0]].url);
        expect(ref!.reason).toContain('第 2 关');
        expect(ref!.reason).toContain(card.speaker);
        expect(ref!.reason).toContain(card[side].label);
        for (const word of BANNED) {
          expect(ref!.reason, id).not.toContain(word);
          expect(ref!.title, id).not.toContain(word);
        }
      }
    }
  });

  it('遇到多张时取最近的一张', () => {
    const ref = buildEncounterReferral([at('stock-quant-ma'), at('stock-quant-simnow')], ALL_CARDS, none);
    expect(ref!.resource).toBe(CATALOG.futuresContest);
    expect(ref!.reason).toContain('第 2 关');
  });

  it('主资源已被前三张卡占用时换备选；都被占用时用社区兜底', () => {
    const qubeUsed = new Set([CATALOG.qube.url]);
    expect(buildEncounterReferral([at('stock-quant-ma')], ALL_CARDS, qubeUsed)!.resource).toBe(CATALOG.maCross);
    const bothUsed = new Set([CATALOG.qube.url, CATALOG.maCross.url]);
    expect(buildEncounterReferral([at('stock-quant-ma')], ALL_CARDS, bothUsed)!.resource).toBe(CATALOG.community);
  });

  it('已结束的 LLM 对抗赛不给失效链接，改推 Qube 并说明已结束', () => {
    const ref = buildEncounterReferral([at('crypto-quant-llm-battle')], ALL_CARDS, none, 'crypto');
    expect(ref!.resource).toBe(CATALOG.qube);
    expect(ref!.reason).toContain('已经结束');
  });
});
