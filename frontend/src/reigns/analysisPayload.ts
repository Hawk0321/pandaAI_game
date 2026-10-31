/**
 * 结局页“AI 复盘”接入用的数据契约（给后续接 DeepSeek 用，说明见 docs/deepseek-analysis.md）。
 *
 * - buildAnalysisPayload：把一局结束后的状态整理成发给后端的 JSON。纯函数，不含任何密钥、不发请求。
 * - parseAnalysis：校验后端（DeepSeek）返回的 JSON，不合格就返回 null，界面退回现有的规则推荐。
 *
 * 前端不直接调用 DeepSeek：API Key 只放在后端环境变量 DEEPSEEK_API_KEY 里。
 */
import { PERSONA_CARDS } from '../profile/persona';
import { CATALOG, type CatalogId } from '../recommend/catalog';
import { resolvePersona } from './engine';
import { ROLES } from './roles';
import { overtimeTurns, survivalTier } from './survival';
import { STAT_KEYS, STYLE_TAGS } from './types';
import type { Card, GameState, StatKey, StyleTag } from './types';

export const ANALYSIS_PAYLOAD_VERSION = 1;

/** 单局最多带多少条选择记录（取最近的），避免超长对局把请求撑大。 */
export const MAX_CHOICES = 80;

export interface AnalysisChoice {
  readonly turn: number;
  readonly cardId: string;
  readonly speaker: string;
  readonly text: string;
  readonly picked: string;
  readonly other: string;
  readonly tags: readonly StyleTag[];
  readonly effects: Readonly<Partial<Record<StatKey, number>>>;
  /** 这张卡点名了 PandaAI 产品或活动。 */
  readonly pandaai: boolean;
  /** 奇遇卡（由历史行情关卡改写）。 */
  readonly adventure: boolean;
}

export interface AnalysisPayload {
  readonly version: typeof ANALYSIS_PAYLOAD_VERSION;
  readonly role: { readonly id: GameState['role']; readonly name: string };
  readonly survival: { readonly turns: number; readonly overtime: number; readonly tier: string };
  readonly ending: { readonly id: string; readonly title: string; readonly kind: string; readonly description: string };
  /** 四项数值，键是引擎槽位，label 是该角色的叫法。 */
  readonly stats: Readonly<Record<StatKey, { readonly label: string; readonly value: number }>>;
  readonly persona: { readonly id: string; readonly name: string; readonly archetype: string };
  readonly tally: Readonly<Record<StyleTag, number>>;
  readonly choices: readonly AnalysisChoice[];
  /** 本局总选择数（choices 可能被截断）。 */
  readonly totalChoices: number;
  /** 允许 AI 推荐的资源 id 白名单，模型只能从这里挑，不能自己编链接。 */
  readonly allowedResources: readonly { readonly id: CatalogId; readonly name: string; readonly provider: string; readonly desc: string }[];
  /** 游戏内容都是示例，提醒后端和模型不要当成真实交易记录。 */
  readonly is_sample: true;
}

/** 一局结束后（state.ending 非空）调用；未结束时抛错。 */
export function buildAnalysisPayload(state: GameState, cards: readonly Card[]): AnalysisPayload {
  if (!state.ending) throw new Error('buildAnalysisPayload: 对局还没结束');
  const role = ROLES[state.role];
  const byId = new Map(cards.map((card) => [card.id, card] as const));
  const persona = PERSONA_CARDS[resolvePersona(state, cards).id];
  const start = Math.max(0, state.log.length - MAX_CHOICES);

  const choices: AnalysisChoice[] = [];
  state.log.slice(start).forEach((entry, i) => {
    const card = byId.get(entry.cardId);
    if (!card) return;
    const picked = card[entry.side];
    const other = card[entry.side === 'left' ? 'right' : 'left'];
    choices.push({
      turn: start + i + 1,
      cardId: card.id,
      speaker: card.speaker,
      text: card.text,
      picked: picked.label,
      other: other.label,
      tags: picked.tags ?? [],
      effects: picked.effects,
      pandaai: card.pandaai === true,
      adventure: card.adventure !== undefined,
    });
  });

  return {
    version: ANALYSIS_PAYLOAD_VERSION,
    role: { id: state.role, name: role.name },
    survival: { turns: state.turn, overtime: overtimeTurns(state.turn), tier: survivalTier(state.turn).name },
    ending: { id: state.ending.id, title: state.ending.title, kind: state.ending.kind, description: state.ending.description },
    stats: Object.fromEntries(STAT_KEYS.map((key) => [key, { label: role.stats[key].label, value: state.stats[key] }])) as AnalysisPayload['stats'],
    persona: { id: persona.id, name: persona.name, archetype: persona.archetype },
    tally: Object.fromEntries(STYLE_TAGS.map((tag) => [tag, state.tally[tag]])) as AnalysisPayload['tally'],
    choices,
    totalChoices: state.log.length,
    allowedResources: (Object.keys(CATALOG) as CatalogId[]).map((id) => ({
      id, name: CATALOG[id].name, provider: CATALOG[id].provider, desc: CATALOG[id].desc,
    })),
    is_sample: true,
  };
}

/** 后端返回给前端的复盘结果。 */
export interface AnalysisResult {
  /** 一段总结，≤ 120 字。 */
  readonly summary: string;
  /** 这局做得好的地方，1–3 条，每条引用具体关数。 */
  readonly strengths: readonly string[];
  /** 这局的盲点，1–3 条，每条引用具体关数。 */
  readonly blindSpots: readonly string[];
  /** 下一局可以试的一件事。 */
  readonly nextStep: string;
  /** 推荐的资源，只能是 allowedResources 里的 id，最多 2 个。 */
  readonly resourceIds: readonly CatalogId[];
}

const LIMITS = { summary: 120, item: 80, nextStep: 80, list: 3, resources: 2 } as const;
/** 和 referral 文案同一套禁词：不给买卖建议、不承诺收益。 */
const BANNED = /买入|卖出|稳赚|必涨|保本|荐股/;

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !BANNED.test(v);
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.length >= 1 && v.length <= LIMITS.list && v.every((x) => isText(x, LIMITS.item));

/** 校验模型输出。字段缺失、超长、含禁词或推荐了白名单外的资源，一律返回 null。 */
export function parseAnalysis(raw: unknown): AnalysisResult | null {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (!isText(o.summary, LIMITS.summary) || !isTextList(o.strengths) || !isTextList(o.blindSpots) || !isText(o.nextStep, LIMITS.nextStep)) return null;
  const ids = Array.isArray(o.resourceIds) ? o.resourceIds : [];
  if (ids.length > LIMITS.resources || !ids.every((id) => typeof id === 'string' && id in CATALOG)) return null;
  return {
    summary: o.summary.trim(),
    strengths: o.strengths.map((s) => s.trim()),
    blindSpots: o.blindSpots.map((s) => s.trim()),
    nextStep: o.nextStep.trim(),
    resourceIds: ids as CatalogId[],
  };
}
