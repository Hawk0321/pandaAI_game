import type { Dimension, GameEvent, Profile } from '../shared/protocol';
import { RecommendationPanel } from '../recommend/RecommendationPanel';

interface ProfilePageProps {
  profile: Profile;
  events: GameEvent[];
  nextLevelId: string | null;
  onSupplement: () => void;
  onExport: () => void;
  onFinish: () => void;
  onRestart: () => void;
  busy?: boolean;
  storageWarning?: string;
  fixedExample?: boolean;
}

const confidenceNames: Record<Dimension['confidence'], string> = { low: '低置信度', medium: '中置信度', high: '高置信度' };
const evidenceDirections = { '+': '支持这项判断', '-': '反对这项判断', '?': '仍不确定' };
const eventNames: Record<GameEvent['type'], string> = {
  session_start: '开始探索', level_start: '进入关卡', clue_open: '查看线索', decision: '提交决定',
  hold_step: '持有阶段操作', stop_triggered: '触发止损', level_end: '完成关卡',
  reveal_view: '查看揭晓', profile_view: '查看画像', session_end: '结束探索',
};

function DimensionCard({ dimension, events, profile, fixedExample }: { dimension: Dimension; events: GameEvent[]; profile: Profile; fixedExample: boolean }) {
  return <article className="dimension-card">
    <div className="dimension-heading"><h3>{dimension.name}</h3><span className={`confidence confidence-${dimension.confidence}`}>{confidenceNames[dimension.confidence]}</span></div>
    <p className="dimension-judgement">{dimension.judgement}</p>
    <div className="dimension-flags"><span>{dimension.group === 'ability' ? '能力分数' : '倾向位置'}：{dimension.score === null ? '证据不足，暂不评分' : `${Math.round(dimension.score * 100)}%`}</span>{dimension.conflict && <span className="conflict-label">存在相反证据</span>}</div>
    <details className="dimension-details">
      <summary>查看 {dimension.evidence.length} 条证据与不确定项</summary>
      {dimension.evidence.length === 0 && <p className="muted">画像尚未提供这项判断的行为证据。</p>}
      <ol className="evidence-list">
        {dimension.evidence.map((item, index) => <li key={`${item.level_id}-${index}`}>
          <span className="evidence-direction">{item.level_id} · {evidenceDirections[item.direction]}</span>
          <p>{item.text}</p>
          {fixedExample ? <p className="muted small-text">样例证据，引用示例事件 {item.event_seqs.map(seq => `#${seq}`).join('、') || '未提供'}；未与本局动作关联。</p> : <div className="evidence-events">
            {item.event_seqs.map(seq => {
              const event = events.find(candidate => candidate.seq === seq && candidate.level_id === item.level_id && candidate.session_id === profile.session_id);
              return event ? <details className="event-detail" key={seq}><summary>本局 #{seq} · {eventNames[event.type]}</summary><p className="muted small-text">{event.level_id} · 距关卡开始 {(event.t_ms / 1000).toFixed(1)} 秒</p><pre>{JSON.stringify(event.data, null, 2)}</pre></details> : <p className="muted small-text" key={seq}>本机未找到 {item.level_id} 的事件 #{seq}，无法核对。</p>;
            })}
          </div>}
        </li>)}
      </ol>
      <div className="uncertainty"><strong>还不确定什么</strong><p>{dimension.uncertain || '画像未提供其他不确定项。'}</p></div>
    </details>
  </article>;
}

function generatedTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

export function ProfilePage({ profile, events, nextLevelId, onSupplement, onExport, onFinish, onRestart, busy = false, storageWarning, fixedExample = false }: ProfilePageProps) {
  return <div className="profile-page page-enter">
    <section className="page-heading"><p className="eyebrow">第 {profile.round} 次画像 · {profile.round === 2 ? '补充观察之后' : '从选择里认识自己'}</p><h1>属于你的交易观察。</h1><p>能力与偏好分别看。结论背后的证据，比一个标签更重要。</p></section>

    {fixedExample ? <p className="notice sample-notice">固定示例画像：内容与仓库示例一致，不能视为你本次操作的计算结论。证据里的事件编号属于样例。</p>
      : profile.is_sample && <p className="notice sample-notice">本画像含示例数据。请结合本局行为证据解读，模拟行情不能证明真实交易表现。</p>}
    {storageWarning && <p role="status" className="notice">{storageWarning}</p>}

    <section className="persona-card" aria-labelledby="persona-name"><div className="persona-emoji" aria-hidden="true">{profile.persona.emoji}</div><div><p className="eyebrow">{profile.persona.is_fun_label ? '趣味人物卡' : '人物卡'}</p><h2 id="persona-name">{profile.persona.name}</h2><p className="persona-tagline">{profile.persona.tagline}</p></div><p className="persona-summary">{profile.summary}</p></section>

    <div className="profile-columns">
      {(['ability', 'preference'] as const).map(group => <section className="dimension-group" key={group} aria-labelledby={`dimension-group-${group}`}><div className="group-heading"><h2 id={`dimension-group-${group}`}>{group === 'ability' ? '能力观察' : '交易偏好'}</h2><p>{group === 'ability' ? '如何使用证据、校准判断和控制风险' : '习惯怎样研究、选择方向和承担风险'}</p></div>{profile.dimensions.filter(dimension => dimension.group === group).map(dimension => <DimensionCard key={dimension.id} dimension={dimension} events={events} profile={profile} fixedExample={fixedExample} />)}</section>)}
    </div>

    {profile.round === 2 && <section className="panel changes-panel" aria-labelledby="profile-changes-title"><h2 id="profile-changes-title">补充之后，哪些判断变了？</h2>{profile.changes && profile.changes.length > 0 ? <ul className="changes-list">{profile.changes.map((change, index) => <li key={`${change.dimension_id}-${index}`}><h3>{profile.dimensions.find(dimension => dimension.id === change.dimension_id)?.name ?? change.dimension_id}</h3><p><span className="muted">之前：</span>{change.before}</p><p><span className="muted">现在：</span>{change.after}</p></li>)}</ul> : <p className="muted">本次画像未提供变化记录。</p>}</section>}

    {(profile.needs_more.length > 0 || (profile.round === 1 && nextLevelId)) && <section className="panel followup-panel" aria-labelledby="profile-needs-title"><h2 id="profile-needs-title">还有一点看不准</h2><ul className="needs-list">{profile.needs_more.map((need, index) => <li key={`${need.dimension_id}-${index}`}><strong>{profile.dimensions.find(dimension => dimension.id === need.dimension_id)?.name ?? need.dimension_id}</strong><p>{need.reason}</p></li>)}</ul>{profile.round === 1 && nextLevelId ? <button className="primary-button" disabled={busy} onClick={onSupplement}>再来一关，补充观察</button> : <p className="muted">{profile.round === 2 ? '本次补充观察已完成，以上项目仍需更多行为证据。' : '当前没有可用的补充关卡。先保留这些不确定项，等待关卡与画像模块接入。'}</p>}</section>}

    {!fixedExample && <RecommendationPanel profile={profile} events={events} />}

    <section className="panel profile-actions" aria-labelledby="profile-save-title"><h2 id="profile-save-title">把这份观察留给自己</h2><p>导出只包含 Profile 画像，不附带完整动作日志。动作详情仅用于当前页面核对。</p><div className="button-row"><button className="primary-button" disabled={busy} onClick={onExport}>导出画像 JSON</button><button className="secondary-button" disabled={busy} onClick={onFinish}>完成本次探索</button><button className="text-button" disabled={busy} onClick={onRestart}>重新开始</button></div></section>

    <details className="profile-metadata"><summary>查看画像生成信息</summary><dl><div><dt>生成时间（北京时间）</dt><dd>{generatedTime(profile.generated_at)}</dd></div><div><dt>分析方法</dt><dd>{profile.method === 'rules+llm' ? '规则 + 大模型润色' : '规则'}</dd></div><div><dt>格式</dt><dd>{profile.schema}</dd></div><div><dt>会话</dt><dd>{profile.session_id}</dd></div></dl></details>
  </div>;
}
