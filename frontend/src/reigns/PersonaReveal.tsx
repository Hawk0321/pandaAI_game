// 交易人格卡：所有角色的结局页都展示。层级沿用 docs/personas.md：
// 趣味人物卡角标 → archetype → 插画/emoji + 名称 → tagline → traits → 为什么是你 → 长处 / 需要留意。
// 动态插画来自 shell 模块的 PersonaArt（静态 webp + WebGL 着色器做呼吸/摇摆/光点；
// prefers-reduced-motion 或 WebGL 不可用时它会自己回退成静态图）。人物卡是趣味表达，不是投资建议。
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { PERSONA_CARDS } from '../profile/persona';
import { PersonaArt } from '../shell/PersonaArt';
import { PERSONA_ARTWORKS } from '../shell/personaArtwork';
import '../shell/persona-card.css';
import { inferPersona } from './engine';
import { TAG_BY_PERSONA, TAG_PHRASE } from './referral';
import type { PersonaId, StyleTally } from './types';

/** “为什么是你”：用本局的标签次数和占比说话，不下定性结论。 */
export function whyLine(personaId: PersonaId, tally: StyleTally): string {
  const tag = TAG_BY_PERSONA[personaId];
  const n = tally[tag] ?? 0;
  const total = Object.values(tally).reduce((sum, x) => sum + x, 0);
  if (n === 0 || total === 0) return '这局里你的选择没有明显的偏向，所以更像是各种风格轮着来。';
  return `这局里你有 ${n} 次选择偏${TAG_PHRASE[tag]}，占全部带风格倾向选择的 ${Math.round((n / total) * 100)}%。`;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** 跟随系统“减少动态效果”设置。 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(REDUCED_QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export interface PersonaRevealProps {
  /** 本局风格标签累计，用来推断人物卡。 */
  readonly tally: StyleTally;
}

export function PersonaReveal({ tally }: PersonaRevealProps) {
  const personaId = useMemo(() => inferPersona(tally), [tally]);
  const persona = PERSONA_CARDS[personaId];
  const artwork = PERSONA_ARTWORKS.find((item) => item.id === personaId);
  const reducedMotion = useReducedMotion();
  const [motionRequested, setMotionRequested] = useState(true);
  const motionEnabled = motionRequested && !reducedMotion;

  // 主色：优先用插画的 accent（和动态卡一致），没有插画时用人物卡 palette。
  const accent = artwork?.accent ?? persona.palette.main;
  const style = { '--rg-persona': accent, '--rg-persona-soft': persona.palette.soft } as CSSProperties;
  const toggleLabel = reducedMotion ? '动态已关闭（系统设置）' : motionEnabled ? '暂停动态' : '播放动态';

  return (
    <section className="reigns-persona" style={style} aria-labelledby="reigns-persona-title">
      <div className="reigns-persona-top">
        <span className="reigns-fun-tag">趣味人物卡</span>
        <span className="reigns-archetype">{persona.archetype}</span>
      </div>

      {artwork ? (
        <div className="reigns-persona-art">
          <PersonaArt artwork={artwork} alt={`${persona.name}角色插画`} active={motionEnabled} className="persona-card-art" />
        </div>
      ) : (
        <p className="reigns-persona-emoji" aria-hidden="true">{persona.emoji}</p>
      )}
      <h3 id="reigns-persona-title" className="reigns-persona-name">
        {artwork && <span aria-hidden="true">{persona.emoji} </span>}{persona.name}
      </h3>
      <p className="reigns-persona-tagline">{persona.tagline}</p>
      <ul className="reigns-traits" aria-label="特征标签">
        {persona.traits.map((t) => <li key={t} className="reigns-trait">{t}</li>)}
      </ul>
      <p className="reigns-why"><strong>为什么是你：</strong>{whyLine(personaId, tally)}</p>
      <details className="reigns-sides">
        <summary className="reigns-sides-summary">看看长处和需要留意的地方</summary>
        <div className="reigns-sides-body">
          <div className="reigns-side">
            <h4 className="reigns-side-title">你的长处</h4>
            <p>{persona.strength}</p>
          </div>
          <div className="reigns-side">
            <h4 className="reigns-side-title">需要留意</h4>
            <p>{persona.blind_spot}</p>
          </div>
        </div>
      </details>
      {artwork && (
        <button type="button" className="reigns-motion-toggle" aria-pressed={motionEnabled} disabled={reducedMotion} onClick={() => setMotionRequested((v) => !v)}>
          {toggleLabel}
        </button>
      )}
    </section>
  );
}
