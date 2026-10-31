import { useEffect, useRef, useState } from 'react';
import type { Bar, PlayLevelProps, Side } from '../shared/protocol';
import { MarketChart } from '../shell/MarketChart';
import { checkStop, emptyAccount, pnl, targetPosition, trade } from './trading';
import type { Action } from './trading';
import { prefersReducedMotion, scheduleReveal } from './reveal';
import { ClueBack } from './ClueFace';
import { DigestCard } from './DigestCard';
import { clueName, clueTeaser } from './clueView';
import './play.css';

export function PlayLevel(props: PlayLevelProps): JSX.Element {
  return <Round key={props.level.id} {...props} />;
}
function Round({ level, isSupplementary, loadReveal, emit, onDone }: PlayLevelProps): JSX.Element {
  const started = useRef(false);
  const startTime = useRef(0);
  const locked = useRef(false);
  const account = useRef(emptyAccount());
  const [opened, setOpened] = useState<string[]>([]);
  const openedRef = useRef<string[]>([]);
  const [budget, setBudget] = useState(level.budget);
  // 不做预选：默认值会在玩家没动过手时留下“主动做多 20%、信心 3”的假证据，污染画像。
  const [side, setSide] = useState<Side | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [stop, setStop] = useState<number | null>(null);
  const [stopChosen, setStopChosen] = useState(false);
  const [entrySide, setEntrySide] = useState<'long' | 'short'>('long');
  const [phase, setPhase] = useState<'research' | 'loading' | 'holding' | 'done' | 'error'>('research');
  const [future, setFuture] = useState<Bar[]>([]);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Bar[]>([]);
  const [error, setError] = useState('');
  const [stopNotice, setStopNotice] = useState('');
  const price = shown.at(-1)?.c ?? level.bars.at(-1)!.c;
  // 逐根揭晓只是显示节奏：成交、止损、事件都按整段 5 根一次算完（见 revealStep），这里只记录"画到第几根了"。
  const shownRef = useRef<Bar[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const cancelReveal = useRef<() => void>(() => {});
  useEffect(() => () => cancelReveal.current(), []);
  const displayPrice = shown[revealed - 1]?.c ?? level.bars.at(-1)!.c;
  const displayPnl = pnl(account.current, displayPrice);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startTime.current = performance.now();
    emit('level_start', { budget: level.budget, is_supplementary: isSupplementary });
  }, [level.budget, isSupplementary, emit]);

  function open(id: string) {
    if (phase !== 'research' || locked.current || openedRef.current.includes(id)) return;
    const clue = level.clues.find(c => c.id === id)!;
    const remaining = level.budget - level.clues.filter(c => openedRef.current.includes(c.id)).reduce((sum, c) => sum + c.cost, 0);
    if (clue.cost > remaining) return;
    openedRef.current = [...openedRef.current, id];
    setOpened(openedRef.current); setBudget(remaining - clue.cost);
    emit('clue_open', { clue_id: id, kind: clue.kind, signal: clue.signal, cost: clue.cost, budget_left: remaining - clue.cost });
  }
  function revealStep(bars: Bar[], next: number) {
    let current = account.current;
    for (const bar of bars) {
      const result = checkStop(current, bar, stop);
      current = result.account;
      if (result.triggered) {
        emit('stop_triggered', { step: next, pnl: result.pnl });
        setStopNotice(`第 ${next} 步已按止损价自动平仓`);
      }
    }
    account.current = current;
    const from = shownRef.current.length;
    shownRef.current = [...shownRef.current, ...bars];
    setShown(shownRef.current); setStep(next); setPhase('holding'); locked.current = false;
    // 画面上每根约 150ms 依次出现；开了"减少动态"就整段一次显示。放完之前操作按钮先按住。
    cancelReveal.current();
    setRevealing(true);
    cancelReveal.current = scheduleReveal(from, shownRef.current.length, count => {
      setRevealed(count);
      if (count >= shownRef.current.length) setRevealing(false);
    }, { reduced: prefersReducedMotion() });
  }
  async function decide() {
    // 三个必填项没选齐就不发 decision：跳过即是零证据，而不是伪造一条默认动作。
    if (locked.current || phase !== 'research' || side === null || size === null || confidence === null || !stopChosen) return;
    locked.current = true; setPhase('loading');
    emit('decision', { side, size: side === 'flat' ? 0 : size, confidence, stop, clues_opened: [...openedRef.current], think_ms: Math.max(0, Math.round(performance.now() - startTime.current)) });
    account.current = trade(emptyAccount(), side === 'flat' ? 0 : (side === 'long' ? size : -size), price);
    setEntrySide(side === 'short' ? 'short' : 'long');
    try {
      // 唯一揭晓入口；decision 已发出，组件无静态 reveal 导入或预取。
      const reveal = await loadReveal();
      if (reveal.id !== level.id || reveal.after_bars.length !== 15 || level.hold_steps !== 3) throw new Error('揭晓关卡或三步行情不符合协议');
      setFuture(reveal.after_bars);
      revealStep(reveal.after_bars.slice(0, 5), 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setPhase('error'); }
  }
  function act(action: Action) {
    if (locked.current || phase !== 'holding' || revealing) return;
    locked.current = true;
    const before = pnl(account.current, price);
    account.current = trade(account.current, targetPosition(account.current.position, action, entrySide), price);
    emit('hold_step', { step, pnl_before: before, action, position_after: account.current.position });
    if (step === 3) {
      const result = { pnl: pnl(account.current, price), final_position: account.current.position };
      setPhase('done'); emit('level_end', result); onDone({ level_id: level.id, ...result });
    } else revealStep(future.slice(step * 5, (step + 1) * 5), step + 1);
  }
  return <section className="play-level" aria-label="对局玩法" data-phase={phase} data-revealing={revealing || undefined}>
    <p>{isSupplementary ? '补充关卡：再看看你' : `关卡 ${level.id}`} · 研究点 {budget}/{level.budget}</p>
    <h2>{level.masked_name}</h2>
    {level.is_sample && <p>模拟行情示例</p>}
    <dl className="play-dossier">
      <div><dt>市场 / 周期</dt><dd>{level.market} · {level.timeframe === '1d' ? '日线' : level.timeframe}</dd></div>
      <div><dt>可见区间</dt><dd>t=-59 → t=0（{level.bars.length} 根）</dd></div>
      <div><dt>持有阶段</dt><dd>{level.hold_steps} 步 · 共 15 根</dd></div>
    </dl>
    <div className="play-chart" aria-busy={revealing}>
      <MarketChart bars={[...level.bars, ...shown]} visibleCount={level.bars.length + revealed} decisionT={0} />
      {revealing && <p className="reveal-progress" aria-hidden="true">第 {step} 步行情逐根揭晓中 · {Math.max(0, revealed - (step - 1) * 5)}/5 根</p>}
    </div>
    {phase === 'research' && <>
      <p>先看走势，挑选线索，再提交判断。研究点不足以翻开全部线索。</p>
      <div className="play-clues">{level.clues.map(clue => {
        const isOpen = opened.includes(clue.id);
        const isLocked = !isOpen && clue.cost > budget;
        return <button type="button" key={clue.id} className={`clue-card${isOpen ? ' is-open' : ''}${isLocked ? ' is-locked' : ''}`} aria-expanded={isOpen} disabled={isOpen || isLocked} onClick={() => open(clue.id)}>
          <span className="clue-inner">
            <span className="clue-face clue-front" aria-hidden={isOpen}><strong>{clueName(clue)} · {clue.cost} 点</strong><span>{isLocked ? `研究点不足（还剩 ${budget} 点），翻不开` : clueTeaser(clue)}</span></span>
            <span className="clue-face clue-back" aria-hidden={!isOpen}><ClueBack clue={clue} /></span>
          </span>
        </button>;
      })}</div>
      <DigestCard bars={level.bars} clues={level.clues} opened={opened} budget={budget} />
      <div className="decision-grid"><fieldset><legend>方向{side === null ? '：必选' : ''}</legend>{(['long','flat','short'] as const).map((value, i) => <button type="button" key={value} aria-pressed={side === value} onClick={() => { setSide(value); if (value === 'flat') { setSize(0); } else if (size === 0) setSize(null); }}>{['做多','观望','做空'][i]}</button>)}</fieldset>
      <fieldset disabled={side === null || side === 'flat'}><legend>仓位{side === 'flat' ? '：观望为 0' : side === null ? '：先选方向' : size === null ? '：必选' : ''}</legend>{[0.2,0.5,1].map((value, i) => <button type="button" key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{['轻仓 20%','中仓 50%','重仓 100%'][i]}</button>)}</fieldset>
      <fieldset><legend>信心{confidence === null ? '：必选' : ''}</legend>{[1,2,3,4,5].map(value => <button type="button" key={value} aria-pressed={confidence === value} onClick={() => setConfidence(value)}>{value}</button>)}<small>1 没把握 · 5 很确定</small></fieldset>
      <fieldset><legend>止损{stopChosen ? '' : '：必选'}</legend>{[null,0.05,0.1].map(value => <button type="button" key={String(value)} aria-pressed={stopChosen && stop === value} onClick={() => { setStop(value); setStopChosen(true); }}>{value === null ? '不设止损' : `${value * 100}%`}</button>)}</fieldset></div>
      <button type="button" className="play-submit" disabled={side === null || size === null || confidence === null || !stopChosen} onClick={() => void decide()}>{side === null || size === null || confidence === null || !stopChosen ? '四项都选好才能提交' : '提交决定，揭晓走势'}</button>
    </>}
    {phase === 'loading' && <p role="status">正在加载后续走势…</p>}
    {phase === 'holding' && <div className="play-actions">
      <h3>持有第 {step}/3 步</h3>
      <dl className="gain-scoreboard" aria-label="本关实时记分板">
        <div><dt>当前收益</dt><dd className={displayPnl > 0 ? 'is-gain' : displayPnl < 0 ? 'is-loss' : ''}>{(displayPnl * 100).toFixed(2)}%</dd></div>
        <div><dt>当前仓位</dt><dd>{(account.current.position * 100).toFixed(0)}%</dd></div>
        <div><dt>保护线</dt><dd>{stop === null ? '未设置' : `${(stop * 100).toFixed(0)}%`}</dd></div>
        <div className="board-rank"><dt>进度</dt><dd>第 {step} / 3 步 · 还剩 {3 - step} 步</dd></div>
      </dl>
      <p role="status" className="sr-live">{revealing ? `第 ${step} 步行情揭晓中` : `当前收益 ${(displayPnl * 100).toFixed(2)}% · 仓位 ${(account.current.position * 100).toFixed(0)}%`}</p>
      {stopNotice && <p className="stop-notice">{stopNotice}</p>}
      {account.current.position === 0 && <fieldset><legend>中途入场方向</legend><button onClick={() => setEntrySide('long')} aria-pressed={entrySide === 'long'}>入场做多</button><button onClick={() => setEntrySide('short')} aria-pressed={entrySide === 'short'}>入场做空</button></fieldset>}
      <p>加减仓按 0 → 20% → 50% → 100% 一档；当前收盘价成交。{step === 3 ? '本步操作后结束本关。' : '操作后查看下一段走势。'}</p>
      <div className="action-row">{(['hold','add','reduce','close'] as const).map((action,i) => <button type="button" key={action} className={action === 'hold' ? 'action-hold' : ''} disabled={revealing || (action === 'add' && Math.abs(account.current.position) === 1) || ((action === 'reduce' || action === 'close') && account.current.position === 0)} onClick={() => act(action)}>{['持有','加仓','减仓','平仓'][i]}</button>)}</div>
    </div>}
    {phase === 'error' && <div role="alert"><p>加载失败，流程已停止，请反馈以下错误：</p><pre>{error}</pre></div>}
  </section>;
}
