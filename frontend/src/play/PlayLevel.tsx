import { useEffect, useRef, useState } from 'react';
import type { Bar, PlayLevelProps, Side } from '../shared/protocol';
import { MarketChart } from '../shell/MarketChart';
import { checkStop, emptyAccount, pnl, targetPosition, trade } from './trading';
import type { Action } from './trading';

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
  const [side, setSide] = useState<Side>('long');
  const [size, setSize] = useState(0.2);
  const [confidence, setConfidence] = useState(3);
  const [stop, setStop] = useState<number | null>(null);
  const [entrySide, setEntrySide] = useState<'long' | 'short'>('long');
  const [phase, setPhase] = useState<'research' | 'loading' | 'holding' | 'done' | 'error'>('research');
  const [future, setFuture] = useState<Bar[]>([]);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Bar[]>([]);
  const [error, setError] = useState('');
  const [stopNotice, setStopNotice] = useState('');
  const price = shown.at(-1)?.c ?? level.bars.at(-1)!.c;
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
    setShown(previous => [...previous, ...bars]); setStep(next); setPhase('holding'); locked.current = false;
  }
  async function decide() {
    if (locked.current || phase !== 'research') return;
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
    if (locked.current || phase !== 'holding') return;
    locked.current = true;
    const before = pnl(account.current, price);
    account.current = trade(account.current, targetPosition(account.current.position, action, entrySide), price);
    emit('hold_step', { step, pnl_before: before, action, position_after: account.current.position });
    if (step === 3) {
      const result = { pnl: pnl(account.current, price), final_position: account.current.position };
      setPhase('done'); emit('level_end', result); onDone({ level_id: level.id, ...result });
    } else revealStep(future.slice(step * 5, (step + 1) * 5), step + 1);
  }
  return <section className="play-level" aria-label="对局玩法">
    <p>{isSupplementary ? '补充关卡：再看看你' : `关卡 ${level.id}`} · 研究点 {budget}/{level.budget}</p>
    <h2>{level.masked_name}</h2>
    {level.is_sample && <p>模拟行情示例</p>}
    <MarketChart bars={[...level.bars, ...shown]} />
    {phase === 'research' && <>
      <p>先看走势，挑选线索，再提交判断。研究点不足以翻开全部线索。</p>
      <div className="play-clues">{level.clues.map(clue => <button type="button" key={clue.id} aria-expanded={opened.includes(clue.id)} disabled={opened.includes(clue.id) || clue.cost > budget} onClick={() => open(clue.id)}>
        <strong>{clue.title} · {clue.cost} 点</strong><span>{opened.includes(clue.id) ? clue.text : '点击翻开线索'}</span>
      </button>)}</div>
      <fieldset><legend>方向</legend>{(['long','flat','short'] as const).map((value, i) => <button type="button" key={value} aria-pressed={side === value} onClick={() => setSide(value)}>{['做多','观望','做空'][i]}</button>)}</fieldset>
      <fieldset disabled={side === 'flat'}><legend>仓位{side === 'flat' ? '：观望为 0' : ''}</legend>{[0.2,0.5,1].map((value, i) => <button type="button" key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{['轻仓 20%','中仓 50%','重仓 100%'][i]}</button>)}</fieldset>
      <fieldset><legend>信心</legend>{[1,2,3,4,5].map(value => <button type="button" key={value} aria-pressed={confidence === value} onClick={() => setConfidence(value)}>{value}</button>)}<small>1 没把握 · 5 很确定</small></fieldset>
      <fieldset><legend>止损</legend>{[null,0.05,0.1].map(value => <button type="button" key={String(value)} aria-pressed={stop === value} onClick={() => setStop(value)}>{value === null ? '不设止损' : `${value * 100}%`}</button>)}</fieldset>
      <button type="button" onClick={() => void decide()}>提交决定，揭晓走势</button>
    </>}
    {phase === 'loading' && <p role="status">正在加载后续走势…</p>}
    {phase === 'holding' && <div className="play-actions">
      <h3>持有第 {step}/3 步</h3><p role="status">当前收益 {(pnl(account.current, price) * 100).toFixed(2)}% · 仓位 {(account.current.position * 100).toFixed(0)}%</p>
      {stopNotice && <p>{stopNotice}</p>}
      {account.current.position === 0 && <fieldset><legend>中途入场方向</legend><button onClick={() => setEntrySide('long')} aria-pressed={entrySide === 'long'}>入场做多</button><button onClick={() => setEntrySide('short')} aria-pressed={entrySide === 'short'}>入场做空</button></fieldset>}
      <p>加减仓按 0 → 20% → 50% → 100% 一档；当前收盘价成交。{step === 3 ? '本步操作后结束本关。' : '操作后查看下一段走势。'}</p>
      {(['hold','add','reduce','close'] as const).map((action,i) => <button type="button" key={action} disabled={(action === 'add' && Math.abs(account.current.position) === 1) || ((action === 'reduce' || action === 'close') && account.current.position === 0)} onClick={() => act(action)}>{['持有','加仓','减仓','平仓'][i]}</button>)}
    </div>}
    {phase === 'error' && <div role="alert"><p>加载失败，流程已停止，请反馈以下错误：</p><pre>{error}</pre></div>}
  </section>;
}
