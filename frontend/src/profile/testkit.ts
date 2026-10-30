/** 仅供单元测试：用简短描述拼出符合协议的事件序列。 */
import type { EventType, GameEvent, Side } from '../shared/protocol';

export interface LevelScript {
  id: string;
  supplementary?: boolean;
  budget?: number;
  clues: { id: string; kind: string; signal: string; cost: number }[];  // 依次翻开
  side: Side;
  size: 0 | 0.2 | 0.5 | 1;
  confidence: number;
  stop: null | 0.05 | 0.1;
  think_ms: number;
  steps: { pnl_before: number; action: 'hold' | 'add' | 'reduce' | 'close'; position_after: number }[];
  stop_at?: { step: number; pnl: number };
}

export function buildEvents(sessionId: string, levels: LevelScript[]): GameEvent[] {
  const events: GameEvent[] = [];
  let seq = 0;
  const push = (level_id: string | null, t_ms: number, type: EventType, data: Record<string, unknown>) => {
    seq += 1;
    events.push({ seq, session_id: sessionId, level_id, t_ms, at: new Date(Date.UTC(2026, 9, 31, 10, 0, seq)).toISOString(), type, data });
  };
  push(null, 0, 'session_start', { device: 'mobile' });
  for (const lv of levels) {
    const budget = lv.budget ?? 3;
    push(lv.id, 0, 'level_start', { budget, is_supplementary: !!lv.supplementary });
    let left = budget;
    lv.clues.forEach((c, i) => {
      left -= c.cost;
      push(lv.id, Math.round(((i + 1) * lv.think_ms) / (lv.clues.length + 1)), 'clue_open',
        { clue_id: c.id, kind: c.kind, signal: c.signal, cost: c.cost, budget_left: left });
    });
    push(lv.id, lv.think_ms, 'decision', { side: lv.side, size: lv.size, confidence: lv.confidence, stop: lv.stop,
      clues_opened: lv.clues.map((c) => c.id), think_ms: lv.think_ms });
    let pnl = 0;
    let pos = lv.side === 'long' ? lv.size : lv.side === 'short' ? -lv.size : 0;
    lv.steps.forEach((s, i) => {
      if (lv.stop_at && lv.stop_at.step === i + 1) {
        push(lv.id, lv.think_ms + (i + 1) * 2000, 'stop_triggered', { step: i + 1, pnl: lv.stop_at.pnl });
      }
      push(lv.id, lv.think_ms + (i + 1) * 2000 + 500, 'hold_step', { step: i + 1, ...s });
      pnl = s.pnl_before;
      pos = s.position_after;
    });
    push(lv.id, lv.think_ms + 8000, 'level_end', { pnl, final_position: pos });
    push(lv.id, lv.think_ms + 9000, 'reveal_view', { dwell_ms: 6000 });
  }
  return events;
}
