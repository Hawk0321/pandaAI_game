import { useEffect, useRef, useState } from 'react';
import { PlayLevel } from '../play';
import { analyze, pickNextLevel } from '../profile';
import type { EventType, GameEvent, LevelIndex, LevelPlay, LevelReveal, Profile } from '../shared/protocol';
import { createEventLog, createLevelLoader, hasDecisionForActiveLevel } from './runtime';
import { isFixedSampleProfile } from './profileView';
import { RevealPage } from './RevealPage';
import { ProfilePage } from './ProfilePage';
import { HomeVisual, PandaMark } from './GameVisuals';

const STORAGE_KEY = 'pandaai:c-shell:v1';
type Screen = 'home' | 'instructions' | 'play' | 'reveal' | 'profile' | 'finished';
type Result = { level_id: string; pnl: number; final_position: number };
type CompletedLevel = { play: LevelPlay; reveal: LevelReveal; result: Result };
interface SavedGame {
  schema: 'c-shell/v1';
  sessionId: string;
  screen: Screen;
  events: GameEvent[];
  index: LevelIndex | null;
  mainCursor: number;
  supplementary: boolean;
  play: LevelPlay | null;
  reveal: LevelReveal | null;
  completed: CompletedLevel[];
  profile: Profile | null;
  revealEnteredAt: number | null;
}

function freshGame(): SavedGame {
  // randomUUID requires HTTPS; getRandomValues also works on a LAN HTTP preview.
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-')}`;
  return { schema: 'c-shell/v1', sessionId, screen: 'home', events: [], index: null,
    mainCursor: 0, supplementary: false, play: null, reveal: null,
    completed: [], profile: null, revealEnteredAt: null };
}

function restoreGame(): { game: SavedGame; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { game: freshGame(), warning: '' };
    const saved = JSON.parse(raw) as SavedGame;
    const screens: Screen[] = ['home', 'instructions', 'play', 'reveal', 'profile', 'finished'];
    if (saved.schema !== 'c-shell/v1' || !saved.sessionId || !screens.includes(saved.screen)
      || !Array.isArray(saved.events) || !Array.isArray(saved.completed)
      || saved.events.some(event => event.session_id !== saved.sessionId || !Number.isInteger(event.seq) || !Number.isFinite(Date.parse(event.at)))
      || ((saved.screen === 'play' || saved.screen === 'reveal') && !saved.play)
      || (saved.screen === 'reveal' && (!saved.reveal || !saved.completed.length))
      || ((saved.screen === 'profile' || saved.screen === 'finished') && !saved.profile)) {
      localStorage.setItem(`${STORAGE_KEY}:unrecognized`, raw);
      return { game: freshGame(), warning: '本机存档格式无法识别，已另存原始内容并开启新局，请联系负责人。' };
    }
    return { game: { ...saved, index: saved.screen === 'home' || saved.screen === 'instructions' ? null : saved.index,
      revealEnteredAt: saved.screen === 'reveal' ? Date.now() : null }, warning: '' };
  } catch {
    return { game: freshGame(), warning: '浏览器无法读取本机存档。当前仍可体验，刷新可能无法恢复，请勿在中途刷新。' };
  }
}

export function App() {
  const [initial] = useState(restoreGame);
  const [game, setGame] = useState(initial.game);
  const current = useRef(game);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [recoveryNeeded, setRecoveryNeeded] = useState(initial.game.screen === 'play');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [loader, setLoader] = useState(() => createLevelLoader(import.meta.env.BASE_URL));
  const previousInMemory = useRef<SavedGame | null>(null);

  function commit(patch: Partial<SavedGame>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setGame(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { setStorageWarning('本机存储不可用：行为仍保存在内存，刷新会丢失本次进度。'); }
  }

  // 用惰性初始化而不是在渲染里写 ref：StrictMode 会重复渲染，渲染期赋值会多造一个日志容器。
  const [log, setLog] = useState(() => createEventLog(game.sessionId, game.events, events => commit({ events: [...events] })));

  function emit(type: EventType, data: Record<string, unknown>, levelId: string | null = null) {
    return log.emit(type, data, levelId);
  }

  useEffect(() => {
    if (current.current.index) return;
    let active = true;
    void loader.loadIndex().then(index => { if (active) commit({ index }); })
      .catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [loader]);

  useEffect(() => {
    const saveDwell = () => recordRevealDwell();
    window.addEventListener('pagehide', saveDwell);
    return () => window.removeEventListener('pagehide', saveDwell);
  }, []);

  function recordRevealDwell() {
    const snapshot = current.current;
    if (snapshot.screen !== 'reveal' || snapshot.revealEnteredAt === null || !snapshot.play) return;
    emit('reveal_view', { dwell_ms: Math.max(0, Date.now() - snapshot.revealEnteredAt) }, snapshot.play.id);
    commit({ revealEnteredAt: Date.now() });
  }

  async function run(action: () => Promise<void>) {
    if (working.current || error) return;
    working.current = true;
    setBusy(true);
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { working.current = false; setBusy(false); }
  }

  async function startLevel(id: string, supplementary: boolean, mainCursor: number) {
    const play = await loader.loadPlay(id);
    commit({ play, reveal: null, supplementary, mainCursor, screen: 'play', revealEnteredAt: null });
  }

  async function beginSession() {
    const index = current.current.index ?? await loader.loadIndex();
    if (!current.current.index) commit({ index });
    if (!index?.main.length) throw new Error('关卡索引没有可玩的正式关卡，请联系关卡负责人。');
    if (!log.events.some(event => event.type === 'session_start')) {
      emit('session_start', { device: matchMedia('(pointer: coarse)').matches || innerWidth <= 600 ? 'mobile' : 'desktop' });
    }
    await startLevel(index.main[0], false, 0);
  }

  async function loadActiveReveal() {
    const play = current.current.play;
    if (!play) throw new Error('当前没有对局，不能请求揭晓数据。');
    const reveal = await loader.loadReveal(play.id, () => hasDecisionForActiveLevel(log.events, play.id));
    commit({ reveal });
    return reveal;
  }

  function onLevelDone(result: Result) {
    const snapshot = current.current;
    if (!snapshot.play || !snapshot.reveal || snapshot.play.id !== result.level_id || !Number.isFinite(result.pnl) || !Number.isFinite(result.final_position)) {
      setError('对局结果与已提交后加载的揭晓数据不一致，流程已停止。请联系负责人。');
      return;
    }
    const completed = [...snapshot.completed, { play: snapshot.play, reveal: snapshot.reveal, result }];
    commit({ completed, screen: 'reveal', revealEnteredAt: Date.now() });
  }

  async function showProfile(round: 1 | 2) {
    const snapshot = current.current;
    const profile = await analyze({ session_id: snapshot.sessionId, round,
      events: [...log.events], levels: snapshot.completed.map(({ play, reveal }) => ({ play, reveal })),
      ...(round === 2 && snapshot.profile ? { previous: snapshot.profile } : {}) });
    if (profile.schema !== 'profile/v1' || profile.round !== round) throw new Error('画像返回的 schema 或轮次不符合协议，流程已停止。');
    commit({ profile, screen: 'profile', revealEnteredAt: null });
    emit('profile_view', { round });
  }

  async function continueAfterReveal() {
    recordRevealDwell();
    const snapshot = current.current;
    if (snapshot.supplementary) { await showProfile(2); return; }
    const nextCursor = snapshot.mainCursor + 1;
    if (snapshot.index && nextCursor < snapshot.index.main.length) {
      await startLevel(snapshot.index.main[nextCursor], false, nextCursor);
    } else { await showProfile(1); }
  }

  const playedIds = game.completed.map(item => item.play.id);
  const pickedId = game.profile && game.index && game.profile.round === 1
    ? pickNextLevel(game.profile, game.index, playedIds) : null;
  const nextLevelId = pickedId && !playedIds.includes(pickedId) && game.index?.pool.some(item => item.id === pickedId) ? pickedId : null;
  const invalidPick = pickedId && !nextLevelId ? '画像模块返回了已玩过或不在补充池的关卡，已停止补充流程，请联系负责人。' : '';

  function exportProfile() {
    if (!current.current.profile) return;
    const blob = new Blob([JSON.stringify(current.current.profile, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile-${current.current.sessionId}-round-${current.current.profile.round}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function finishSession() {
    if (!log.events.some(event => event.type === 'session_end')) emit('session_end', {});
    commit({ screen: 'finished' });
  }

  function restart() {
    const snapshot = current.current;
    const oldLog = createEventLog(snapshot.sessionId, snapshot.events);
    if (oldLog.events.some(event => event.type === 'session_start')
      && !oldLog.events.some(event => event.type === 'session_end')) oldLog.emit('session_end', {}, null);
    const previous = { ...snapshot, events: [...oldLog.events] };
    previousInMemory.current = previous;
    try { localStorage.setItem(`${STORAGE_KEY}:previous`, JSON.stringify(previous)); }
    catch { setStorageWarning('上一局仅保留在本页内存，浏览器无法归档。新局仍可体验，刷新会丢失未保存内容。'); }
    const fresh = freshGame();
    setLog(createEventLog(fresh.sessionId, [], events => commit({ events: [...events] })));
    current.current = fresh;
    setLoader(createLevelLoader(import.meta.env.BASE_URL));
    setRecoveryNeeded(false);
    setError('');
    commit(fresh);
  }

  const sample = game.index?.is_sample || game.play?.is_sample || game.profile?.is_sample;
  const lastCompleted = game.completed.at(-1);
  return <main className="app-shell">
    <header className="game-header"><div className="brand"><PandaMark /><div>PANDAAI <span>交易观察室</span></div></div><div className="header-status"><span className="status-dot" />{sample ? <span className="sample-label">示例数据</span> : <span>交易人格探索</span>}</div></header>
    {!['home', 'instructions'].includes(game.screen) && <ol className="game-progress" aria-label="本次探索进度">{['观察与决策', '揭晓与复盘', '画像与练习'].map((label, index) => {
      const step = game.screen === 'play' ? 0 : game.screen === 'reveal' ? 1 : 2;
      return <li key={label} data-state={index < step ? 'done' : index === step ? 'current' : 'next'} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : `0${index + 1}`}</span>{label}</li>;
    })}</ol>}
    {storageWarning && <p className="notice" role="status">{storageWarning}</p>}
    {(error || invalidPick) && <section className="error-state" role="alert"><h2>流程已暂停</h2><p>{error || invalidPick}</p><p>请把错误原文反馈给负责人。</p></section>}
    {!error && !invalidPick && recoveryNeeded ? <section className="panel">
      <p className="eyebrow">上次对局尚未结束</p><h1>你的行为记录还在。</h1>
      <p>已保留 {game.events.length} 条事件。当前玩法模块不支持刷新后恢复中途仓位，为避免重复证据，需要重新开始一局。</p>
      <p className="muted">上一局会保留在本机历史存档，不会上传或用于新一局画像。</p>
      <button className="primary-button" onClick={restart}>保留记录，重新开始</button>
    </section> : !error && !invalidPick && <>
      {game.screen === 'home' && <section className="home-hero"><div className="home-layout"><div className="home-copy"><p className="home-kicker"><span />寻找你的交易人格</p>
        <h1>看懂行情，<br />也看见<em>自己。</em></h1>
        <p className="home-description">面对同一段行情，每个人都有自己的选择。<br />用有限的线索做判断，发现你的研究与风险习惯。</p>
        <div className="home-facts"><span>{game.index?.main.length ?? '—'} 关主线探索</span><span>6 维行为画像</span><span>4 种策略练习</span></div>
        <div className="home-cta"><button className="primary-button" disabled={!game.index || busy} onClick={() => commit({ screen: 'instructions' })}>{game.index ? '进入交易观察室' : '正在加载关卡'}</button><span>从一次选择开始 <b aria-hidden="true">↗</b></span></div>
        <p className="home-privacy">无需填写问卷 · 行为保留在当前浏览器</p>
        {sample && <p className="notice">当前包含 {game.index?.main.length ?? 0} 关示例行情。模拟结果不代表真实交易表现。</p>}
      </div><HomeVisual /></div>
        <div className="journey-steps" aria-label="体验流程">{[['观察行情', '用研究点翻开你最关心的线索。'], ['做出选择', '方向、仓位与持有，每一步都留下依据。'], ['找到下一步', '解锁行为画像，体验适合你的技能卡。']].map(([title, text], i) => <div key={title}><span className="journey-number">0{i + 1}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div>
      </section>}
      {game.screen === 'instructions' && <section className="panel intro"><p className="eyebrow">30 秒了解玩法</p><h1>先观察，再决定。</h1>
        <ol className="step-list"><li><b>看一段匿名行情</b><p>名称和日期暂时隐藏。只能看到决定时刻以前的信息。</p></li>
          <li><b>用有限的研究点翻线索</b><p>线索不能全翻，选择你最想验证的部分。</p></li>
          <li><b>做决定，经历三步持有</b><p>方向、仓位、信心和止损，都将成为画像证据。</p></li>
          <li><b>揭晓后，认识自己的习惯</b><p>能力与偏好分开看。证据不足时，保留判断或补充一关。</p></li></ol>
        {sample && <p className="notice">本次含示例数据，用于体验游戏流程。请结合对局与画像页的来源说明解读结果。</p>}
        <p className="muted">行为只保存在当前浏览器。画像导出不附带原始动作日志。</p>
        <div className="button-row"><button className="primary-button" disabled={busy} onClick={() => void run(beginSession)}>{busy ? '正在准备' : '开始这一局'}</button><button className="secondary-button" disabled={busy} onClick={() => commit({ screen: 'home' })}>返回</button></div>
      </section>}
      {game.screen === 'play' && game.play && <section><p className="status-line">{game.supplementary ? '补充关卡' : `第 ${game.mainCursor + 1} / ${game.index?.main.length ?? 0} 关`} · 名称与日期将在决定后揭晓</p>
        <PlayLevel key={game.play.id} level={game.play} isSupplementary={game.supplementary}
          emit={(type, data) => { emit(type, data, current.current.play!.id); }} loadReveal={loadActiveReveal} onDone={onLevelDone} />
      </section>}
      {game.screen === 'reveal' && game.play && game.reveal && lastCompleted && <RevealPage level={game.play} reveal={game.reveal} result={lastCompleted.result} events={game.events} busy={busy} onContinue={() => void run(continueAfterReveal)} />}
      {(game.screen === 'profile' || game.screen === 'finished') && game.profile && <>
        {game.screen === 'finished' && <p className="notice" role="status">本局已结束。你仍可查看或导出这份画像。</p>}
        <ProfilePage profile={game.profile} fixedExample={isFixedSampleProfile(game.profile)} events={game.events} completed={game.completed} nextLevelId={game.screen === 'finished' ? null : nextLevelId}
          onSupplement={() => { if (nextLevelId) void run(() => startLevel(nextLevelId, true, game.mainCursor)); }}
          onExport={exportProfile} onFinish={finishSession} onRestart={restart} busy={busy} />
      </>}
    </>}
    {busy && <p className="loading-state" role="status">正在准备下一步…</p>}
    <footer>仅供游戏体验与研究，不构成投资建议。虚拟收益和趣味人格不能证明真实交易能力。</footer>
  </main>;
}
