/**
 * 推荐面板：把 profile.recommendations 渲染成卡片，按钮在新窗口打开 PandaAI / QuantSkills 页面。
 */
import type { Profile, Recommendation } from '../shared/protocol';
import './recommend.css';

const TYPE_NAMES: Record<Recommendation['type'], string> = { strategy: '策略', tool: '工具', product: '产品', event: '活动', learn: '学习' };

export function RecommendationPanel({ profile }: { profile: Profile }) {
  const recs = profile.recommendations ?? [];
  if (recs.length === 0) return null;
  return <section className="panel recommend-panel" aria-labelledby="recommend-title">
    <h2 id="recommend-title">根据这份画像，下一步可以试试</h2>
    <p className="muted">每张卡都写了它依据哪项判断。链接会在新窗口打开 PandaAI 或 QuantSkills 的页面。</p>
    <ol className="rec-list">{recs.map((r) => <li key={r.id} className={`rec-card rec-${r.type}`}>
      <div className="rec-heading"><span className="rec-type">{TYPE_NAMES[r.type]}</span><span className="rec-provider">{r.resource.provider}</span></div>
      <h3>{r.title}</h3>
      <p className="rec-resource"><strong>{r.resource.name}</strong> · {r.resource.desc}{r.resource.is_sample ? ' · 示例资源' : ''}</p>
      {r.resource.tags.length > 0 && <ul className="rec-tags">{r.resource.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p>{r.reason}</p>
      <details><summary>依据</summary><ul>{r.based_on.map((b) => <li key={b.dimension_id}><strong>{profile.dimensions.find((d) => d.id === b.dimension_id)?.name}</strong>：{b.judgement}{b.evidence.length > 0 && <>（{b.evidence.join('；')}）</>}</li>)}</ul></details>
      <a className="rec-link" href={r.next_step.url} target="_blank" rel="noreferrer">{r.next_step.label} ↗</a>
    </li>)}</ol>
    <p className="muted small-text">推荐只基于本局游戏行为，不构成投资建议。</p>
  </section>;
}
