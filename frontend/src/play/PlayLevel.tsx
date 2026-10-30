import { useEffect, useRef } from 'react';
import type { PlayLevelProps } from '../shared/protocol';
import { MarketChart } from '../shell/MarketChart';

export function PlayLevel({ level, isSupplementary, emit }: PlayLevelProps): JSX.Element {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    emit('level_start', { budget: level.budget, is_supplementary: isSupplementary });
  }, [level.budget, isSupplementary, emit]);
  return <section aria-label="对局玩法">
    <p>{isSupplementary ? '补充关卡：再看看你' : level.id} · 研究点 {level.budget}</p>
    <h2>{level.masked_name}</h2>
    {level.is_sample && <p>模拟行情示例</p>}
    <MarketChart bars={level.bars} />
    <p>先看走势，再用有限的研究点选择线索。</p>
    {level.clues.map(clue => <button key={clue.id} disabled>{clue.title} · {clue.cost} 点</button>)}
  </section>;
}
