/**
 * 人物卡：由维度组合映射出趣味名字，只是画像的趣味表达（is_fun_label: true），不代替维度判断。
 * 规则按顺序匹配，第一条命中即用。
 */
import type { DimensionId, Profile } from '../shared/protocol';
import type { Judged } from './judge';

type Persona = Profile['persona'];
type Scores = Partial<Record<DimensionId, number | null>>;

interface Rule { when: (s: Scores) => boolean; persona: Omit<Persona, 'is_fun_label'>; why: string }

const has = (v: number | null | undefined): v is number => typeof v === 'number';
const hi = (v: number | null | undefined) => has(v) && v >= 0.65;
const lo = (v: number | null | undefined) => has(v) && v <= 0.35;

export const PERSONAS: Rule[] = [
  { when: (s) => has(s.risk_appetite) && s.risk_appetite <= 0.2,
    persona: { name: '树懒观察员', emoji: '🦥', tagline: '看得多、动得少，按兵不动也是一种选择' },
    why: '大多数关卡观望或极轻仓' },
  { when: (s) => hi(s.risk_appetite) && lo(s.research_depth),
    persona: { name: '冲锋蛮牛', emoji: '🐂', tagline: '看到机会就冲，先上车再说' },
    why: '仓位重、研究少、决定快' },
  { when: (s) => hi(s.research_depth) && hi(s.evidence_use) && !lo(s.risk_control),
    persona: { name: '夜猫研究员', emoji: '🦉', tagline: '线索翻遍才出手，证据说话' },
    why: '研究点用足、紧跟关键线索' },
  { when: (s) => hi(s.risk_appetite) && hi(s.research_depth),
    persona: { name: '深海猎鲨', emoji: '🦈', tagline: '研究透了就下重注' },
    why: '先研究、再重仓' },
  { when: (s) => lo(s.risk_appetite) && !lo(s.research_depth),
    persona: { name: '稳健老龟', emoji: '🐢', tagline: '慢一点没关系，先保住本金' },
    why: '轻仓为主、愿意研究' },
  { when: (s) => lo(s.style),
    persona: { name: '逆行螃蟹', emoji: '🦀', tagline: '别人追涨我抄底，偏爱反着走' },
    why: '多次逆着之前的趋势下单' },
  { when: (s) => hi(s.style),
    persona: { name: '冲浪海豚', emoji: '🐬', tagline: '顺着浪头走，趋势就是朋友' },
    why: '多次顺着之前的趋势下单' },
];

const DEFAULT: Rule = {
  when: () => true,
  persona: { name: '灵活狐狸', emoji: '🦊', tagline: '没有固定套路，看情况出牌' },
  why: '各项倾向都不极端',
};

export function pickPersona(dims: Judged[]): { persona: Persona; why: string } {
  const s: Scores = Object.fromEntries(dims.map((d) => [d.id, d.score]));
  const rule = PERSONAS.find((r) => r.when(s)) ?? DEFAULT;
  return { persona: { ...rule.persona, is_fun_label: true }, why: rule.why };
}
