import { useEffect, useMemo, useState } from 'react';
import { PERSONA_CARDS } from '../profile/persona';
import { resolvePersona } from './engine';
import { ALL_CARDS } from './allCards';
import type { BehaviorAnalysis, GameState } from './types';

interface CommentResult { comment: string; method: 'rules' | 'rules+llm'; model?: string }

function ruleComment(persona: string, ending: string, behavior: BehaviorAnalysis): string {
  return `你的选择留下了“${persona}”的轨迹，最终以“${ending}”收尾。${behavior.evidence[0]}。下次复盘时，先挑一个最常出现的动作，看看它是否仍符合你的原计划。`;
}

export function PersonaComment({ state }: { state: GameState }) {
  const resolved = useMemo(() => resolvePersona(state, ALL_CARDS), [state]);
  const fallback = ruleComment(PERSONA_CARDS[resolved.id].name, state.ending!.title, resolved.behavior);
  const [result, setResult] = useState<CommentResult>({ comment: fallback, method: 'rules' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const payload = {
      role: state.role, persona: resolved.id, personaName: PERSONA_CARDS[resolved.id].name,
      endingTitle: state.ending!.title, stats: state.stats, behavior: resolved.behavior,
      evidence: resolved.behavior.evidence.slice(0, 2),
    };
    setLoading(true);
    fetch('/api/persona-comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Narration unavailable'); return response.json() as Promise<CommentResult>; })
      .then((data) => { if (typeof data.comment === 'string' && [...data.comment].length <= 180) setResult(data); })
      .catch((error: unknown) => { if (error instanceof Error && error.name !== 'AbortError') setResult({ comment: fallback, method: 'rules' }); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [state, resolved, fallback]);

  return (
    <section className="reigns-ai-comment reigns-rise" aria-labelledby="reigns-ai-title">
      <p className="reigns-ai-kicker" id="reigns-ai-title">PANDA AI · 本局复盘 <span>{loading ? '正在阅读你的选择…' : result.method === 'rules+llm' ? 'AI 已生成' : '规则版'}</span></p>
      <p className="reigns-ai-text">{result.comment}</p>
      <p className="reigns-ai-note">AI 基于本局选择生成，仅供娱乐复盘，不构成投资建议。</p>
    </section>
  );
}
