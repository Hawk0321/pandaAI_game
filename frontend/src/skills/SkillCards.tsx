import { useId, useRef, useState } from 'react';
import type { GameEvent, Profile } from '../shared/protocol';
import { MarketChart } from '../shell/MarketChart';
import { CARDS, recommendSkills } from './model';
import type { CompletedLevel, SkillId } from './model';
import { review, reversal, shield, trend } from './simulations';
import type { Simulation } from './simulations';
import { SkillGlyph } from './SkillGlyph';
import './skills.css';

const percent = (n: number) => `${(n * 100).toFixed(2)}%`;
const choices = ['先找一条反向线索', '缩小仓位，先设保护线', '降低信心，等待更多证据'];

function EquityChart({ strategy, baseline }: { strategy: Simulation; baseline: Simulation }) {
  const gradient = useId();
  const values = [...strategy.points, ...baseline.points].map(p => p.equity);
  const low = Math.min(...values, 1) - .01, high = Math.max(...values, 1) + .01;
  const points = (result: Simulation) => result.points.map(p => `${40 + p.t * 30},${168 - (p.equity - low) / (high - low) * 140}`).join(' ');
  return <figure className="skill-equity"><svg viewBox="0 0 530 205" role="img" aria-label="练习策略与对照的逐日收盘权益曲线">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f3c460" stopOpacity=".2" /><stop offset="1" stopColor="#f3c460" stopOpacity="0" /></linearGradient></defs>
    {[low, (low + high) / 2, high].map(value => <g key={value}><line x1="40" x2="490" y1={168 - (value - low) / (high - low) * 140} y2={168 - (value - low) / (high - low) * 140} stroke="#383d4f" strokeOpacity=".45" /><text x="3" y={172 - (value - low) / (high - low) * 140} fill="#a1a3ae" fontSize="10">{((value - 1) * 100).toFixed(0)}%</text></g>)}
    <polygon points={`40,168 ${points(strategy)} 490,168`} fill={`url(#${gradient})`} />
    <line x1="40" x2="490" y1={168 - (1 - low) / (high - low) * 140} y2={168 - (1 - low) / (high - low) * 140} stroke="#646876" strokeDasharray="4 4" />
    <polyline points={points(baseline)} fill="none" stroke="#edc884" strokeWidth="2" />
    <polyline points={points(strategy)} fill="none" stroke="#f3c460" strokeWidth="3" />
    <text x="40" y="194" fill="#b4b6c0" fontSize="12">t=0</text><text x="460" y="194" fill="#b4b6c0" fontSize="12">t=15</text>
  </svg><figcaption><span>● 练习策略</span><span>● 对照方案</span> · 初始权益为 1</figcaption></figure>;
}

export function SkillCards({ profile, events, completed }: { profile: Profile; events: GameEvent[]; completed: CompletedLevel[] }) {
  const ownEvents = events.filter(e => e.session_id === profile.session_id);
  const recommendations = recommendSkills(profile, ownEvents);
  const [active, setActive] = useState<SkillId | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [levelId, setLevelId] = useState(completed[0]?.play.id ?? '');
  const [fast, setFast] = useState(5), [slow, setSlow] = useState(20);
  const [size, setSize] = useState(.5), [side, setSide] = useState<1 | -1>(1);
  const [stop, setStop] = useState(.05), [take, setTake] = useState(.1), [window, setWindow] = useState(3);
  const [lesson, setLesson] = useState(choices[0]);
  const [practiceNote, setPracticeNote] = useState('');
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const panel = useRef<HTMLElement>(null);
  const level = completed.find(item => item.play.id === levelId) ?? completed[0];
  if (!level || recommendations.length === 0) return null;

  const strategy = active === 'trend' ? trend(level, fast, slow, size)
    : active === 'shield' ? shield(level, side, size, stop, take)
    : active === 'reversal' ? reversal(level, window, size, true) : null;
  const baseline = active === 'trend' ? shield(level, 1, size, null, null)
    : active === 'shield' ? shield(level, side, size, null, null)
    : active === 'reversal' ? reversal(level, window, size, false) : null;
  const reviewItems = active === 'review' ? review(level, ownEvents) : [];

  function open(id: SkillId) {
    setActive(id); setPracticeNote('');
    if (recommendations.findIndex(r => r.id === id) >= 2) setShowAll(true);
    requestAnimationFrame(() => { panel.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  function close() {
    const id = active; setActive(null);
    requestAnimationFrame(() => document.getElementById(`skill-open-${id}`)?.focus());
  }
  function complete() {
    if (!active) return;
    const recommendation = recommendations.find(r => r.id === active)!;
    const report = { skill_id: active, name: CARDS[active].name, level_id: level.play.id,
      source: { repository: CARDS[active].repo, commit: CARDS[active].commit, mode: 'independent-game-exercise' },
      recommendation, parameters: active === 'trend' ? { fast, slow, size } : active === 'shield' ? { side, size, stop, take } : active === 'reversal' ? { window, size } : { lesson },
      ...(strategy && baseline ? { result: strategy, baseline, player_pnl: level.result.pnl } : { review: reviewItems, lesson }),
      completed_at: new Date().toISOString() };
    setReports(previous => [...previous.filter(r => r.skill_id !== active || r.level_id !== level.play.id), report]);
    setPracticeNote(active === 'review' ? `已记录你的下一步：“${lesson}”。先在下一次练习中验证它，不据此修改本局画像。`
      : `已完成这次比较。${strategy?.fills.length ? '注意收益与回撤的取舍，一段行情不能证明哪种策略一直更好。' : '本段没有满足入场条件，空仓是有效结果。'}`);
  }
  function exportTasks() {
    const payload = { schema: 'skill-practice/v1', session_id: profile.session_id, profile_round: profile.round,
      is_sample: profile.is_sample, recommendations, exercises: reports,
      method: 'browser-game-rules', generated_at: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `skill-practice-${profile.session_id}-round-${profile.round}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="skill-section" aria-labelledby="skill-cards-title" data-active={active !== null}>
    <div className="skill-heading"><div><p className="eyebrow">下一步 · 选择一项练习</p><h2 id="skill-cards-title">为你推荐的技能卡</h2></div><span className="skill-count">优先推荐 2 张</span></div>
    <p className="skill-intro">从你的选择出发，在刚才的行情里探索新的可能。</p>
    <div className="skill-grid">{recommendations.map((r, index) => <article key={r.id} className={`skill-card skill-${r.id} ${index < 2 ? 'skill-recommended' : ''}`} hidden={index >= 2 && !showAll} data-skill={r.id} data-recommended={index < 2}>
      <div className="skill-card-top"><span className="skill-card-number">0{index + 1}</span><span>{index < 2 ? r.confidence === 'low' ? '探索推荐 · 证据尚少' : '匹配你的行为' : '自由探索'}</span></div>
      <div className="skill-art"><SkillGlyph id={r.id} /><span>{r.id === 'trend' ? '跟随趋势' : r.id === 'shield' ? '管理风险' : r.id === 'reversal' ? '等待确认' : '复盘决定'}</span></div>
      <h3>{CARDS[r.id].name}</h3><p>{CARDS[r.id].description}</p><p className="skill-reason"><small>推荐理由</small>{r.reason}</p>
      <details className="skill-evidence"><summary>为什么推荐这张卡</summary>{r.evidence.length ? r.evidence.map((e, i) => <p key={i}>{e.text}<br /><small>{e.level_id} · 本局 {e.event_seqs.map(seq => `#${seq}`).join('、')}</small></p>) : <p>当前可核对的证据不足，仅建议探索，不下能力结论。</p>}</details>
      <button id={`skill-open-${r.id}`} type="button" className={index < 2 ? 'primary-button' : 'secondary-button'} aria-expanded={active === r.id} aria-controls="skill-lab" onClick={() => open(r.id)}>体验{CARDS[r.id].name}</button>
    </article>)}</div>
    {!active && <button className="skill-more text-button" type="button" aria-label={showAll ? '收起其他技能卡' : '展开另外 2 张技能卡'} aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? '收起其他技能卡' : '展开另外 2 张技能卡'}<span aria-hidden="true">{showAll ? '−' : '+'}</span></button>}
    {active && <section id="skill-lab" className={`panel skill-lab skill-${active}`} ref={panel} tabIndex={-1} aria-labelledby="skill-lab-title">
      <div className="skill-heading"><div><p className="eyebrow">游戏练习版 · 已完成关卡</p><h3 id="skill-lab-title">{CARDS[active].name}实验室</h3></div><button type="button" className="text-button" onClick={close}>关闭练习</button></div>
      <div className="skill-controls"><label>练习关卡<select aria-label="练习关卡" value={level.play.id} onChange={e => { setLevelId(e.target.value); setPracticeNote(''); }}>{completed.map(l => <option key={l.play.id} value={l.play.id}>{l.play.id} · {l.reveal.name}</option>)}</select></label>
        {active !== 'review' && <label>练习仓位<select aria-label="练习仓位" value={size} onChange={e => { setSize(Number(e.target.value)); setPracticeNote(''); }}>{[.2, .5, 1].map(n => <option key={n} value={n}>{n * 100}%</option>)}</select></label>}
        {active === 'trend' && <><label>快均线<select aria-label="快均线" value={fast} onChange={e => { setFast(Number(e.target.value)); setPracticeNote(''); }}>{[5, 10].map(n => <option key={n} value={n}>{n} 日</option>)}</select></label><label>慢均线<select aria-label="慢均线" value={slow} onChange={e => { setSlow(Number(e.target.value)); setPracticeNote(''); }}>{[20, 30].map(n => <option key={n} value={n}>{n} 日</option>)}</select></label></>}
        {active === 'shield' && <><label>练习方向<select aria-label="练习方向" value={side} onChange={e => { setSide(Number(e.target.value) as 1 | -1); setPracticeNote(''); }}><option value={1}>做多</option><option value={-1}>做空</option></select></label><label>止损线<select aria-label="止损线" value={stop} onChange={e => { setStop(Number(e.target.value)); setPracticeNote(''); }}>{[.03, .05, .1].map(n => <option key={n} value={n}>{n * 100}%</option>)}</select></label><label>止盈线<select aria-label="止盈线" value={take} onChange={e => { setTake(Number(e.target.value)); setPracticeNote(''); }}>{[.05, .1, .15].map(n => <option key={n} value={n}>{n * 100}%</option>)}</select></label></>}
        {active === 'reversal' && <label>确认窗口<select aria-label="确认窗口" value={window} onChange={e => { setWindow(Number(e.target.value)); setPracticeNote(''); }}>{[1, 3, 5].map(n => <option key={n} value={n}>{n} 根 K 线</option>)}</select></label>}
      </div>
      {strategy && baseline && <>
        <p className="small-text">{active === 'trend' ? '对照：相同仓位，在 t=0 做多持有。双均线使用上一根收盘信号，在下一根开盘调整多空。' : active === 'shield' ? '对照：相同方向、仓位和入场价，不设保护线持有。此处参数是新的练习，不是原交易指令。' : '对照：相同仓位，下破后直接入场；练习策略等待收复确认，再于下一根开盘做多。没有确认就不入场。'}</p>
        <div className="skill-metrics"><div><span>练习策略收益</span><strong className={strategy.ret >= 0 ? 'return-positive' : 'return-negative'}>{percent(strategy.ret)}</strong><span className="metric-drawdown">收盘回撤 {percent(strategy.drawdown)}</span></div><div><span>对照方案收益</span><strong className={baseline.ret >= 0 ? 'return-positive' : 'return-negative'}>{percent(baseline.ret)}</strong><span className="metric-drawdown">收盘回撤 {percent(baseline.drawdown)}</span></div><div><span>你原来本关的收益</span><strong className={level.result.pnl >= 0 ? 'return-positive' : 'return-negative'}>{percent(level.result.pnl)}</strong><span className="metric-drawdown">保留原始交易结果</span></div></div>
        <EquityChart strategy={strategy} baseline={baseline} />
        {!strategy.fills.some(f => f.target !== 0) && <p className="notice">本段没有满足入场条件，策略保持空仓。</p>}
        <details><summary>查看练习成交与行情</summary><ol>{strategy.fills.length ? strategy.fills.map((f, i) => <li key={i}>t={f.t} · 价格 {f.price.toFixed(2)} · 仓位 {(f.target * 100).toFixed(0)}% · {f.reason}</li>) : <li>没有成交。</li>}</ol><MarketChart bars={[...level.play.bars, ...level.reveal.after_bars]} /></details>
        <p className="muted small-text">无手续费和滑点；回撤按逐日收盘权益计算。止损跳空按开盘价退出，同根同时触及两线且开盘未越线时按止损优先。短区间结果仅供比较。</p>
      </>}
      {active === 'review' && <div className="skill-review">{reviewItems.length ? reviewItems.map(item => <article key={item.title}><h4>{item.title}</h4><p>{item.text}</p><small>{level.play.id} · 本局 {item.seqs.map(seq => `#${seq}`).join('、')}</small></article>) : <p>缺少本关决定事件，暂时无法复盘。</p>}<label>下一次，我愿意尝试<select aria-label="下一次改动" value={lesson} onChange={e => { setLesson(e.target.value); setPracticeNote(''); }}>{choices.map(choice => <option key={choice}>{choice}</option>)}</select></label></div>}
      <div className="button-row"><button type="button" disabled={active === 'review' && reviewItems.length === 0} onClick={complete}>完成这次练习</button></div>
      {practiceNote && <p className="notice skill-completion" role="status">{practiceNote}</p>}
      <details className="skill-source"><summary>来源与游戏版说明</summary><p>{CARDS[active].adaptation}</p><a href={`https://github.com/quantskills/${CARDS[active].repo}/tree/${CARDS[active].commit}`} target="_blank" rel="noreferrer">查看 QuantSkills 原始技能</a><p className="muted small-text">仅参考技能用途与通用规则，未复制其源码，也未把原 Skill 安装进浏览器。练习完全使用本局已揭晓数据。</p></details>
    </section>}
    <div className="skill-export"><div className="practice-progress"><span>技能探索 <b>{new Set(reports.map(r => r.skill_id)).size} / 4</b></span><progress max={4} value={new Set(reports.map(r => r.skill_id)).size} aria-label="已完成的技能练习种类" /><p className="muted small-text">已保存 {reports.length} 项练习。刷新或进入补关前，请先导出记录。</p></div><button type="button" className="secondary-button" onClick={exportTasks}>导出推荐与练习 JSON</button></div>
  </section>;
}
