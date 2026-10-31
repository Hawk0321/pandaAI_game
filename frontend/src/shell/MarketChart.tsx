import { useId } from 'react';
import type { Bar } from '../shared/protocol';

interface MarketChartProps {
  bars: Bar[];
  decisionT?: number;
  /** 可选：只把前 visibleCount 根画成可见，其余加 candle-pending 类（对局页逐根揭晓用）。坐标按全部传入的 bars 算，动画时不会抖。 */
  visibleCount?: number;
}

/** 只画已获准展示的 OHLC 数据，不请求或推算后续行情。 */
export function MarketChart({ bars, decisionT = 0, visibleCount }: MarketChartProps) {
  const chartId = useId();
  const visible = [...bars].filter(bar => [bar.t, bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)).sort((a, b) => a.t - b.t);
  if (visible.length === 0) return <p className="muted">暂无可展示的行情。</p>;

  const width = 860;
  const height = 304;
  const left = 62;
  const right = width - 22;
  const top = 32;
  const bottom = height - 38;
  const low = Math.min(...visible.map(bar => bar.l));
  const high = Math.max(...visible.map(bar => bar.h));
  const span = Math.max(high - low, Math.abs(high) * 0.02, 0.01);
  const minimum = low - span * 0.08;
  const maximum = high + span * 0.08;
  const step = (right - left) / visible.length;
  const x = (index: number) => left + (index + 0.5) * step;
  const y = (price: number) => bottom - (price - minimum) / (maximum - minimum) * (bottom - top);
  const decisionIndex = visible.findIndex(bar => bar.t === decisionT);
  const candleWidth = Math.max(1, Math.min(step * 0.64, 16));
  const ticks = [0, 1, 2, 3].map(index => minimum + (maximum - minimum) * index / 3);

  return <figure className="market-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title ${chartId}-description`}>
      <title id={`${chartId}-title`}>完整行情与决定时刻</title>
      <desc id={`${chartId}-description`}>共 {visible.length} 根 K 线，横轴为相对交易日。虚线标记 t={decisionT} 的决定时刻，右侧为决定后的走势。</desc>
      {decisionIndex >= 0 && <rect className="chart-future-zone" x={x(decisionIndex)} y={top} width={right - x(decisionIndex)} height={bottom - top} />}
      {ticks.map(price => <g key={price}>
        <line className="chart-grid" x1={left} x2={right} y1={y(price)} y2={y(price)} />
        <text className="chart-axis" x={left - 10} y={y(price) + 4} textAnchor="end">{price.toFixed(2)}</text>
      </g>)}
      {visible.map((bar, index) => <g className={`${bar.c >= bar.o ? 'candle-up' : 'candle-down'}${visibleCount !== undefined && index >= visibleCount ? ' candle-pending' : ''}`} key={bar.t}>
        <title>{`t=${bar.t}，开 ${bar.o.toFixed(2)}，高 ${bar.h.toFixed(2)}，低 ${bar.l.toFixed(2)}，收 ${bar.c.toFixed(2)}`}</title>
        <line x1={x(index)} x2={x(index)} y1={y(bar.h)} y2={y(bar.l)} />
        <rect x={x(index) - candleWidth / 2} y={Math.min(y(bar.o), y(bar.c))} width={candleWidth} height={Math.max(1.5, Math.abs(y(bar.o) - y(bar.c)))} />
      </g>)}
      {decisionIndex >= 0 && <g>
        <line className="chart-decision" x1={x(decisionIndex)} x2={x(decisionIndex)} y1={top - 10} y2={bottom + 5} />
        <text className="chart-decision-label" x={Math.min(x(decisionIndex) + 8, right - 100)} y={top - 13}>决定时刻 t={decisionT}</text>
      </g>}
      <text className="chart-axis" x={x(0)} y={height - 12}>t={visible[0].t}</text>
      <text className="chart-axis" x={x(visible.length - 1)} y={height - 12} textAnchor="end">t={visible[visible.length - 1].t}</text>
    </svg>
    <figcaption><span><i className="chart-legend-up" />上涨</span><span><i className="chart-legend-down" />下跌</span><span>虚线右侧为提交决定后的行情</span></figcaption>
  </figure>;
}
