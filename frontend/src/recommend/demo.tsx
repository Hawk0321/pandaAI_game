// 仅开发自测入口：用真实关卡 L01–L04 + 模拟玩家行为（?player=impulsive|cautious|watcher）生成画像并展示推荐。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { LevelPlay, LevelReveal } from '../shared/protocol';
import { analyze } from '../profile/index';
import { buildEvents, type LevelScript } from '../profile/testkit';
import { RecommendationPanel } from './RecommendationPanel';
import '../styles.css';

const who = new URLSearchParams(location.search).get('player') ?? 'impulsive';
const ids = ['L01', 'L02', 'L03', 'L04'];
const get = async <T,>(f: string) => (await fetch(`/levels/${f}`)).json() as Promise<T>;
const levels = await Promise.all(ids.map(async (id) => ({ play: await get<LevelPlay>(`${id}.play.json`), reveal: await get<LevelReveal>(`${id}.reveal.json`) })));
const scripts: LevelScript[] = levels.map(({ play, reveal }) => {
  const clue = (cid: string) => { const c = play.clues.find((x) => x.id === cid)!; return { id: c.id, kind: c.kind, signal: c.signal, cost: c.cost }; };
  const hold = (pos: number) => [1, 2, 3].map(() => ({ pnl_before: 0, action: 'hold' as const, position_after: pos }));
  if (who === 'watcher') return { id: play.id, clues: [clue('vol'), clue('ma'), clue('index')], side: 'flat', size: 0, confidence: 2, stop: null, think_ms: 30000, steps: hold(0) };
  if (who === 'cautious') {
    const side = reveal.outcome.direction === 'down' ? 'short' : 'long';
    return { id: play.id, clues: reveal.key_clue_ids.map(clue), side, size: 0.5, confidence: 4, stop: 0.05, think_ms: 40000, steps: hold(side === 'short' ? -0.5 : 0.5) };
  }
  return { id: play.id, clues: [clue('ma')], side: 'long', size: 1, confidence: 5, stop: null, think_ms: 5000,
    steps: [{ pnl_before: -0.03, action: 'add', position_after: 1 }, { pnl_before: -0.06, action: 'hold', position_after: 1 }, { pnl_before: -0.08, action: 'hold', position_after: 1 }] };
});
const events = buildEvents(`demo-${who}`, scripts);
const profile = await analyze({ session_id: `demo-${who}`, round: 1, events, levels });
Object.assign(window, { demoProfile: profile });
createRoot(document.getElementById('root')!).render(<StrictMode><main className="app-shell">
  <p className="notice">开发自测：真实关卡 + 模拟玩家（{who}），人物卡 {profile.persona.emoji} {profile.persona.name}</p>
  <RecommendationPanel profile={profile} />
</main></StrictMode>);
