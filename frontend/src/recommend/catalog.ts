/**
 * 推荐资源目录。外部资源都核实过链接（2026-10-31），is_sample: false；
 * 本作品内置的练习任务 provider 为 "本作品"。
 */
import type { RecResource, TaskId } from '../shared/protocol';

const QS = 'https://github.com/quantskills/';

export const EXTERNAL = {
  stopLossSkill: { name: 'skill-b11-auto-stop-loss-take-profit', provider: 'QuantSkills', url: `${QS}skill-b11-auto-stop-loss-take-profit`,
    desc: '按入场价自动判断止盈、止损和单票仓位上限的技能包', is_sample: false },
  behaviorSkill: { name: 'skill-trading-behavior-diagnostics', provider: 'QuantSkills', url: `${QS}skill-trading-behavior-diagnostics`,
    desc: '解析交易记录、识别过度自信等常见行为偏差', is_sample: false },
  tradeReviewSkill: { name: 'skill-trade-review', provider: 'QuantSkills', url: `${QS}skill-trade-review`,
    desc: '按走势、策略和交易记录逐笔复盘，并给出下一阶段建议', is_sample: false },
  pandaDataSkill: { name: 'skill-pandadata-api', provider: 'QuantSkills', url: `${QS}skill-pandadata-api`,
    desc: '让 AI 助手直接调用 Panda Data 查行情和因子的技能包', is_sample: false },
  maCrossSkill: { name: 'skill-ma-crossover-signal', provider: 'QuantSkills', url: `${QS}skill-ma-crossover-signal`,
    desc: '单标的均线交叉信号分析（趋势跟随）', is_sample: false },
  oversoldSkill: { name: 'skill-oversold-rebound', provider: 'QuantSkills', url: `${QS}skill-oversold-rebound`,
    desc: 'A 股超跌反弹择时与选股（逆势反转）', is_sample: false },
  overfitSkill: { name: 'skill-backtest-overfit', provider: 'QuantSkills', url: `${QS}skill-backtest-overfit`,
    desc: '检测回测过拟合：Deflated Sharpe、PBO 等', is_sample: false },
  qube: { name: 'PandaAI Qube', provider: 'PandaAI', url: 'https://www.pandaaiquant.com/agent_quant/',
    desc: '一句话把交易想法变成可回测的策略，首页有双均线、海龟突破 + ATR 止损等模板', is_sample: false },
  pandaDataDocs: { name: 'Panda Data API 文档', provider: 'PandaAI', url: 'https://www.pandaaiquant.com/docs/api',
    desc: '本游戏关卡用到的行情数据接口文档', is_sample: false },
  futuresContest: { name: '全国期货模拟赛', provider: 'PandaAI', url: 'https://www.pandaaiquant.com/contest/',
    desc: '用模拟盘下单，手动、策略、AI 辅助同场竞技，不用真金白银', is_sample: false },
  factorContest: { name: '第四届因子大赛', provider: 'PandaAI', url: 'https://www.pandaaiquant.com/factorhub/fourthFactorCompetition/',
    desc: '永续赛制、随到随赛的因子研究比赛', is_sample: false },
} satisfies Record<string, RecResource>;

export const TASKS: Record<TaskId, RecResource & { steps: string }> = {
  stop_drill: { name: '止损演练', provider: '本作品', is_sample: false, steps: '选一档止损 → 回放真实后续走势 → 对比不设止损的结果',
    desc: '回到你玩过的一关真实行情，比较不同止损档位的结果' },
  key_clue_drill: { name: '关键线索复盘', provider: '本作品', is_sample: false, steps: '翻开全部线索 → 选出你认为最关键的两张 → 对照答案和真实结局',
    desc: '回到你漏看关键线索的那关，重新判断哪张线索最有用' },
  calibration_quiz: { name: '信心校准小测', provider: '本作品', is_sample: false, steps: '3 段没玩过的真实行情 → 每段选涨跌并给信心 → 看平均信心和命中率',
    desc: '不用下单，只练"判断 + 信心"，结束时算出你的信心是否靠谱' },
  style_match: { name: '风格对照', provider: '本作品', is_sample: false, steps: '对比你和双均线、海龟、均值回归三种策略在每关的方向 → 找出最像你的规则',
    desc: '把你的直觉和三种经典策略逐关对照，看哪条规则最像你' },
};
