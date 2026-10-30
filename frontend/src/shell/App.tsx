import { useState } from 'react';
import { PlayLevel } from '../play';
import { analyze } from '../profile';
import type { LevelPlay, LevelReveal, Profile } from '../shared/protocol';

export function App() {
  const [level, setLevel] = useState<LevelPlay | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  async function start() {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}levels/L01.play.json`);
      if (!response.ok) throw new Error(`关卡请求失败：${response.status}`);
      setLevel(await response.json() as LevelPlay);
    } catch (cause) { setError(String(cause)); }
    finally { setLoading(false); }
  }

  async function loadReveal(): Promise<LevelReveal> {
    const response = await fetch(`${import.meta.env.BASE_URL}levels/L01.reveal.json`);
    if (!response.ok) throw new Error(`揭晓请求失败：${response.status}`);
    return response.json() as Promise<LevelReveal>;
  }

  return <main className="app-shell">
    <header className="brand">PANDAAI <span>交易观察室</span></header>
    <span className="sample-label">示例数据</span>
    <section className="intro">
      <p className="eyebrow">寻找你的交易人格</p>
      <h1>每一次选择，<br />都藏着你的交易习惯。</h1>
      <p>看一段匿名行情，做一次判断。从行为证据认识自己。</p>
    </section>
    {error && <p role="alert">{error}</p>}
    {!level && !profile && <section className="panel">
      <h2>前端骨架已就绪</h2>
      <p>当前用一关模拟行情验证模块对接。玩法与画像使用占位实现。</p>
      <button disabled={loading} onClick={() => void start()}>{loading ? '正在加载' : '体验占位流程'}</button>
    </section>}
    {level && !profile && <PlayLevel level={level} isSupplementary={false}
      loadReveal={loadReveal} emit={(type, data) => console.info(type, data)}
      onDone={() => { void analyze({ session_id: sessionId, round: 1, events: [], levels: [] }).then(setProfile).catch(cause => setError(String(cause))); }} />}
    {profile && <section className="panel"><h2>{profile.persona.name}</h2><p>{profile.summary}</p>
      <p>画像为协议提供的固定示例，尚未根据本次行为计算。</p>
    </section>}
    <footer>模拟交易仅用于游戏体验。虚拟收益和趣味人格不能证明真实交易能力。</footer>
  </main>;
}
