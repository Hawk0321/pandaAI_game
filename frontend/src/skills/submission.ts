import type { GameEvent, Profile } from '../shared/protocol';
import { CARDS, recommendSkills } from './model';
import type { SkillId } from './model';

/**
 * 赛题第 2 节要求的结构化导出：dimensions + recommendations。
 * 与界面上的画像同源，不额外推断；导出只是换一种排布，方便评委或其他系统读取。
 */
export interface SubmissionDimension {
  id: string;
  group: 'ability' | 'preference';
  name: string;
  judgement: string;
  evidence: string[];
  confidence: Profile['dimensions'][number]['confidence'];
  uncertain: string;
  score: number | null;
  conflict: boolean;
}

export interface SubmissionRecommendation {
  /** skill-card：游戏内练习（A）；referral：去 PandaAI / QuantSkills 的引流卡片（D） */
  type: 'skill-card' | 'referral';
  id: SkillId | string;
  resource: string;
  description: string;
  is_sample: boolean;
  reason: string;
  dimension: string;
  confidence: Profile['dimensions'][number]['confidence'];
  evidence: string[];
  next_step: string;
  /** 仅 referral：指向的真实资源和类别，其余字段含义与 skill-card 相同 */
  provider?: 'PandaAI' | 'QuantSkills';
  url?: string;
  category?: 'strategy' | 'tool' | 'product' | 'event' | 'learn';
}

export interface Submission {
  schema: 'submission/v1';
  session_id: string;
  generated_at: string;
  round: 1 | 2;
  is_sample: boolean;
  method: string;
  persona: Profile['persona'];
  summary: string;
  needs_more: Profile['needs_more'];
  dimensions: SubmissionDimension[];
  recommendations: SubmissionRecommendation[];
  disclaimer: string;
}

export function buildSubmission(profile: Profile, events: GameEvent[]): Submission {
  const own = events.filter((event) => event.session_id === profile.session_id);
  return {
    schema: 'submission/v1',
    session_id: profile.session_id,
    generated_at: profile.generated_at,
    round: profile.round,
    is_sample: profile.is_sample,
    method: profile.method,
    persona: profile.persona,
    summary: profile.summary,
    needs_more: profile.needs_more,
    dimensions: profile.dimensions.map((dimension) => ({
      id: dimension.id,
      group: dimension.group,
      name: dimension.name,
      judgement: dimension.judgement,
      // 证据带上 +/−/? 和关卡，评委不必回看界面就能判断这条结论的依据。
      evidence: dimension.evidence.map((item) => `${item.level_id} · ${item.direction} · ${item.text}`),
      confidence: dimension.confidence,
      uncertain: dimension.uncertain,
      score: dimension.score,
      conflict: dimension.conflict,
    })),
    recommendations: [...recommendSkills(profile, own).map((recommendation): SubmissionRecommendation => ({
      type: 'skill-card' as const,
      id: recommendation.id,
      resource: CARDS[recommendation.id].name,
      description: CARDS[recommendation.id].description,
      // 资源是游戏内独立实现的练习，不是真实外部课程，导出时如实标注。
      is_sample: true,
      reason: recommendation.reason,
      dimension: recommendation.dimension,
      confidence: recommendation.confidence,
      evidence: recommendation.evidence.map((item) => `${item.level_id} · ${item.text}`),
      next_step: `在画像页展开「${CARDS[recommendation.id].name}」，用已揭晓的本局行情做一次比较练习`,
    })),
    // D 的引流卡片：依据哪项维度判断、引用哪条证据都原样带出；链接是真实资源，is_sample 沿用资源本身的标注。
    ...(profile.recommendations ?? []).map((recommendation): SubmissionRecommendation => {
      const basis = recommendation.based_on[0];
      const dimension = profile.dimensions.find((item) => item.id === basis?.dimension_id);
      return {
        type: 'referral',
        id: recommendation.id,
        resource: recommendation.resource.name,
        description: recommendation.resource.desc,
        is_sample: recommendation.resource.is_sample,
        reason: recommendation.reason,
        dimension: basis?.dimension_id ?? '',
        confidence: dimension?.confidence ?? 'low',
        evidence: recommendation.based_on.flatMap((item) => item.evidence),
        next_step: `${recommendation.next_step.label}：${recommendation.next_step.url}`,
        provider: recommendation.resource.provider,
        url: recommendation.resource.url,
        category: recommendation.type,
      };
    })],
    disclaimer: '规则计算的游戏观察，不是投资建议，也不能证明真实交易能力。',
  };
}
