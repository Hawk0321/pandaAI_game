/** 练习任务的纯计算部分（界面在 RecommendationPanel.tsx），便于单测。 */
import type { BotResult, GameEvent, LevelPlay, LevelReveal, Side } from '../shared/protocol';

export const STOP_OPTIONS = [null, 0.03, 0.05, 0.1] as const;

/** 玩家在某关的原始决定（来自事件）。 */
export function playerDecision(events: GameEvent[], levelId: string): { side: Side; size: number; stop: number | null; confidence: number } | null {
  const d = events.find((e) => e.type === 'decision' && e.level_id === levelId);
  if (!d) return null;
  const side = (d.data.side as Side) ?? 'flat';
  return { side, size: typeof d.data.size === 'number' ? d.data.size : 0, stop: typeof d.data.stop === 'number' ? d.data.stop : null,
    confidence: typeof d.data.confidence === 'number' ? d.data.confidence : 3 };
}

/** 在真实后续走势上回放一笔交易：触及止损价按止损价离场，否则持有到最后一根收盘。 */
export function replayStop(play: LevelPlay, reveal: LevelReveal, side: 'long' | 'short', size: number, stop: number | null) {
  const entry = play.bars.find((b) => b.t === 0)!.c;
  const sign = side === 'long' ? 1 : -1;
  const stopPrice = stop === null ? null : entry * (1 - sign * stop);
  let worst = 0;
  for (const bar of reveal.after_bars) {
    const adverse = side === 'long' ? bar.l : bar.h;
    worst = Math.min(worst, sign * (adverse / entry - 1));
    if (stopPrice !== null && (side === 'long' ? bar.l <= stopPrice : bar.h >= stopPrice)) {
      return { ret: size * sign * (stopPrice / entry - 1), exitT: bar.t, stopped: true, worst: size * worst };
    }
  }
  const last = reveal.after_bars[reveal.after_bars.length - 1];
  return { ret: size * sign * (last.c / entry - 1), exitT: last.t, stopped: false, worst: size * worst };
}

/** 关键线索复盘打分：选中的线索里有几张是关键线索。 */
export function scoreClues(picked: string[], keyIds: string[]) {
  const hits = picked.filter((id) => keyIds.includes(id));
  return { hits, total: keyIds.length };
}

/** 信心小测汇总：信心 1–5 → 50%–90%，和命中率比较（与画像的判断校准同一口径）。 */
export function quizSummary(answers: { confidence: number; right: boolean | null }[]) {
  const checked = answers.filter((a) => a.right !== null) as { confidence: number; right: boolean }[];
  if (checked.length === 0) return null;
  const avgP = checked.reduce((s, a) => s + 0.4 + a.confidence * 0.1, 0) / checked.length;
  const hit = checked.filter((a) => a.right).length / checked.length;
  const gap = avgP - hit;
  const verdict = gap > 0.15 ? '信心偏高：把握没有你以为的大' : gap < -0.25 ? '信心偏低：你其实比自己以为的更准' : '信心和命中率大致匹配';
  return { n: checked.length, avgP, hit, gap, verdict };
}

/** 风格对照：每个策略和玩家方向一致的关数。观望的关不计。 */
export function styleMatch(rows: { levelId: string; side: Side; bots: BotResult[] }[]) {
  const counted = rows.filter((r) => r.side !== 'flat');
  const ids: BotResult['id'][] = ['ma_cross', 'turtle', 'mean_revert'];
  const scores = ids.map((id) => ({
    id,
    name: counted[0]?.bots.find((b) => b.id === id)?.name ?? id,
    same: counted.filter((r) => r.bots.find((b) => b.id === id)?.side === r.side).length,
  })).sort((a, b) => b.same - a.same);
  return { counted: counted.length, scores, best: counted.length && scores[0].same > 0 ? scores[0] : null };
}
