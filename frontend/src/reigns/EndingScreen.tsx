// 结局页：结局 → 本局摘要 → 动态人物卡 → 再来一局 → 引流卡 → 页脚，另有可折叠的“结局图鉴”。
// 人物卡层级沿用 docs/personas.md（见 PersonaReveal）；引流规则见 referral.ts。人物卡是趣味表达，不是投资建议。
import { useEffect, useMemo, useRef } from 'react';
import { inferPersona, getEndings } from './engine';
import { PersonaReveal } from './PersonaReveal';
import { buildReferrals } from './referral';
import { ROLES } from './roles';
import { STAT_KEYS } from './types';
import type { GameState } from './types';
import type { CSSProperties } from 'react';

export interface EndingScreenProps {
  /** 已结束的对局（state.ending 非空）。 */
  readonly state: GameState;
  /** 回到选角页。 */
  readonly onRestart: () => void;
  /** 同一角色再来一次。 */
  readonly onReplay: () => void;
}

const TYPE_LABEL = { strategy: '策略', tool: '工具', product: '产品' } as const;

/** 分段淡入：delay 为秒，减少动态效果时由样式直接关闭动画。 */
const rise = (delay: number): CSSProperties => ({ '--rg-delay': `${delay}s` } as CSSProperties);

/** 数值的文字提示，不只靠颜色：0 / 100 是触底 / 爆满，其余两端是偏低 / 偏高。 */
function extremeLabel(value: number): string | null {
  if (value <= 0) return '触底';
  if (value >= 100) return '爆满';
  if (value <= 20) return '偏低';
  if (value >= 80) return '偏高';
  return null;
}

export function EndingScreen({ state, onRestart, onReplay }: EndingScreenProps) {
  const { ending, stats, tally, turn, role } = state;
  const roleDef = ROLES[role];
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, []);

  const personaId = useMemo(() => inferPersona(tally), [tally]);
  const referrals = useMemo(() => (ending ? buildReferrals(personaId, ending, stats, tally, role) : []), [personaId, ending, stats, tally, role]);
  const codex = useMemo(() => getEndings(role), [role]);
  if (!ending) return null;

  return (
    <div className="reigns-end">
      <section className={`reigns-ending reigns-rise${ending.special ? ' reigns-ending-special' : ''}`} style={rise(0)} aria-labelledby="reigns-end-title">
        <p className="reigns-ending-kicker">
          {ending.special ? (
            <>
              <span className="reigns-badge"><span aria-hidden="true">✦ </span>隐藏结局</span>
              <span className="reigns-ending-role">{roleDef.name}</span>
            </>
          ) : `${roleDef.name} · 结局`}
        </p>
        <h2 id="reigns-end-title" className="reigns-ending-title" ref={headingRef} tabIndex={-1}>{ending.title}</h2>
        <p className="reigns-ending-desc">{ending.description}</p>
      </section>

      <section className="reigns-summary reigns-rise" style={rise(0.1)} aria-label="本局数字">
        <p className="reigns-summary-turns">本局共 <strong>{turn}</strong> 个回合 · 四项数值</p>
        <ul className="reigns-summary-stats">
          {STAT_KEYS.map((key) => {
            const value = stats[key];
            const flag = extremeLabel(value);
            return (
              <li key={key} className="reigns-summary-stat">
                <span className="reigns-summary-row">
                  <span className="reigns-summary-name">{roleDef.stats[key].label}</span>
                  <span className="reigns-summary-value">
                    {flag && <span className="reigns-summary-flag">{flag}</span>}
                    {value}
                  </span>
                </span>
                <span className="reigns-summary-bar" aria-hidden="true">
                  <span className={`reigns-summary-fill${flag ? ' reigns-summary-fill-edge' : ''}`} style={{ width: `${value}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="reigns-rise" style={rise(0.2)}>
        <PersonaReveal tally={tally} />
      </div>

      <div className="reigns-again reigns-rise" style={rise(0.3)}>
        <button type="button" className="reigns-restart reigns-restart-wide" onClick={onRestart}>再来一局</button>
        <button type="button" className="reigns-again-same" onClick={onReplay}>同一角色再来一次（{roleDef.name}）</button>
      </div>

      <section className="reigns-refs reigns-rise" style={rise(0.4)} aria-labelledby="reigns-refs-title">
        <h3 id="reigns-refs-title" className="reigns-refs-title">想把这局的发现用起来</h3>
        <ul className="reigns-ref-list">
          {referrals.map((r) => (
            <li key={r.type} className="reigns-ref">
              <div className="reigns-ref-head">
                <span className="reigns-ref-type">{TYPE_LABEL[r.type]}</span>
                <span className="reigns-ref-provider">{r.resource.provider}</span>
              </div>
              <h4 className="reigns-ref-name">{r.title}</h4>
              <p className="reigns-ref-reason">{r.reason}</p>
              <div className="reigns-ref-foot">
                <p className="reigns-ref-desc">{r.resource.name}：{r.resource.desc}</p>
                <a
                  className="reigns-ref-cta"
                  href={r.resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${r.cta}（${r.resource.name}，在新窗口打开）`}
                >
                  {r.cta} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <details className="reigns-codex">
        <summary className="reigns-codex-summary">{roleDef.name}结局图鉴（共 {codex.length} 个，点开看看）</summary>
        <ul className="reigns-codex-list">
          {codex.map((e) => {
            const reached = e.id === ending.id;
            return (
              <li key={e.id} className={`reigns-codex-item${reached ? ' reigns-codex-reached' : ''}`} aria-current={reached ? 'true' : undefined}>
                <span className="reigns-codex-title">
                  {reached ? e.title : '？？？'}
                  {e.special && <span className="reigns-codex-tag">隐藏</span>}
                </span>
                {reached && <span className="reigns-codex-now">本局达成</span>}
                {!reached && <span className="reigns-codex-lock">未达成</span>}
              </li>
            );
          })}
        </ul>
        <p className="reigns-codex-note">只记录这一局，未达成的结局不剧透，多换几种选法试试。</p>
      </details>

      <p className="reigns-footnote">本游戏为趣味人物卡，推荐只基于这一局的选择，不构成投资建议。卡牌内容为虚构示例。</p>
    </div>
  );
}
