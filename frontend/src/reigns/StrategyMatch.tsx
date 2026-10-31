import { useMemo, useState } from 'react';
import { qubeChatLink, strategyFor } from './strategyMatch';
import { resolvePersona } from './engine';
import { ALL_CARDS } from './allCards';
import { PERSONA_CARDS } from '../profile/persona';
import type { GameState } from './types';

export function StrategyMatch({ state }: { state: GameState }) {
  const resolved = useMemo(() => resolvePersona(state, ALL_CARDS), [state]);
  const strategy = strategyFor(resolved.id);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(strategy.prompt); setCopied(true); }
    catch { setCopied(false); }
  };
  return (
    <section className="reigns-strategy reigns-rise" aria-labelledby="reigns-strategy-title">
      <p className="reigns-strategy-kicker">AI 复盘后的下一步</p>
      <h3 id="reigns-strategy-title">把{PERSONA_CARDS[resolved.id].name}的思路，变成可回测的策略</h3>
      <p className="reigns-strategy-name">{strategy.title}</p>
      <p className="reigns-strategy-reason">{strategy.reason}</p>
      <details className="reigns-strategy-prompt"><summary>查看专属策略提示词</summary><p>{strategy.prompt}</p></details>
      <div className="reigns-strategy-actions">
        <a href={qubeChatLink(resolved.id)} target="_blank" rel="noopener noreferrer" className="reigns-strategy-cta">去 Qube 试这个思路 ↗</a>
        <button type="button" onClick={copy}>{copied ? '提示词已复制' : '复制提示词'}</button>
      </div>
      <p className="reigns-strategy-note">跳转会预填提示词，确认后由 Qube 生成回测；历史回测不代表未来表现。</p>
    </section>
  );
}
