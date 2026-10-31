import type { DimensionId, GameEvent, LevelPlay, LevelReveal, Profile } from '../shared/protocol';

export type SkillId = 'trend' | 'shield' | 'reversal' | 'review';
export interface CompletedLevel {
  play: LevelPlay;
  reveal: LevelReveal;
  result: { level_id: string; pnl: number; final_position: number };
}
export const CARDS = {
  trend: { name: '趋势追踪卡', icon: '↗', description: '调整快慢均线，用已玩行情试试趋势跟随。', repo: 'skill-ma-crossover-signal', commit: '5cdde5cbc8d010d04862d7392c1a27e173109147',
    adaptation: '独立实现的双均线游戏练习。用上一根收盘信号在下一根开盘调仓；支持游戏中的多空，不调用原 Skill 在线服务。' },
  shield: { name: '止损护盾卡', icon: '◇', description: '设置保护线，对比同一笔持仓的收益和回撤。', repo: 'skill-b11-auto-stop-loss-take-profit', commit: 'bb7ba0deee3d2a8be2ab1d027792fa981dc6e8ed',
    adaptation: '独立实现的止盈止损练习。逐根日线检查保护线，适用完整 15 日；未沿用原 Skill 的次日开盘、两日强平和 10% 仓位限制。' },
  reversal: { name: '反转确认卡', icon: '⤴', description: '比较直接入场和等待反转确认，体验等待的代价。', repo: 'skill-trendline-breakdown-reversal', commit: '0e33deadd53b2ad77127e3f05267d889dd152b50',
    adaptation: '独立实现的下降压力线与收复确认练习。触发后在后续窗口内确认，下一根开盘入场；不是原 Skill 的全市场选股因子。' },
  review: { name: '交易复盘卡', icon: '◎', description: '核对本局动作，选一个下次愿意尝试的改动。', repo: 'skill-trade-review', commit: '883fbf25668409d3cee19733f422ba3e0e1068b9',
    adaptation: '独立实现的游戏事件复盘，引用本局动作与行情；不运行原 Skill 的真实成交流水归因或大模型点评。' },
} satisfies Record<SkillId, { name: string; icon: string; description: string; repo: string; commit: string; adaptation: string }>;

export interface Recommendation {
  id: SkillId;
  reason: string;
  dimension: DimensionId;
  confidence: 'low' | 'medium' | 'high';
  evidence: { level_id: string; event_seqs: number[]; text: string }[];
}

/** Advice uses process dimensions, never ranks players by profit or persona name. */
export function recommendSkills(profile: Profile, events: GameEvent[]): Recommendation[] {
  const dim = (id: DimensionId) => profile.dimensions.find(d => d.id === id);
  const risk = dim('risk_control');
  const calibration = dim('calibration');
  const style = dim('style');
  const needs = (d: typeof risk) => !d || d.score === null || d.confidence === 'low' || d.conflict;
  const weak = (d: typeof risk) => !!d && d.score !== null && d.score < .55;
  const following = !!style && !needs(style) && style.score! >= .65;
  const contrarian = !!style && !needs(style) && style.score! <= .35;
  const ranks: { id: SkillId; score: number; dimension: DimensionId; reason: string }[] = [
    { id: 'shield', score: weak(risk) ? 110 : needs(risk) ? 75 : 40, dimension: 'risk_control', reason: needs(risk)
      ? '风险控制还看不准。先用同一段行情比较有无保护线，探索你愿意承担的波动。'
      : weak(risk) ? '本局风险管理还有可调整之处。用相同入场和仓位，看看保护线带来的变化。' : '已有风险管理证据，可以继续比较不同保护线的取舍。' },
    { id: 'review', score: needs(calibration) || weak(calibration) ? 100 : weak(dim('evidence_use')) ? 85 : 45, dimension: 'calibration', reason: needs(calibration)
      ? '判断校准的证据不足或有冲突。先复盘一次决定，暂不把它当成稳定能力结论。'
      : weak(calibration) ? '信心与方向结果还不够匹配。回到具体决定，核对当时的依据与把握。' : '把一次判断拆成依据、信心和动作，找一个下次可验证的改动。' },
    { id: 'trend', score: following ? 105 : 55, dimension: 'style', reason: following
      ? '你的方向选择较常顺着已有趋势。试试双均线，比较参数变化与追踪延迟。' : '用双均线探索趋势跟随；这是一项探索建议，不代表你已形成趋势偏好。' },
    { id: 'reversal', score: contrarian ? 105 : 50, dimension: 'style', reason: contrarian
      ? '你的方向选择较常逆着已有趋势。比较直接入场与等待反转确认。' : '比较抢先入场和等待确认；没有信号时，保持空仓也是练习结果。' },
  ];
  return ranks.sort((a, b) => b.score - a.score).map(({ id, dimension, reason }) => {
    const d = dim(dimension);
    return { id, dimension, reason, confidence: d?.confidence ?? 'low',
      evidence: (d?.evidence ?? []).flatMap(e => {
        const refs = e.event_seqs.filter(seq => events.some(event => event.seq === seq && event.level_id === e.level_id && event.session_id === profile.session_id));
        return refs.length ? [{ ...e, event_seqs: refs }] : [];
      }).slice(0, 2) };
  });
}

export function levelEvents(level: CompletedLevel, events: GameEvent[]): GameEvent[] {
  return events.filter(e => e.level_id === level.play.id).sort((a, b) => a.seq - b.seq);
}
