import type { PersonaId } from './types';

export const QUBE_CHAT_URL = 'https://www.pandaaiquant.com/agent_quant/chat';

export interface StrategyMatch {
  readonly title: string;
  readonly reason: string;
  readonly prompt: string;
}

/** Behavior-to-strategy starter prompts, not trading instructions or performance claims. */
const MATCHES: Readonly<Record<PersonaId, StrategyMatch>> = {
  sloth: { title: '先用 ETF 分散配置', reason: '你偏爱观察和低暴露，先用分散规则而不是频繁操作。', prompt: '请创建一个宽基 ETF 分散配置回测策略：沪深300ETF与中证500ETF等权，每月检查，偏离目标权重5个百分点再平衡；比较买入持有与定期再平衡的差别。' },
  bull: { title: '给冲劲加一条 ATR 止损线', reason: '你行动快、风险暴露高，把退出纪律先写进策略再回测。', prompt: '请创建沪深300ETF的ATR跟踪止损回测策略：价格站上60日均线时持有80%，用14日ATR的3倍距离动态退出，比较固定止损与ATR跟踪止损。' },
  hedgehog: { title: '检验“等它回来”的边界', reason: '你有坚持的一面，把长期持有与止损规则放在同一回测里比较。', prompt: '请创建一个均值回归与止损对照回测策略：价格低于60日均值1.5个标准差时进入，回到均值退出；加入8%最大亏损退出规则，比较有无止损的净值与回撤。' },
  owl: { title: '把研究变成多因子规则', reason: '你重视证据，适合把研究线索写成可验证的多因子组合。', prompt: '请创建中证500多因子研究回测：结合20日趋势、20日波动率和成交额筛选，按综合得分持有前10只，每月调仓，并做样本外对照。' },
  shark: { title: '集中研究也要有仓位边界', reason: '你愿意集中下注，把研究与仓位上限一起验证。', prompt: '请创建一个高确信集中持仓回测策略：从沪深300成分股按基本面和趋势打分，最多持有5只，单只仓位不超过30%，每月复核，并设置组合最大回撤警戒。' },
  turtle: { title: '把风险预算写成配置规则', reason: '你重视风险预算，适合先检验波动率目标而非追逐收益数字。', prompt: '请创建ETF风险预算回测策略：以60日历史波动率倒数分配多只宽基ETF权重，单只权重不超过40%，每月再平衡，对比等权组合。' },
  dolphin: { title: '把顺势写成双均线', reason: '你习惯跟随趋势，用明确的进出场规则检验直觉。', prompt: '请创建沪深300ETF双均线趋势回测：MA5上穿MA20时进入，MA5下穿MA20时退出，并加入14日ATR止损，比较不同均线窗口。' },
  crab: { title: '检验逆向与均值回归', reason: '你偏爱逆向思考，用均值回归规则验证“跌多了会修复”的边界。', prompt: '请创建一个沪深300ETF均值回归回测：20日价格偏离低于负1.5倍标准差时进入，回到20日均值退出；同时设置最大持仓时间和风险退出条件。' },
  fox: { title: '先判断环境，再切换打法', reason: '你会调整打法，把市场状态写成规则而不是临场改口。', prompt: '请创建一个市场状态切换回测：按20日与60日趋势及20日波动率区分趋势、震荡和高波动状态，分别使用双均线、均值回归或降低仓位，每月复核规则。' },
  puffin: { title: '把追热点变成趋势确认', reason: '你对热点敏感，把追浪改成多重趋势确认，减少只凭情绪进场。', prompt: '请创建趋势确认回测策略：价格高于MA20、20日动量为正且突破前20日高时才进入，不满足任一条件退出，并用ATR控制回撤。' },
  raccoon: { title: '给抄底加上确认与边界', reason: '你偏爱低吸，把“便宜”拆成偏离、企稳和退出规则。', prompt: '请创建逆向低吸回测策略：价格低于60日均值1.5个标准差后，等待重新站上5日均线再进入；回到均值或达到最大持仓天数退出，并设置风险上限。' },
  gecko: { title: '把止损纪律做成系统', reason: '你擅长截断风险，把止损与再次进入的规则一起检验。', prompt: '请创建一个止损纪律回测策略：单笔最大亏损8%退出，只有重新站上20日均线才允许再次进入；比较严格执行与主观拖延的差异。' },
  squirrel: { title: '把复盘变成多因子与样本外检验', reason: '你重视记录与复盘，把规则、样本外和调仓频率一起比较。', prompt: '请创建一个多因子样本外回测：结合低估值、质量和低波动筛选股票，每月调仓，按时间划分训练与验证区间，报告参数敏感性。' },
  bat: { title: '用规则减少疲劳时追高', reason: '你容易在夜间追热点，把入场确认和冷却时间写进系统。', prompt: '请创建一个趋势冷静期回测：突破20日高后不立即进入，等待两个交易日仍未跌破5日均线才进入；用ATR止损，比较即时追高与延迟确认。' },
  panda: { title: '减少摇摆，按状态定规则', reason: '你后期容易改口，用固定状态切换条件代替频繁变招。', prompt: '请创建一个规则固定的市场状态回测：只有20日与60日趋势同向时才使用趋势策略，其余时间保持低仓位；每月只允许调整一次，比较灵活改口与固定规则。' },
};

export function strategyFor(persona: PersonaId): StrategyMatch {
  return MATCHES[persona];
}

export function qubeChatLink(persona: PersonaId): string {
  return `${QUBE_CHAT_URL}?message=${encodeURIComponent(strategyFor(persona).prompt)}`;
}
