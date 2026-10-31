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
import { ALL_CARDS } from './allCards';
import { resolvePersona } from './engine';
import { COMPATIBLE_PERSONAS } from './personaRules';
import { buildEvidenceChips, buildWhyLine } from './personaCopy';
import type { GameState } from './types';

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
  /** 已结束的对局（state.ending 非空）；人格由 resolvePersona 结合结局给出。 */
  readonly state: GameState;
}

export function PersonaReveal({ state }: PersonaRevealProps) {
  const resolved = useMemo(() => resolvePersona(state, ALL_CARDS), [state]);
  const personaId = resolved.id;
  const persona = PERSONA_CARDS[personaId];
  const endingTitle = state.ending?.title ?? '';
  const compatIds = useMemo(() => COMPATIBLE_PERSONAS(state.ending!.id), [state.ending]);
  const whyText = useMemo(
    () => buildWhyLine(resolved, persona.name, endingTitle, state.role, compatIds),
    [resolved, persona.name, endingTitle, state.role, compatIds],
  );
  const chips = useMemo(() => buildEvidenceChips(resolved), [resolved]);
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
      <p className="reigns-why"><strong>为什么是你：</strong>{whyText}</p>
      <ul className="reigns-behavior-evidence" aria-label="本局选择轨迹">
        {resolved.behavior.evidence.map((item) => <li key={item}>{item}</li>)}
      </ul>
      {chips.length > 0 && (
        <ul className="reigns-chips" aria-label="依据">
          {chips.map((chip) => <li key={chip.kind} className={`reigns-chip reigns-chip-${chip.kind}`}>{chip.label}</li>)}
        </ul>
      )}
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
