/**
 * 推荐面板：展示 profile.recommendations，并在页面内运行 4 个练习任务。
 * 任务只请求已揭晓关卡的 reveal，或先给没玩过关卡的 play、作答后才请求 reveal。
 */
import { useEffect, useState } from 'react';
import type { GameEvent, LevelIndex, LevelPlay, LevelReveal, Profile, Recommendation, TaskId } from '../shared/protocol';
import { MarketChart } from '../shell/MarketChart';
import { EXTERNAL } from './catalog';
import { STOP_OPTIONS, playerDecision, quizSummary, replayStop, scoreClues, styleMatch } from './tasks';
import './recommend.css';

const TYPE_NAMES: Record<Recommendation['type'], string> = { task: '练习任务', tool: '工具', strategy: '策略方向', data: '数据', event: '活动' };
const pct = (x: number, digits = 1) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(digits)}%`;

let levelBase = import.meta.env.BASE_URL || './';
/** 关卡 JSON 的根路径，默认与 C 的加载器一致（相对站点根目录）；自测页可改。 */
export function setLevelBase(base: string) { levelBase = base; }

async function getJson<T>(path: string): Promise<T> {
  const base = levelBase;
  const res = await fetch(`${base.endsWith('/') ? base : `${base}/`}levels/${path}`);
  if (!res.ok) throw new Error(`加载 ${path} 失败：HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
const loadPlay = (id: string) => getJson<LevelPlay>(`${id}.play.json`);
const loadReveal = (id: string) => getJson<LevelReveal>(`${id}.reveal.json`);

function useLevels(ids: string[], withReveal: boolean) {
  const key = `${ids.join(',')}|${withReveal}`;
  const [state, setState] = useState<{ key: string; data?: { play: LevelPlay; reveal?: LevelReveal }[]; error?: string }>({ key: '' });
  useEffect(() => {
    let alive = true;
    Promise.all(ids.map(async (id) => ({ play: await loadPlay(id), reveal: withReveal ? await loadReveal(id) : undefined })))
      .then((data) => { if (alive) setState({ key, data }); })
      .catch((e: unknown) => { if (alive) setState({ key, error: String(e instanceof Error ? e.message : e) }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // 只返回与当前 ids 对应的结果，避免换题时短暂拿到上一组数据
  return state.key === key ? { data: state.data ?? null, error: state.error ?? '' } : { data: null, error: '' };
}

/* ---------------- 任务 1：止损演练 ---------------- */
function StopDrill({ levelId, events }: { levelId: string; events: GameEvent[] }) {
  const { data, error } = useLevels([levelId], true);
  const [stop, setStop] = useState<number | null | undefined>(undefined);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p className="muted">正在加载关卡…</p>;
  const { play, reveal } = data[0];
  const d = playerDecision(events, levelId);
  const side = d && d.side !== 'flat' ? d.side : 'long';
  const size = d && d.side !== 'flat' ? d.size : 1;
  const original = d && d.side !== 'flat' ? `你当时${size >= 1 ? '满仓' : size >= 0.5 ? '半仓' : '轻仓'}${side === 'long' ? '做多' : '做空'}，${d.stop === null ? '没设止损' : `止损 ${d.stop * 100}%`}` : '你当时观望，这里按满仓做多演示';
  const rows = STOP_OPTIONS.map((s) => ({ s, r: replayStop(play, reveal!, side, size, s) }));
  return <div className="task-body">
    <p className="task-step">第 1 步 · {reveal!.name}（{reveal!.decision_date}）：{original}。选一档止损，回放真实后续走势：</p>
    <div className="choice-row">{STOP_OPTIONS.filter((s) => s !== null).map((s) => <button key={s} type="button" className="secondary-button" aria-pressed={stop === s} onClick={() => setStop(s)}>止损 {s! * 100}%</button>)}</div>
    {stop !== undefined && <>
      <p className="task-step">第 2 步 · 回放（决定之后 15 个交易日的真实行情）</p>
      <MarketChart bars={[...play.bars.slice(-30), ...reveal!.after_bars]} />
      <p>止损 {stop! * 100}%：{rows.find((x) => x.s === stop)!.r.stopped ? `第 ${rows.find((x) => x.s === stop)!.r.exitT} 天触发离场` : '没有触发'}，结果 <strong>{pct(rows.find((x) => x.s === stop)!.r.ret)}</strong>。</p>
      <p className="task-step">第 3 步 · 和其他选择比一比</p>
      <table className="task-table"><thead><tr><th>止损</th><th>结果</th><th>途中最大浮亏</th></tr></thead><tbody>
        {rows.map(({ s, r }) => <tr key={String(s)} className={s === stop ? 'row-picked' : ''}><td>{s === null ? '不设止损' : `${s * 100}%`}</td><td>{pct(r.ret)}</td><td>{s === null ? pct(r.worst) : r.stopped ? `≤ ${pct(-size * s)}` : pct(r.worst)}</td></tr>)}
      </tbody></table>
      <p className="task-takeaway">止损不保证赚钱，但它在下单前就把"最多亏多少"定好了。走势和你想的相反时，差别就在这一列。</p>
    </>}
  </div>;
}

/* ---------------- 任务 2：关键线索复盘 ---------------- */
function KeyClueDrill({ levelIds }: { levelIds: string[] }) {
  const { data, error } = useLevels(levelIds.slice(0, 1), true);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p className="muted">正在加载关卡…</p>;
  const { play, reveal } = data[0];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : p));
  const score = scoreClues(picked, reveal!.key_clue_ids);
  return <div className="task-body">
    <p className="task-step">第 1 步 · {play.masked_name}：这次线索全部翻开，不花研究点。</p>
    <p className="task-step">第 2 步 · 选出你认为最关键的两张（已选 {picked.length}/2）</p>
    <div className="clue-grid">{play.clues.map((c) => <button key={c.id} type="button" className="clue-card" aria-pressed={picked.includes(c.id)} disabled={done} onClick={() => toggle(c.id)}>
      <strong>{c.title}</strong><span>{c.text}</span>{done && reveal!.key_clue_ids.includes(c.id) && <em>关键线索</em>}</button>)}</div>
    {!done && <button type="button" className="primary-button" disabled={picked.length !== 2} onClick={() => setDone(true)}>对照答案</button>}
    {done && <>
      <p className="task-step">第 3 步 · 结果：你选中 {score.hits.length}/{score.total} 张关键线索。这关真实标的是 {reveal!.name}，之后 15 天 {pct(reveal!.outcome.ret)}。</p>
      <p className="task-takeaway">关键线索是事后看最能区分涨跌的那几张。下次研究点有限时，先翻成交量、回测这类直接检验"突破是否可信"的线索，再翻均线这类大家都能看到的信号。</p>
    </>}
  </div>;
}

/* ---------------- 任务 3：信心校准小测 ---------------- */
function CalibrationQuiz({ exclude }: { exclude: string[] }) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getJson<LevelIndex>('index.json').then((idx) => {
      const all = [...idx.main, ...idx.pool.map((p) => p.id)].filter((id, i, a) => a.indexOf(id) === i && !exclude.includes(id));
      setIds(all.slice(0, 3));
    }).catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  }, [exclude]);
  const [i, setI] = useState(0);
  const [side, setSide] = useState<'up' | 'down' | null>(null);
  const [conf, setConf] = useState(3);
  const [reveal, setReveal] = useState<LevelReveal | null>(null);
  const [answers, setAnswers] = useState<{ confidence: number; right: boolean | null }[]>([]);
  const levels = useLevels(ids ?? [], false);
  if (error || levels.error) return <p role="alert">{error || levels.error}</p>;
  if (!ids || !levels.data) return <p className="muted">正在挑选没玩过的行情…</p>;
  if (ids.length === 0) return <p className="muted">题库里的行情你都玩过了，暂时没有新的题。</p>;
  const finished = answers.length === ids.length && !reveal;  // 最后一题先看揭晓，再看汇总
  if (finished) {
    const s = quizSummary(answers);
    return <div className="task-body">
      <p className="task-step">结果</p>
      {s ? <><p>平均信心约 <strong>{Math.round(s.avgP * 100)}%</strong> 把握，实际命中 <strong>{Math.round(s.hit * 100)}%</strong>（{s.n} 题可判对错）。</p><p className="task-takeaway">{s.verdict}。这和画像里的"判断校准"是同一个口径。</p></>
        : <p>这几段之后都是横盘，无法判断对错。</p>}
    </div>;
  }
  const play = levels.data[i].play;
  const submit = async () => {
    const r = await loadReveal(play.id);  // 作答之后才请求揭晓
    setReveal(r);
    setAnswers((a) => [...a, { confidence: conf, right: r.outcome.direction === 'flat' ? null : (r.outcome.direction === 'up') === (side === 'up') }]);
  };
  return <div className="task-body">
    <p className="task-step">第 {i + 1}/{ids.length} 题 · {play.masked_name}：之后 15 个交易日会涨还是跌？</p>
    <MarketChart bars={reveal ? [...play.bars, ...reveal.after_bars] : play.bars} />
    {!reveal ? <>
      <div className="choice-row"><button type="button" className="secondary-button" aria-pressed={side === 'up'} onClick={() => setSide('up')}>会涨</button><button type="button" className="secondary-button" aria-pressed={side === 'down'} onClick={() => setSide('down')}>会跌</button></div>
      <div className="choice-row"><span className="muted">信心</span>{[1, 2, 3, 4, 5].map((c) => <button key={c} type="button" className="secondary-button" aria-pressed={conf === c} onClick={() => setConf(c)}>{c}</button>)}</div>
      <button type="button" className="primary-button" disabled={!side} onClick={() => void submit()}>提交并揭晓</button>
    </> : <>
      <p>{reveal.name}：之后 {pct(reveal.outcome.ret)}，{answers[answers.length - 1].right === null ? '横盘不计对错' : answers[answers.length - 1].right ? '你判断对了' : '你判断错了'}。</p>
      <button type="button" className="primary-button" onClick={() => { setI(i + 1); setSide(null); setConf(3); setReveal(null); }}>{i + 1 < ids.length ? '下一题' : '看结果'}</button>
    </>}
  </div>;
}

/* ---------------- 任务 4：风格对照 ---------------- */
const BOT_NEXT: Record<string, { text: string; url: string }> = {
  ma_cross: { text: 'Qube 首页的"5/20 双均线"模板', url: EXTERNAL.qube.url },
  turtle: { text: 'Qube 首页的"海龟突破 + ATR 止损"模板', url: EXTERNAL.qube.url },
  mean_revert: { text: 'QuantSkills 的超跌反弹技能包', url: EXTERNAL.oversoldSkill.url },
};
function StyleMatch({ levelIds, events }: { levelIds: string[]; events: GameEvent[] }) {
  const { data, error } = useLevels(levelIds, true);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p className="muted">正在加载关卡…</p>;
  const rows = data.map(({ play, reveal }) => ({ levelId: play.id, name: reveal!.name, side: playerDecision(events, play.id)?.side ?? 'flat', bots: reveal!.bots }));
  const m = styleMatch(rows);
  const sideText = { long: '多', short: '空', flat: '观望' } as const;
  return <div className="task-body">
    <p className="task-step">第 1 步 · 逐关对照你和三种经典策略在决定时刻的方向</p>
    <div className="table-scroll"><table className="task-table"><thead><tr><th>关卡</th><th>你</th>{rows[0]?.bots.map((b) => <th key={b.id}>{b.name}</th>)}</tr></thead><tbody>
      {rows.map((r) => <tr key={r.levelId}><td>{r.name}</td><td>{sideText[r.side]}</td>{r.bots.map((b) => <td key={b.id} className={b.side === r.side ? 'row-picked' : ''}>{sideText[b.side]}</td>)}</tr>)}
    </tbody></table></div>
    <p className="task-step">第 2 步 · 最像你的规则</p>
    {m.best ? <p>在你下单的 {m.counted} 关里，<strong>{m.best.name}</strong> 和你方向一致 {m.best.same} 次。下一步可以打开 <a href={BOT_NEXT[m.best.id].url} target="_blank" rel="noreferrer">{BOT_NEXT[m.best.id].text}</a>，把这条规则拿去回测。</p>
      : <p>你的方向和三种策略都不太一样，可能是在看线索而不是固定规则。可以在 Qube 里用一句话描述你的想法，生成自己的策略。</p>}
  </div>;
}

function TaskRunner({ task, events }: { task: NonNullable<Recommendation['next_step']['task']>; events: GameEvent[] }) {
  const map: Record<TaskId, JSX.Element> = {
    stop_drill: <StopDrill levelId={task.level_ids[0]} events={events} />,
    key_clue_drill: <KeyClueDrill levelIds={task.level_ids} />,
    calibration_quiz: <CalibrationQuiz exclude={task.exclude_ids ?? []} />,
    style_match: <StyleMatch levelIds={task.level_ids} events={events} />,
  };
  return map[task.id];
}

export function RecommendationPanel({ profile, events }: { profile: Profile; events: GameEvent[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const recs = profile.recommendations ?? [];
  if (recs.length === 0) return null;
  return <section className="panel recommend-panel" aria-labelledby="recommend-title">
    <h2 id="recommend-title">根据这份画像，下一步可以做什么</h2>
    <p className="muted">每条推荐都写了它依据哪项判断。练习任务能当场玩，用的是 Panda Data 真实历史行情；外部资源会在新窗口打开。</p>
    <ol className="rec-list">{recs.map((r) => <li key={r.id} className="rec-card">
      <div className="rec-heading"><span className="rec-type">{TYPE_NAMES[r.type]}</span><h3>{r.title}</h3></div>
      <p>{r.reason}</p>
      <p className="muted small-text">资源：{r.resource.name}（{r.resource.provider}）· {r.resource.desc}{r.resource.is_sample ? ' · 示例资源' : ''}</p>
      <details><summary>依据</summary><ul>{r.based_on.map((b) => <li key={b.dimension_id}><strong>{profile.dimensions.find((d) => d.id === b.dimension_id)?.name}</strong>：{b.judgement}{b.evidence.length > 0 && <>（{b.evidence.join('；')}）</>}</li>)}</ul></details>
      {r.next_step.kind === 'external'
        ? <a className="rec-link" href={r.next_step.url} target="_blank" rel="noreferrer">{r.next_step.label} ↗</a>
        : <button type="button" className={open === r.id ? 'secondary-button' : 'primary-button'} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? '收起' : r.next_step.label}</button>}
      {open === r.id && r.next_step.task && <TaskRunner task={r.next_step.task} events={events} />}
    </li>)}</ol>
  </section>;
}
