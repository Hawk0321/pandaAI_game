/**
 * D 模块入口：analyze（事件 + 关卡 → Profile）和 pickNextLevel（选补充关卡）。
 * 规则说明见 docs/profile.md。
 */
import type { AnalyzeInput, Dimension, DimensionId, LevelIndex, Profile } from '../shared/protocol';
import { extractEvidence } from './evidence';
import { CONF_RANK, judge, type Judged } from './judge';
import { computeFeatures } from './features';
import { pickPersona } from './persona';
import { recommend } from '../recommend/recommend';

export type { AnalyzeInput } from '../shared/protocol';

const CONF_TEXT: Record<Dimension['confidence'], string> = { low: '低', medium: '中', high: '高' };

function toDimension(j: Judged): Dimension {
  const { levelsWithSignal: _l, consistency: _c, ...dim } = j;
  return dim;
}

function describe(d: Pick<Dimension, 'judgement' | 'confidence' | 'conflict'>): string {
  return `${d.judgement}（置信度${CONF_TEXT[d.confidence]}${d.conflict ? '，证据有冲突' : ''}）`;
}

function buildSummary(dims: Judged[], personaWhy: string): string {
  const ability = dims.filter((d) => d.group === 'ability' && d.score !== null);
  const pref = dims.filter((d) => d.group === 'preference' && d.score !== null && d.confidence !== 'low' && !d.conflict);
  const parts: string[] = [];
  if (ability.length) {
    const best = [...ability].sort((a, b) => b.score! - a.score!)[0];
    const worst = [...ability].sort((a, b) => a.score! - b.score!)[0];
    if (worst.score! >= 0.65) parts.push(`能力上表现稳定，${best.name}最突出（${best.judgement}）。`);
    else if (best.score! <= 0.35) parts.push(`能力上几项都还有提升空间，最需要加强的是${worst.name}（${worst.judgement}）。`);
    else if (best === worst || best.score! - worst.score! < 0.15) parts.push(`能力上，${ability.map((d) => `${d.name}${d.judgement}`).join('；')}。`);
    else parts.push(`能力上，${best.name}相对最好（${best.judgement}），${worst.name}最需要加强（${worst.judgement}）。`);
  } else {
    parts.push('能力上暂时没有足够的行为可以评估。');
  }
  parts.push(pref.length
    ? `偏好上，${pref.map((d) => d.judgement.split('：')[0]).join('、')}；人物卡依据是"${personaWhy}"。`
    : `偏好还不稳定；人物卡依据是"${personaWhy}"。`);
  const unsure = dims.filter((d) => d.confidence === 'low' || d.conflict);
  if (unsure.length) parts.push(`${unsure.map((d) => d.name).join('、')}还看不准，结论仅供参考。`);
  return parts.join('');
}

export async function analyze(input: AnalyzeInput): Promise<Profile> {
  const raw = extractEvidence(input.events, input.levels);
  const judged = judge(raw);
  const features = computeFeatures(input.events, input.levels);
  const { persona, why } = pickPersona(features);
  const dimensions = judged.map(toDimension);

  const needs_more = judged
    .filter((d) => d.confidence === 'low' || d.conflict)
    .sort((a, b) => (a.group === b.group ? 0 : a.group === 'ability' ? -1 : 1))
    .map((d) => ({ dimension_id: d.id, reason: d.uncertain || '证据有冲突，需要再观察' }));

  const profile: Profile = {
    schema: 'profile/v1',
    session_id: input.session_id,
    is_sample: input.levels.some((l) => l.play.is_sample || l.reveal.is_sample),
    generated_at: new Date().toISOString(),
    method: 'rules',
    round: input.round,
    dimensions,
    persona,
    features: Object.fromEntries(Object.entries(features).filter(([, f]) => typeof f === 'object')) as Profile['features'],
    summary: buildSummary(judged, why),
    needs_more,
  };

  if (input.round === 2 && input.previous) {
    profile.changes = diffProfiles(input.previous, profile);
    if (profile.changes.length === 0) profile.summary += '补充关卡没有改变任何判断，原有结论得到维持。';
  }
  profile.recommendations = recommend(profile);
  return profile;
}

/** round 2：列出判断、置信度或冲突状态有变化的维度。 */
export function diffProfiles(before: Profile, after: Profile): NonNullable<Profile['changes']> {
  const prev = new Map(before.dimensions.map((d) => [d.id, d]));
  const out: NonNullable<Profile['changes']> = [];
  for (const d of after.dimensions) {
    const p = prev.get(d.id);
    if (!p) continue;
    if (p.judgement !== d.judgement || p.confidence !== d.confidence || p.conflict !== d.conflict) {
      out.push({ dimension_id: d.id, before: describe(p), after: describe(d) });
    }
  }
  return out;
}

/**
 * 选补充关卡：在置信度最低或有冲突的能力维度里，按置信度从低到高排序（同档时有冲突的优先），
 * 从 index.pool 找 probes 包含该维度且没玩过的关卡。能力维度都已看准、或第 2 轮之后，返回 null。
 */
export function pickNextLevel(profile: Profile, index: LevelIndex, playedIds: string[]): string | null {
  if (profile.round !== 1) return null;
  const played = new Set(playedIds);
  const targets = profile.dimensions
    .filter((d) => d.group === 'ability' && (d.conflict || d.confidence === 'low'))
    .map((d) => ({ id: d.id as DimensionId, rank: CONF_RANK[d.confidence] - (d.conflict ? 0.5 : 0) }))
    .sort((a, b) => a.rank - b.rank);
  for (const t of targets) {
    const hit = index.pool.find((p) => !played.has(p.id) && p.probes.includes(t.id));
    if (hit) return hit.id;
  }
  return null;
}
