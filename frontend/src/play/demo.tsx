// 仅开发自测入口：显式使用仓库的模拟示例；揭晓在 decision 后动态加载。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import play from '../../../data/samples/levels/L01.play.json';
import type { LevelPlay, LevelReveal, EventType } from '../shared/protocol';
import { PlayLevel } from './index';
import '../styles.css';
import '../ui.css';
import '../theme.css';
const events: { type: EventType; data: Record<string, unknown> }[] = [];
Object.assign(window, { playEvents: events, revealCalls: 0, playDone: null });
createRoot(document.getElementById('root')!).render(<StrictMode><main className="app-shell"><PlayLevel
  level={play as LevelPlay} isSupplementary={new URLSearchParams(location.search).has('supplementary')}
  emit={(type, data) => { events.push({ type, data }); console.log(type, data); }}
  loadReveal={async () => {
    if (!events.some(event => event.type === 'decision')) throw new Error('禁止提前加载揭晓');
    Object.assign(window, { revealCalls: 1 });
    const { default: reveal } = await import('../../../data/samples/levels/L01.reveal.json');
    return reveal as LevelReveal;
  }}
  onDone={result => { Object.assign(window, { playDone: result }); console.log('onDone', result); }}
/></main></StrictMode>);
