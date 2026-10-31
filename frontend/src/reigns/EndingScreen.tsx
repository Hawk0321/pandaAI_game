// 结局页：结局 → 本局数字 → 交易人物卡 → 再来一局 → 引流卡。
// 人物卡层级沿用 docs/personas.md；引流规则见 referral.ts。人物卡是趣味表达，不是投资建议。
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { PERSONA_CARDS } from '../profile/persona';
import { inferPersona } from './engine';
import { buildReferrals, TAG_BY_PERSONA, TAG_PHRASE } from './referral';
import { STAT_KEYS, STAT_LABELS } from './types';
import type { GameState, PersonaId, StyleTally } from './types';

export interface EndingScreenProps {
  /** 已结束的对局（state.ending 非空）。 */
  readonly state: GameState;
  readonly onRestart: () => void;
}

const TYPE_LABEL = { strategy: '策略', tool: '工具', product: '产品' } as const;

/** “为什么是你”：用本局的标签次数和占比说话，不下定性结论。 */
export function whyLine(personaId: PersonaId, tally: StyleTally): string {
  const tag = TAG_BY_PERSONA[personaId];
  const n = tally[tag] ?? 0;
  const total = Object.values(tally).reduce((sum, x) => sum + x, 0);
  if (n === 0 || total === 0) return '这局里你的选择没有明显的偏向，所以更像是各种风格轮着来。';
  return `这局里你有 ${n} 次选择偏${TAG_PHRASE[tag]}，占全部带风格倾向选择的 ${Math.round((n / total) * 100)}%。`;
}

export function EndingScreen({ state, onRestart }: EndingScreenProps) {
  const { ending, stats, tally, turn } = state;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, []);

  const personaId = useMemo(() => inferPersona(tally), [tally]);
  const persona = PERSONA_CARDS[personaId];
  const referrals = useMemo(() => (ending ? buildReferrals(personaId, ending, stats, tally) : []), [personaId, ending, stats, tally]);
  if (!ending) return null;

  const cardStyle = { '--rg-persona': persona.palette.main, '--rg-persona-soft': persona.palette.soft } as CSSProperties;

  return (
    <div className="reigns-end">
      <section className="reigns-ending" aria-labelledby="reigns-end-title">
        <p className="reigns-ending-kicker">
          结局
          {ending.special && <span className="reigns-badge">隐藏结局</span>}
        </p>
        <h2 id="reigns-end-title" className="reigns-ending-title" ref={headingRef} tabIndex={-1}>{ending.title}</h2>
        <p className="reigns-ending-desc">{ending.description}</p>
      </section>

      <section className="reigns-summary" aria-label="本局数字">
        <p className="reigns-summary-turns">本局共 <strong>{turn}</strong> 个回合</p>
        <ul className="reigns-summary-stats">
          {STAT_KEYS.map((key) => (
            <li key={key} className="reigns-summary-stat">
              <span className="reigns-summary-name">{STAT_LABELS[key]}</span>
              <span className="reigns-summary-value">{stats[key]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="reigns-persona" style={cardStyle} aria-labelledby="reigns-persona-title">
        <div className="reigns-persona-top">
          <span className="reigns-fun-tag">趣味人物卡</span>
          <span className="reigns-archetype">{persona.archetype}</span>
        </div>
        <p className="reigns-persona-emoji" aria-hidden="true">{persona.emoji}</p>
        <h3 id="reigns-persona-title" className="reigns-persona-name">{persona.name}</h3>
        <p className="reigns-persona-tagline">{persona.tagline}</p>
        <ul className="reigns-traits" aria-label="特征标签">
          {persona.traits.map((t) => <li key={t} className="reigns-trait">{t}</li>)}
        </ul>
        <p className="reigns-why"><strong>为什么是你：</strong>{whyLine(personaId, tally)}</p>
        <div className="reigns-sides">
          <div className="reigns-side">
            <h4 className="reigns-side-title">你的长处</h4>
            <p>{persona.strength}</p>
          </div>
          <div className="reigns-side">
            <h4 className="reigns-side-title">需要留意</h4>
            <p>{persona.blind_spot}</p>
          </div>
        </div>
      </section>

      <button type="button" className="reigns-restart reigns-restart-wide" onClick={onRestart}>再来一局</button>

      <section className="reigns-refs" aria-labelledby="reigns-refs-title">
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
            </li>
          ))}
        </ul>
      </section>

      <p className="reigns-footnote">本游戏为趣味人物卡，推荐只基于这一局的选择，不构成投资建议。卡牌内容为虚构示例。</p>
    </div>
  );
}
