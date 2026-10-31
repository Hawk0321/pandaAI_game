import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Profile } from '../shared/protocol';
import { PERSONA_ARTWORKS, resolvePersonaArtwork } from './personaArtwork';
import type { PersonaArtwork } from './personaArtwork';
import { savePersonaCard } from './savePersonaCard';
import './persona-card.css';

const confidenceNames = { low: '低置信度', medium: '中置信度', high: '高置信度' };

function PersonaGallery({ currentName }: { currentName: string }) {
  const [selected, setSelected] = useState<PersonaArtwork | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  return <section className="persona-gallery" aria-labelledby="persona-gallery-title">
    <div className="persona-gallery-heading"><h2 id="persona-gallery-title">交易人格图鉴</h2><p>看看别的角色，预览不会改变本局画像。</p></div>
    <div className="persona-gallery-strip" aria-label="八种交易人格插画">
      {PERSONA_ARTWORKS.map(artwork => <button type="button" className="persona-gallery-item" key={artwork.id} onClick={() => setSelected(artwork)} aria-label={`预览${artwork.name}插画`}>
        <span className="persona-gallery-image"><img src={artwork.thumbnail} alt="" width="200" height="200" loading="lazy" decoding="async" /></span>
        <span>{artwork.name}</span><small>{currentName === artwork.name ? '本局角色' : `图鉴 ${artwork.number}`}</small>
      </button>)}
    </div>
    <dialog className="persona-gallery-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      {selected && <div className="persona-preview-content" style={{ '--persona-accent': selected.accent } as CSSProperties}>
        <div className="persona-preview-top"><span>图鉴 {selected.number} · 插画预览</span><button type="button" className="persona-close-preview" onClick={() => setSelected(null)}>关闭</button></div>
        <img src={selected.image} alt={`${selected.name}角色插画`} width="1024" height="1024" decoding="async" />
        <h2 id={titleId}>{selected.name}</h2><p>这是角色图鉴预览，不是你的本局画像。</p>
      </div>}
    </dialog>
  </section>;
}

export function PersonaCard({ profile }: { profile: Profile }) {
  const { artwork, matched } = resolvePersonaArtwork(profile.persona.name);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const flipButton = useRef<HTMLButtonElement>(null);
  const cardId = useId();
  const abilities = profile.dimensions.filter(dimension => dimension.group === 'ability');
  const preferences = profile.dimensions.filter(dimension => dimension.group === 'preference');

  useEffect(() => { setFlipped(false); setSaveStatus(''); }, [profile.session_id, profile.round, profile.persona.name]);

  function turnCard(back: boolean) {
    setFlipped(back);
    // Keep focus outside the card face that is about to become aria-hidden.
    flipButton.current?.focus();
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveStatus('');
    try {
      await savePersonaCard(profile.persona, artwork, matched);
      setSaveStatus('人物卡图片已生成，请在浏览器下载中查看。');
    } catch (cause) { setSaveStatus(cause instanceof Error ? cause.message : '暂时无法保存人物卡，请稍后重试。'); }
    finally { setSaving(false); }
  }

  return <section className="persona-reveal" aria-labelledby="persona-name" style={{ '--persona-accent': artwork.accent } as CSSProperties}>
    <div className="persona-reveal-stage">
      <div className="persona-card-column">
        <div className={`persona-trading-card${flipped ? ' is-flipped' : ''}`} id={cardId}>
          <div className="persona-card-rotor">
            <article className="persona-card-face persona-card-front" aria-hidden={flipped}>
              <div className="persona-card-topline"><span>PANDAAI</span><span>{matched ? `图鉴 ${artwork.number}` : '通用插画'}</span></div>
              <button type="button" className="persona-art-turn" onClick={() => turnCard(true)} tabIndex={flipped ? -1 : 0} aria-label={`翻到${profile.persona.name}人物卡背面`}>
                <img className="persona-card-art" src={artwork.image} alt={matched ? `${profile.persona.name}角色插画` : '通用交易角色插画'} width="1024" height="1024" decoding="async" />
                <span className="persona-art-turn-hint">点击插画翻面 ↗</span>
              </button>
              <div className="persona-card-title"><p>本局交易人格</p><h2 id="persona-name">{profile.persona.name}</h2><p className="persona-card-tagline">{profile.persona.tagline}</p></div>
              <div className="persona-card-seal"><span>趣味人物卡</span><span>{profile.round === 2 ? '补充观察后' : '本局观察'}</span></div>
            </article>
            <article className="persona-card-face persona-card-back" aria-hidden={!flipped}>
              <div className="persona-card-topline"><span>观察档案</span><span>{matched ? `图鉴 ${artwork.number}` : '趣味人物卡'}</span></div>
              <div className="persona-card-back-content" tabIndex={flipped ? 0 : -1}><p className="persona-card-back-kicker">{profile.persona.name}</p><h3>这张卡背后的你</h3><p className="persona-back-summary">{profile.summary}</p>
                {preferences.length > 0 && <div className="persona-back-traits">{preferences.map(dimension => <div key={dimension.id}><span>{dimension.name}</span><p>{dimension.judgement}</p><small className={`confidence-${dimension.confidence}`}>{confidenceNames[dimension.confidence]}</small></div>)}</div>}
              </div>
              <button type="button" className="persona-back-return" onClick={() => turnCard(false)} tabIndex={flipped ? 0 : -1}>返回人物卡正面 ↶</button>
              <p className="persona-card-footnote">趣味标签来自本局观察，不代表真实交易能力。</p>
            </article>
          </div>
        </div>
        <div className="persona-card-controls"><button ref={flipButton} type="button" className="persona-flip-button" aria-pressed={flipped} aria-controls={cardId} onClick={() => setFlipped(value => !value)}>{flipped ? '翻回正面' : '翻面看画像'}</button><button type="button" className="persona-save-button" disabled={saving} onClick={() => void save()}>{saving ? '正在制作…' : '保存人物卡图片'}</button></div>
        <p className="persona-save-status" role="status" aria-live="polite">{saveStatus || '保存图片只含人物卡，不含私密行为记录。'}</p>
      </div>
      <aside className="persona-card-readout" aria-labelledby="persona-readout-title"><p className="persona-readout-kicker">选择留下的线索</p><h2 id="persona-readout-title">角色有个性，<br />判断有依据。</h2><p>这是本局的能力观察。翻到卡背看概览，往下查看具体证据。</p>
        <dl className="persona-attribute-list">{abilities.map(dimension => <div key={dimension.id}><dt>{dimension.name}<span className={`confidence confidence-${dimension.confidence}`}>{confidenceNames[dimension.confidence]}</span></dt><dd><span className={`persona-attribute-track${dimension.score === null ? ' is-unknown' : ''}`} aria-hidden="true"><i style={{ width: `${dimension.score === null ? 0 : Math.max(0, Math.min(1, dimension.score)) * 100}%` }} /></span><strong>{dimension.score === null ? '待观察' : `${Math.round(dimension.score * 100)}%`}</strong></dd></div>)}</dl>
        <p className="persona-readout-note">数字来自画像维度，不是角色等级或收益排名。</p>
      </aside>
    </div>
    <PersonaGallery currentName={profile.persona.name} />
  </section>;
}
