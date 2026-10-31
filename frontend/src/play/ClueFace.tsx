import type { Clue } from '../shared/protocol';
import { clueView } from './clueView';
import type { ClueView } from './clueView';

/** 线索卡背面：一句人话结论 + 方向标 + 小图；认不出的线索退回显示原文。原始数字始终保留在底部小字。 */
function MiniChart({ view }: { view: ClueView }) {
  const chart = view.chart;
  if (!chart) return null;
  if (chart.kind === 'line') {
    const n = chart.values.length;
    const points = chart.values.map((v, i) => `${(i / (n - 1)) * 100},${26 - v * 22}`).join(' ');
    return <svg className="clue-chart" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /></svg>;
  }
  if (chart.kind === 'bars') {
    const n = chart.values.length;
    return <svg className="clue-chart" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">{chart.values.map((v, i) => {
      const h = 3 + v * 24;
      return <rect key={i} x={(i / n) * 100 + 0.6} y={28 - h} width={100 / n - 1.2} height={h} className={i >= n - 3 ? 'is-recent' : ''} />;
    })}</svg>;
  }
  if (chart.kind === 'meter') {
    return <span className="clue-meter" aria-hidden="true"><span className="clue-meter-track"><i style={{ width: `${Math.round(chart.value * 100)}%` }} /><b /></span><small>{chart.label}</small></span>;
  }
  return <span className="clue-meter" aria-hidden="true"><span className="clue-meter-track clue-range"><i style={{ left: `${Math.round(chart.position * 100)}%` }} /></span><small>{chart.label}</small></span>;
}

export function ClueBack({ clue }: { clue: Clue }) {
  const view = clueView(clue);
  if (!view) return <><strong>{clue.title} · {clue.cost} 点</strong><span>{clue.text}</span></>;
  return <>
    <span className="clue-head"><strong>{view.name}</strong><em className={`clue-lean lean-${view.lean}`}>{view.lean === 'up' ? '▲ ' : view.lean === 'down' ? '▼ ' : '– '}{view.leanText}</em></span>
    <span className="clue-verdict">{view.verdict}</span>
    <MiniChart view={view} />
    {view.caveat && <span className="clue-caveat">{view.caveat}</span>}
    <span className="clue-raw">原始数据：{clue.text}</span>
  </>;
}
