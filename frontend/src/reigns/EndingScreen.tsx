// 结局页：结局（插图位 + 标题）→ 存活关数 → 本局摘要 → 动态人物卡 → 再来一局 → 引流卡 → 页脚，另有可折叠的“结局图鉴”。
// 人物卡层级沿用 docs/personas.md（见 PersonaReveal）；引流规则见 referral.ts。人物卡是趣味表达，不是投资建议。
import { useEffect, useMemo, useRef } from 'react';
import { resolvePersona } from './engine';
import { ALL_CARDS } from './allCards';
import { ENDING_THRESHOLDS, getEndings } from './endings';
import { audio } from './audio/audioManager';
import { PersonaReveal } from './PersonaReveal';
import { buildEncounterReferral, buildReferrals } from './referral';
import { PersonaComment } from './PersonaComment';
import { ROLES } from './roles';
import { endingArtwork, survivalBadge } from './endingArt';
import { SURVIVAL_TIERS, recordBest, survivalBlurb, survivalProgress, survivalTier } from './survival';
import type { BestRecord } from './survival';
import { OVERTIME_START, STAT_KEYS } from './types';
import type { Ending, GameState, RoleId, StatKey } from './types';
import type { CSSProperties } from 'react';

export interface EndingScreenProps {
  /** 已结束的对局（state.ending 非空）。 */
  readonly state: GameState;
  /** 回到选角页。 */
  readonly onRestart: () => void;
  /** 同一角色再来一次。 */
  readonly onReplay: () => void;
}

/** 人格卡翻出（对应 rise(0.2) 淡入之后）与结局曲进入的延迟（毫秒）。 */
const PERSONA_FLIP_MS = 700;
const ENDING_BGM_MS = 1100;

const TYPE_LABEL = { strategy: '策略', tool: '工具', product: '产品', encounter: '本局遇到' } as const;

/** 分段淡入：delay 为秒，减少动态效果时由样式直接关闭动画。 */
const rise = (delay: number): CSSProperties => ({ '--rg-delay': `${delay}s` } as CSSProperties);

/**
 * 数值的文字提示，不只靠颜色：0 / 100 是触底 / 爆满，其余两端是偏低 / 偏高。
 * 阈值与 endings.ts 的 ENDING_THRESHOLDS 对齐：风控的“偏低”按 riskLow（25）算，
 * 否则“保证金薄如蝉翼”这类结局旁边，风控 22 却没有任何提示，数字和结局对不上。
 */
function extremeLabel(key: StatKey, value: number): string | null {
  const lowEdge = key === 'risk' ? ENDING_THRESHOLDS.riskLow : ENDING_THRESHOLDS.low;
  if (value <= 0) return '触底';
  if (value >= 100) return '爆满';
  if (value <= lowEdge) return '偏低';
  if (value >= ENDING_THRESHOLDS.high) return '偏高';
  return null;
}

/**
 * 本条数值的最终提示。普通结局对应的那一条一定和结局同向（low 触底 / high 爆满）；
 * 中途特殊结局和存活结局是在没有任何一条到 0 / 100 时判定的（endings.ts 先查普通结局），
 * 所以这两类结局的页面上不会出现“触底 / 爆满”。
 */
function statFlag(key: StatKey, value: number, ending: Ending): string | null {
  if (ending.stat === key && (ending.kind === 'low' || ending.kind === 'high')) {
    return ending.kind === 'low' ? '触底' : '爆满';
  }
  return extremeLabel(key, value);
}

/**
 * 本局的最佳纪录只记一次：GameState 不可变、每局都是新对象，所以用它做键，
 * StrictMode 重复渲染也拿到同一个结果，不会把“新纪录”算没了。存储不可用时为 null。
 */
const bestCache = new WeakMap<GameState, BestRecord | null>();
function bestFor(state: GameState): BestRecord | null {
  if (!bestCache.has(state)) bestCache.set(state, recordBest(state.role, state.turn));
  return bestCache.get(state) ?? null;
}

interface SurvivalPanelProps {
  readonly turn: number;
  readonly role: RoleId;
  readonly best: BestRecord | null;
}

/** “活了 N 关”：超大数字 + 段位 + 文案 + 以 40 为满的进度条（加时段另色）+ 本机最佳。 */
function SurvivalPanel({ turn, role, best }: SurvivalPanelProps) {
  const tier = survivalTier(turn);
  const blurb = survivalBlurb(tier, role);
  const progress = survivalProgress(turn);
  const badge = survivalBadge(tier.id);
  const meterText = progress.overtime > 0
    ? `常规 ${OVERTIME_START} 关已走满，加时 +${progress.overtime} 关`
    : `${progress.regular} / ${OVERTIME_START} 关`;
  return (
    <section className={`reigns-survival reigns-survival-${tier.id} reigns-rise`} style={rise(0.05)} aria-labelledby="reigns-survival-count">
      <div className="reigns-survival-head">
        {badge && <img className="reigns-survival-badge" src={badge} alt="" width="56" height="56" />}
        <h3 id="reigns-survival-count" className="reigns-survival-count" aria-label={`这一局活了 ${turn} 关`}>
          <span className="reigns-survival-unit">活了</span>
          <strong className="reigns-survival-num">{turn}</strong>
          <span className="reigns-survival-unit">关</span>
        </h3>
      </div>
      <p className="reigns-survival-tier" aria-label={`段位：${tier.name}，第 ${tier.level} 段，共 ${SURVIVAL_TIERS.length} 段`}>
        <span className="reigns-survival-level" aria-hidden="true">第 {tier.level}/{SURVIVAL_TIERS.length} 段</span>
        <span className="reigns-survival-name">{tier.name}</span>
      </p>
      <p className="reigns-survival-blurb">{blurb}</p>
      <div
        className="reigns-survival-meter"
        role="meter"
        aria-label="存活进度"
        aria-valuemin={0}
        aria-valuemax={OVERTIME_START}
        aria-valuenow={progress.regular}
        aria-valuetext={meterText}
      >
        <span className="reigns-survival-regular" style={{ width: `${progress.regularPct}%` }} />
        {progress.overtime > 0 && <span className="reigns-survival-overtime" style={{ width: `${progress.overtimePct}%` }} />}
      </div>
      <p className="reigns-survival-scale" aria-hidden="true">
        <span>0</span>
        <span>{OVERTIME_START} 关</span>
        {progress.overtime > 0 && <span className="reigns-survival-ot-label">加时 +{progress.overtime} 关</span>}
      </p>
      {best && (
        <p className="reigns-survival-best">
          {best.isNew && <span className="reigns-survival-new">新纪录</span>}
          <span>本机最佳 <strong>{best.best}</strong> 关</span>
          {best.isNew && best.previous !== null && <span className="reigns-survival-prev">（之前 {best.previous} 关）</span>}
        </p>
      )}
    </section>
  );
}

export function EndingScreen({ state, onRestart, onReplay }: EndingScreenProps) {
  const { ending, stats, tally, turn, role } = state;
  const roleDef = ROLES[role];
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, []);

  // 结局音频：先让触底/爆满音效单独响一下（父组件已停掉游戏音乐），再翻人格卡，最后换结局曲。
  // 曲目或音效缺失时 audioManager 会自己静默跳过 / 沿用 bgm-select。
  const hasEnding = ending !== null;
  useEffect(() => {
    if (!hasEnding) return undefined;
    const flip = window.setTimeout(() => audio.playSfx('sfx-persona-flip'), PERSONA_FLIP_MS);
    const bgm = window.setTimeout(() => audio.playBgm('bgm-ending-idle'), ENDING_BGM_MS);
    return () => { window.clearTimeout(flip); window.clearTimeout(bgm); };
  }, [hasEnding]);

  // 引流卡和人物卡用同一个最终人格，文案里的次数才不会和人物卡打架。
  const personaId = useMemo(() => (ending ? resolvePersona(state, ALL_CARDS).id : null), [state, ending]);
  const referrals = useMemo(() => {
    if (!ending || !personaId) return [];
    const base = buildReferrals(personaId, ending, stats, tally, role);
    // 第 4 张：本局遇到过 PandaAI 事件才出现，推荐事件里点名的产品。
    const encounter = buildEncounterReferral(state.log, ALL_CARDS, new Set(base.map((r) => r.resource.url)), role);
    return encounter ? [...base, encounter] : base;
  }, [personaId, ending, stats, tally, role, state.log]);
  const codex = useMemo(() => getEndings(role), [role]);
  const best = useMemo(() => (ending ? bestFor(state) : null), [state, ending]);
  if (!ending) return null;
  const artwork = endingArtwork(ending.id, role);

  return (
    <div className="reigns-end">
      <section className={`reigns-ending reigns-rise${ending.special ? ' reigns-ending-special' : ''}`} style={rise(0)} aria-labelledby="reigns-end-title">
        {artwork && <img className="reigns-ending-art" src={artwork} alt={ending.title} />}
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

      <SurvivalPanel turn={turn} role={role} best={best} />

      <section className="reigns-summary reigns-rise" style={rise(0.1)} aria-label="本局数字">
        <p className="reigns-summary-turns">最终四项数值</p>
        <ul className="reigns-summary-stats">
          {STAT_KEYS.map((key) => {
            const value = stats[key];
            const flag = statFlag(key, value, ending);
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
        <PersonaReveal state={state} />
      </div>
      <PersonaComment state={state} />

      <div className="reigns-again reigns-rise" style={rise(0.3)}>
        <button type="button" className="reigns-restart reigns-restart-wide" onClick={() => { audio.playSfx('sfx-restart'); onRestart(); }}>再来一局</button>
        <button type="button" className="reigns-again-same" onClick={() => { audio.playSfx('sfx-btn-click'); onReplay(); }}>同一角色再来一次（{roleDef.name}）</button>
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
