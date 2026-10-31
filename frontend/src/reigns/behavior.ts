import type { BehaviorAnalysis, Card, GameState, PersonaId, Side } from './types';

const has = (card: Card, side: Side, ...ids: string[]) => ids.includes(card.id) || /dip|bottom|反弹|抄底/.test(card[side].label);
const review = (card: Card, side: Side) => /复盘|研究|样本外|诊断|留痕|核实|作业|规则/.test(`${card.id}${card[side].label}`);
const night = (card: Card, side: Side) => /night|凌晨|熬夜|roommate|mystery/.test(`${card.id}${card.text}${card[side].label}`);

/** Analyze only observable choices. No financial ability or outcome is inferred. */
export function analyzeBehavior(state: GameState, cards: readonly Card[]): BehaviorAnalysis {
  const byId = new Map(cards.map((card) => [card.id, card]));
  let longestStreak = 0, streak = 0, previous: Side | undefined;
  let chaseCount = 0, dipCount = 0, panicFollowCount = 0, riskActionCount = 0, cautionCount = 0;
  let reviewCount = 0, nightChaseCount = 0, lateFlipCount = 0, adventureCount = 0;
  const trajectory: Side[] = [];
  let earlyDominant: Side | undefined;
  for (const entry of state.log) {
    const card = byId.get(entry.cardId);
    if (!card) continue;
    const tags = card[entry.side].tags ?? [];
    const late = trajectory.length >= Math.floor(state.log.length * .65);
    streak = previous === entry.side ? streak + 1 : 1;
    previous = entry.side;
    longestStreak = Math.max(longestStreak, streak);
    if (tags.includes('trend')) chaseCount += 1;
    if (has(card, entry.side, 'buy-the-dip') || (tags.includes('contrarian') && !tags.includes('trend'))) dipCount += 1;
    if (/roommate|roommate-panic|group-call|mystery-forecast/.test(card.id) && tags.some((tag) => ['trend', 'impulsive', 'cautious'].includes(tag))) panicFollowCount += 1;
    if (tags.some((tag) => ['impulsive', 'concentrated', 'trend'].includes(tag))) riskActionCount += 1;
    if (tags.includes('cautious') || /止损|减仓|拒绝|平掉/.test(card[entry.side].label)) cautionCount += 1;
    if (review(card, entry.side) || (tags.includes('research') && /复盘|研究|学习|样本|留痕/.test(`${card.text}${card[entry.side].label}`))) reviewCount += 1;
    if (night(card, entry.side) && tags.some((tag) => ['trend', 'impulsive', 'concentrated'].includes(tag))) nightChaseCount += 1;
    if (late && earlyDominant && earlyDominant !== entry.side) lateFlipCount += 1;
    if (card.adventure) adventureCount += 1;
    trajectory.push(entry.side);
  }
  const early = trajectory.slice(0, Math.floor(state.log.length * .35));
  const earlyLeft = early.filter((side) => side === 'left').length;
  earlyDominant = early.length >= 3 && earlyLeft / early.length >= .65 ? 'left' : early.length >= 3 && earlyLeft / early.length <= .35 ? 'right' : undefined;
  const n = state.log.length;
  const evidence = [
    `共做 ${n} 次选择，最长连续同向 ${longestStreak} 次`,
    `顺势 ${chaseCount} 次，逆向 ${dipCount} 次，谨慎止损 ${cautionCount} 次`,
    `复盘研究 ${reviewCount} 次，后期改口 ${lateFlipCount} 次，经历奇遇 ${adventureCount} 次`,
  ];
  return {
    decisions: n, longestStreak, chaseCount, dipCount, panicFollowCount, riskActionCount,
    cautionCount, reviewCount, nightChaseCount, lateFlipCount, lateDecisionCount: Math.ceil(n * .35),
    adventureCount, endingPath: state.ending?.title ?? '未结束', evidence,
  };
}

/** Composite personas need repeated, distinguishable evidence; old personas remain tag-driven. */
export function behaviorPersona(b: BehaviorAnalysis): PersonaId | null {
  if (b.decisions < 6) return null;
  if (b.lateFlipCount >= 4 && b.lateFlipCount / b.lateDecisionCount >= .65) return 'panda';
  if (b.nightChaseCount >= 2) return 'bat';
  if (b.reviewCount >= 4 && b.cautionCount >= 2 && b.reviewCount >= b.riskActionCount) return 'squirrel';
  if (b.cautionCount >= 4 && b.cautionCount >= b.riskActionCount + 2 && b.dipCount < 2) return 'gecko';
  if (b.dipCount >= 4 && b.dipCount > b.chaseCount * 1.5) return 'raccoon';
  if (b.chaseCount >= 5 && (b.panicFollowCount >= 1 || b.chaseCount >= b.dipCount * 2)) return 'puffin';
  return null;
}
