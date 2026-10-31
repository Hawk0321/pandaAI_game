import type { GameEvent, LevelPlay, LevelReveal, Side } from '../shared/protocol';
import { MarketChart } from './MarketChart';

interface RevealPageProps {
  level: LevelPlay;
  reveal: LevelReveal;
  result: { level_id: string; pnl: number; final_position: number };
  events: GameEvent[];
  onContinue: () => void;
  busy?: boolean;
}

const sideNames: Record<Side, string> = { long: '做多', short: '做空', flat: '观望' };
const scenarioNames: Record<LevelReveal['scenario'], string> = {
  uptrend: '上涨趋势', crash: '急跌行情', range: '区间震荡',
  fake_breakout: '假突破', v_reversal: 'V 形反转', gap: '跳空行情',
};
const scenarioHints: Record<LevelReveal['scenario'], string> = {
  uptrend: '顺着趋势的人拿到了这一段，猜顶的人被推着走。',
  crash: '这段行情里，仓位比方向更决定结果。',
  range: '来回震荡最容易让人反复操作，也最容易打掉保护线。',
  fake_breakout: '盘中冲高不等于收盘确认，这是本关最关键的一课。',
  v_reversal: '先跌后拉，止损位设在哪里，决定了你还在不在场。',
  gap: '开盘直接跳过你的价位，隔夜风险无法用日内规则完全规避。',
};

function percent(value: number) {
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export function RevealPage({ level, reveal, result, events, onContinue, busy = false }: RevealPageProps) {
  const levelEvents = events.filter(event => event.level_id === level.id);
  const openedClues = new Set(levelEvents.filter(event => event.type === 'clue_open').map(event => event.data.clue_id));
  const decision = [...levelEvents].reverse().find(event => event.type === 'decision');
  const playerSide = decision?.data.side as Side | undefined;
  const decisionsOpened = decision?.data.clues_opened;
  if (Array.isArray(decisionsOpened)) decisionsOpened.forEach(id => { if (typeof id === 'string') openedClues.add(id); });

  const all = [{ ret: result.pnl, mine: true }, ...reveal.bots.map(bot => ({ ret: bot.ret, mine: false }))];
  const rank = all.filter(item => item.ret > result.pnl).length + 1;
  const openedKeys = reveal.key_clue_ids.filter(id => openedClues.has(id));
  const missedKeys = reveal.key_clue_ids.filter(id => !openedClues.has(id));
  const verdict = result.pnl > 0
    ? `这一步走对了：${rank === 1 ? '你比 3 位 AI 对手都赚得多。' : `收益为正，排在第 ${rank} / 4 位。`}`
    : result.pnl < 0
      ? `这一步亏了：排在 ${rank} / 4 位。亏损不否定判断过程，但值得看一眼当时的依据。`
      : `这一步没赚没亏，排在 ${rank} / 4 位。`;

  return <div className="reveal-page page-enter">
    <section className="page-heading">
      <p className="eyebrow">{level.id} · 本关揭晓</p>
      <h1>现在，看见故事的全貌。</h1>
      <p>选择已经记录。回到当时的证据，看看结果如何发生。</p>
    </section>

    {(level.is_sample || reveal.is_sample) && <p className="notice sample-notice">模拟行情示例：本页名称、日期和策略结果用于展示接口，不能当作真实历史回测。</p>}

    <section className="reveal-verdict" aria-label="本关结果">
      <div className="verdict-score">
        <span className="eyebrow">你的本关收益</span>
        <strong className={result.pnl > 0 ? 'return-positive' : result.pnl < 0 ? 'return-negative' : ''}>{percent(result.pnl)}</strong>
        <span className="verdict-rank">第 <b>{rank}</b> / 4 位</span>
      </div>
      <div className="verdict-body">
        <p className="verdict-text">{verdict}</p>
        <p className="verdict-hint">{scenarioHints[reveal.scenario]}</p>
        <ul className="verdict-facts">
          <li><span>行情类型</span><b>{scenarioNames[reveal.scenario]}</b></li>
          <li><span>你的方向</span><b>{playerSide ? sideNames[playerSide] : '未记录'}</b></li>
          <li><span>关键线索</span><b>{openedKeys.length} / {reveal.key_clue_ids.length} 已看</b></li>
        </ul>
      </div>
    </section>

    <section className="panel reveal-market" aria-labelledby="reveal-market-title">
      <div className="section-title-row"><div><p className="eyebrow">{reveal.symbol}</p><h2 id="reveal-market-title">{reveal.name}</h2></div><span className="scenario-label">{scenarioNames[reveal.scenario]}</span></div>
      <dl className="date-grid">
        <div><dt>可见区间起点</dt><dd>{reveal.start_date}</dd></div>
        <div><dt>你的决定日</dt><dd>{reveal.decision_date}</dd></div>
        <div><dt>揭晓区间终点</dt><dd>{reveal.end_date}</dd></div>
      </dl>
      <MarketChart bars={[...level.bars, ...reveal.after_bars]} decisionT={0} />
      <p className="muted small-text">区间价格变化 {percent(reveal.outcome.ret)}。收益只是结果的一部分，不能单独证明判断能力。</p>
    </section>

    <div className="reveal-columns">
      <section className="panel" aria-labelledby="result-comparison-title">
        <h2 id="result-comparison-title">你与 3 位 AI 对手</h2>
        <p className="muted small-text">你的结果来自本关操作；AI 结果来自关卡数据。示例数据不作为真实回测。</p>
        <dl className="comparison-list">
          <div className="comparison-row player-result"><dt><strong>你的结果</strong><span>{playerSide && sideNames[playerSide] ? sideNames[playerSide] : '方向未提供'} · 最终仓位 {(result.final_position * 100).toFixed(0)}%</span></dt><dd className={result.pnl > 0 ? 'return-positive' : result.pnl < 0 ? 'return-negative' : ''}>{percent(result.pnl)}</dd></div>
          {reveal.bots.map(bot => <div className="comparison-row" key={bot.id}><dt><strong>{bot.name}</strong><span>{sideNames[bot.side]}</span></dt><dd className={bot.ret > 0 ? 'return-positive' : bot.ret < 0 ? 'return-negative' : ''}>{percent(bot.ret)}</dd></div>)}
        </dl>
      </section>

      <section className="panel" aria-labelledby="key-clues-title">
        <h2 id="key-clues-title">关键线索，你看了吗？</h2>
        <p className="muted small-text">依据本关的翻牌记录核对，答案来自揭晓数据。</p>
        {reveal.key_clue_ids.length === 0 && <p className="muted">本关未标记关键线索。</p>}
        {missedKeys.length > 0 && <p className="clue-gap">{missedKeys.length} 张关键线索你当时没有翻开，下面标了出来。</p>}
        <ul className="key-clue-list">
          {reveal.key_clue_ids.map(id => {
            const clue = level.clues.find(item => item.id === id);
            const wasOpened = openedClues.has(id);
            return <li key={id} data-state={wasOpened ? 'viewed' : 'missed'}><div className="key-clue-heading"><h3>{clue?.title ?? id}</h3><span className={wasOpened ? 'clue-status clue-viewed' : 'clue-status clue-missed'}>{wasOpened ? '已查看' : '未查看'}</span></div><p>{clue?.text ?? '关卡未提供这张线索的说明。'}</p></li>;
          })}
        </ul>
      </section>
    </div>

    <div className="button-row page-actions"><button className="primary-button" disabled={busy} onClick={onContinue}>{busy ? '正在继续…' : '继续探索'}</button></div>
  </div>;
}
