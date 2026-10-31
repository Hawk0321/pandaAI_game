/**
 * 推荐卡片的资源目录：PandaAI 产品/活动/学习资源 + QuantSkills 开源技能包。
 * 链接都在 2026-10-31 核实过（HTTP 200），is_sample: false。完整清单和挑选理由见 docs/recommend-resources.md。
 */
import type { RecResource } from '../shared/protocol';

const QS = 'https://github.com/quantskills/';
const PA = 'https://www.pandaaiquant.com/';
const qs = (name: string, desc: string, tags: string[]): RecResource => ({ name, provider: 'QuantSkills', url: `${QS}${name}`, desc, tags, is_sample: false });
const pa = (name: string, path: string, desc: string, tags: string[]): RecResource => ({ name, provider: 'PandaAI', url: `${PA}${path}`, desc, tags, is_sample: false });

export const CATALOG = {
  // ---- 策略：把交易风格写成规则（QuantSkills 技能包 + Qube 模板）----
  maCross: qs('skill-ma-crossover-signal', '单标的均线金叉/死叉信号分析，把"顺势"写成规则', ['趋势跟随', '均线']),
  oversold: qs('skill-oversold-rebound', 'A 股超跌反弹择时与选股：先判断反弹环境，再筛候选股票', ['逆势反转', '择时']),
  keynes: qs('skill-keynes-contrarian-investment', '凯恩斯式反共识研究：识别过度乐观、过度悲观和价值陷阱', ['逆向投资', '预期差']),
  allWeather: qs('skill-dalio-all-weather', 'A 股全天候资产配置：宏观象限识别 + 风险平价', ['风险预算', '资产配置']),
  regime: qs('skill-market-regime-analysis', '用指数、宏观、期限结构和波动率划分市场状态，先认清环境再选策略', ['市场状态', '适应性']),
  dossier: qs('skill-a-share-stock-dossier', '一键生成 A 股个股研究档案，数据来自 Panda Data', ['深度研究', '个股']),
  kline: qs('skill-xingtai-catcher', '相似 K 线形态搜索：找历史上走势相似的股票和期货', ['K 线', '形态']),
  factorOnline: qs('skill-pandaai-factor-online', 'PandaAI 因子大赛上手：环境体检、登录、在线挖掘因子', ['因子', '因子大赛']),
  qbti: qs('skill-qbti', 'QBTI 平凡人策略：五组问答把投资性格翻译成因子方向和策略参数', ['性格→策略', '入门']),

  // ---- 工具：补能力短板 ----
  stopLoss: qs('skill-b11-auto-stop-loss-take-profit', '按入场价自动判断止盈、止损和单票仓位上限', ['风险控制', '止损']),
  behavior: qs('skill-trading-behavior-diagnostics', '解析交易记录，识别过度自信等常见行为偏差', ['行为金融', '复盘']),
  calibration: qs('skill-forecast-calibration-audit', '评估概率预测是否靠谱：Brier 分数、校准曲线', ['判断校准', '概率']),
  tradeReview: qs('skill-trade-review', '按走势、策略和交易记录逐笔复盘，给出下一阶段建议', ['复盘', '证据']),
  overfit: qs('skill-backtest-overfit', '检测回测过拟合：Deflated Sharpe、PBO', ['回测', '防过拟合']),
  pandaData: qs('skill-pandadata-api', '让 AI 编程助手直接调用 Panda Data 查行情和因子', ['数据', 'AI 助手']),
  dailyReview: qs('skill-market-daily-review', '基于 Panda Data 自动生成 A 股收盘复盘报告', ['每日复盘', '入门']),

  // ---- PandaAI 产品 ----
  qube: pa('Qube', 'agent_quant/', '用自然语言生成策略并回测，支持调参和仿真盘；快速试用不用登录', ['免登录试用', '自然语言']),
  factorCenter: pa('量化因子中心', 'quantfactor-center', '因子搜索、对比和诊断，带 AI 因子助手；免费版有 20 个因子的因子池', ['因子', '免费版']),
  evo: pa('EVO 研究平台', 'docs/evo', '云端量化研究环境：中央 Agent 拆任务给子代理，再由审查官复核；需登录，Lite 会员起可用', ['多 Agent', '付费']),

  // ---- 活动 ----
  futuresContest: pa('全国期货模拟赛', 'contest/', '模拟盘交易比赛，手动、策略、AI 辅助三个赛道，不用真金白银', ['模拟盘', '进行中']),
  factorContest: pa('第四届因子大赛', 'factorhub/fourthFactorCompetition/', '永续赛制、随时参赛的因子研究比赛', ['因子', '进行中']),

  // ---- 学习 ----
  course: pa('量变学院 · 量化思维入门', 'learninghub/newcourse', 'PandaAI 的量化课程体系，从 L1 量化思维入门开始', ['课程', '入门']),
  guide: pa('PandaAI 新手入门', 'docs', '知识库里的新手入门和各产品使用指南，免费阅读', ['文档', '免费']),

  // ---- 社区 ----
  community: pa('PandaAI 用户社区', 'community', '和其他量化研究者讨论策略与因子、提问交流', ['社区', '免费']),
} satisfies Record<string, RecResource>;

export type CatalogId = keyof typeof CATALOG;
