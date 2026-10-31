import { useId, useState } from 'react';
import type { Bar, Clue } from '../shared/protocol';
import { buildDigest } from './digest';

/**
 * 综合解读卡：点开后把已翻开的线索和可见走势整理成一段话。
 * 不花研究点、不发事件、不进画像；每次点开都按当下翻开的线索重新整理。
 * 这是规则整理，不是大模型，界面上不叫 AI。
 */
export function DigestCard({ bars, clues, opened, budget }: { bars: Bar[]; clues: Clue[]; opened: string[]; budget: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const digest = open ? buildDigest({ bars, clues, opened, budget }) : null;
  return <section className="digest-card" data-open={open || undefined}>
    <button type="button" className="digest-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <span className="digest-icon" aria-hidden="true">✦</span>
      <span className="digest-title"><strong>帮我捋一捋</strong><small>{open ? '收起整理' : '把已看到的信息整理成人话（不花点数）'}</small></span>
      <span className="digest-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    <div id={panelId} role="region" aria-label="综合解读" hidden={!open}>
      {digest && <div className="digest-body">
        <p className="digest-headline">{digest.headline}</p>
        {digest.reads.length > 0 && <ul className="digest-reads">{digest.reads.map(read => <li key={read.id}>
          <em className={`clue-lean lean-${read.lean}`}>{read.lean === 'up' ? '▲ ' : read.lean === 'down' ? '▼ ' : '– '}{read.leanText}</em>
          <span><b>{read.name}</b>：{read.verdict}</span>
        </li>)}</ul>}
        <div className="digest-facts"><h4>走势本身</h4><ul>{digest.facts.map(fact => <li key={fact}>{fact}</li>)}</ul></div>
        {digest.missing.length > 0 && <div className="digest-missing"><h4>还没看的</h4><ul>{digest.missing.map(item => <li key={item.id}><b>{item.name}</b>（{item.cost} 点）{item.teaser ? `：${item.teaser}` : ''}</li>)}</ul></div>}
        {digest.wrapUp && <p className="digest-wrap">{digest.wrapUp}</p>}
        <p className="digest-note">{digest.note}</p>
      </div>}
    </div>
  </section>;
}
