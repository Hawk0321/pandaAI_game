import type { Card } from './types';

/**
 * PandaAI 与量化交易主题事件卡。示例内容，原创虚构，不构成投资建议。
 * 提到的 PandaAI 产品与活动（Qube、EVO 多 Agent 投研、因子中心、SimNow 期货仿真、
 * 策略/因子模板、因子大赛、全国期货模拟赛、LLM 对抗赛、QuantSkills）均以 docs/pandaai-resources.md
 * 与 docs/recommend-resources.md 的调研为准，不涉及价格和收益数字。
 * Panda Data 没有加密货币数据，所以 Web3 玩家的卡只用通用量化概念或“学思路 / 参赛 / 复盘”场景。
 * 量化的坑（过拟合、未来函数、回测漂亮实盘翻车、参数调太细）和好处同样出现。
 */

/** 基金经理：因子、多 Agent 投研、风控与合规。 */
const FUND_QUANT_CARDS: readonly Card[] = [
  {
    id: 'fund-quant-factor-center',
    speaker: '研究员',
    text: '研究员想用 PandaAI 因子中心的“低 PB + 高 ROE”模板，给股票池做一轮初筛。',
    left: { label: '让他试试', effects: { reputation: 6, capital: -6 }, tags: ['research'], aftermath: '后来渠道听说你在用因子初筛，路演多了个卖点。' },
    right: { label: '老办法选股', effects: { capital: 6, reputation: -6 }, tags: ['stubborn'], aftermath: '后来同行用因子筛出的组合，回撤比你小一些。' },
    roles: ['fund'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'fund-quant-evo',
    speaker: '投资总监',
    text: '投资总监提议试用 PandaAI 的 EVO 多 Agent 投研，让几个 AI 分工写行业研报初稿。',
    left: { label: '只当草稿', effects: { confidence: 7, capital: -6 }, tags: ['adaptive'], aftermath: '后来初稿省了不少时间，结论还是你自己核的。' },
    right: { label: '直接照搬', effects: { capital: 6, confidence: -7 }, tags: ['impulsive'], aftermath: '后来投委会追问一个数据出处，你答不上来。' },
    roles: ['fund'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'fund-quant-factor-contest',
    speaker: '同事',
    text: '同事想报名 PandaAI 的因子大赛，问你要不要用业余时间一起组队。',
    left: { label: '一起报名', effects: { reputation: 8, confidence: -6 }, tags: ['trend'], aftermath: '后来你们的因子没进前排，但复盘写得很扎实。' },
    right: { label: '专心管产品', effects: { confidence: 6, reputation: -8 }, tags: ['passive'], aftermath: '后来比赛结果出来，同事拿到一个入围名额。' },
    roles: ['fund'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'fund-quant-overfit',
    speaker: '投委会',
    text: '新因子回测曲线很漂亮，但只在一段风格行情里有效。投委会问上不上。',
    left: { label: '先做样本外', effects: { risk: 9, capital: -6 }, tags: ['cautious'], aftermath: '后来样本外一跑，收益缩水了一大半。' },
    right: { label: '趁热上线', effects: { capital: 6, risk: -9 }, tags: ['concentrated', 'impulsive'], aftermath: '后来风格一切换，因子收益掉了一大截。' },
    roles: ['fund'],
    is_sample: true,
  },
  {
    id: 'fund-quant-compliance',
    speaker: '合规专员',
    text: '合规专员提醒：量化模型调参也要留痕，每次改动都得有审批记录。',
    left: { label: '补齐留痕', effects: { reputation: 7, confidence: -6 }, tags: ['cautious'], aftermath: '后来监管检查时，你的记录是最全的一份。' },
    right: { label: '先跑再补', effects: { confidence: 6, reputation: -7 }, tags: ['impulsive'], aftermath: '后来补记录时，你已经想不起当初为什么改参数。' },
    roles: ['fund'],
    is_sample: true,
  },
  {
    id: 'fund-quant-crowding',
    speaker: '同行',
    text: '同行说现在大家用的动量因子都差不多，拥挤度已经很高了。',
    left: { label: '降低暴露', effects: { risk: 8, capital: -7 }, tags: ['contrarian'], aftermath: '后来动量因子集体回撤，你躲过了最难看的一周。' },
    right: { label: '跟着加码', effects: { capital: 7, risk: -8 }, tags: ['trend'], aftermath: '后来一次踩踏，大家的净值曲线长得一模一样。' },
    roles: ['fund'],
    is_sample: true,
  },
];

/** Web3 玩家：网格与过拟合、LLM 对抗赛、交易行为诊断。 */
const CRYPTO_QUANT_CARDS: readonly Card[] = [
  {
    id: 'crypto-quant-grid',
    speaker: '群友',
    text: '群友晒出网格机器人截图：震荡行情里每天小赚一点，看着很省心。',
    left: { label: '小仓试网格', effects: { capital: 7, risk: -7 }, tags: ['adaptive'], aftermath: '后来一波单边行情，网格单全挂在了上面。' },
    right: { label: '先想单边', effects: { risk: 7, reputation: -7 }, tags: ['cautious'], aftermath: '后来群友笑你太保守，你也懒得解释。' },
    roles: ['crypto'],
    is_sample: true,
  },
  {
    id: 'crypto-quant-perfect-curve',
    speaker: '匿名开发者',
    text: '匿名开发者卖一套策略，回测曲线几乎是一条直线，参数精确到小数点后三位。',
    left: { label: '掏钱买下', effects: { capital: -8, confidence: 7 }, tags: ['impulsive'], aftermath: '后来策略上线一周，回撤就超过了回测全年。' },
    right: { label: '参数太细了', effects: { reputation: 8, confidence: -7 }, tags: ['research'], aftermath: '后来你在群里拆穿它只是背熟了历史，很多人来道谢。' },
    roles: ['crypto'],
    is_sample: true,
  },
  {
    id: 'crypto-quant-llm-battle',
    speaker: '社群',
    text: '社群在转 PandaAI 的 LLM 对抗赛：几家大模型同台跑策略，比谁更稳。',
    left: { label: '报名参赛', effects: { reputation: 8, confidence: -6 }, tags: ['adaptive'], aftermath: '后来你的 AI 排在中间，但你学会了先写规则。' },
    right: { label: '只围观', effects: { confidence: 6, reputation: -8 }, tags: ['passive'], aftermath: '后来你把前几名的思路截图，存进了收藏夹。' },
    roles: ['crypto'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'crypto-quant-diagnostics',
    speaker: '朋友',
    text: '朋友推荐 PandaAI 发起的 QuantSkills 社区里的交易行为诊断，导入记录就能标出追涨、扛单。',
    left: { label: '导入复盘', effects: { risk: 9, confidence: -7 }, tags: ['research'], aftermath: '后来报告标出一长串追涨，你看了半天没说话。' },
    right: { label: '不想看', effects: { confidence: 7, risk: -9 }, tags: ['stubborn'], aftermath: '后来同样的追涨，你又犯了两次。' },
    roles: ['crypto'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'crypto-quant-qube-learn',
    speaker: '社区管理员',
    text: '社区管理员分享 PandaAI 的 Qube：一句话描述想法就能回测。它没有币圈行情，但能练回测思路。',
    left: { label: '拿来练手', effects: { reputation: 6, capital: -6 }, tags: ['trend'], aftermath: '后来你习惯先写清买卖条件，群里开始有人问你。' },
    right: { label: '凭感觉就行', effects: { capital: 6, reputation: -6 }, tags: ['contrarian'], aftermath: '后来群里讨论回测时，你插不上话。' },
    roles: ['crypto'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'crypto-quant-position-rule',
    speaker: '自己',
    text: '你给自己定了仓位规则：单笔亏损不超过总资金的 2%。今天这笔已经亏到线了。',
    left: { label: '按规则砍', effects: { risk: 9, capital: -6 }, tags: ['cautious'], aftermath: '后来它又跌了一段，你庆幸自己守了规则。' },
    right: { label: '再给它点', effects: { capital: 6, risk: -9 }, tags: ['concentrated'], aftermath: '后来它反弹了一点，你的规则却从此形同虚设。' },
    roles: ['crypto'],
    is_sample: true,
  },
];

/** 炒股达人：双均线 / 海龟模板、Qube 一句话回测、期货模拟赛。 */
const STOCK_QUANT_CARDS: readonly Card[] = [
  {
    id: 'stock-quant-ma',
    speaker: '股友群',
    text: '股友群在传 PandaAI 的 5/20 双均线模板：金叉买、死叉卖，不用天天盯盘。',
    left: { label: '先回测看看', effects: { risk: 8, capital: -6 }, tags: ['research'], aftermath: '后来回测发现震荡市里来回打脸，你调低了仓位。' },
    right: { label: '照着金叉买', effects: { capital: 6, risk: -8 }, tags: ['trend'], aftermath: '后来震荡市来回打脸，手续费吃掉不少。' },
    roles: ['stock'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'stock-quant-turtle',
    speaker: '期货老手',
    text: '期货老手推荐 PandaAI 的海龟突破 + ATR 止损模板：突破就进，跌破止损线就走。',
    left: { label: '严格止损', effects: { risk: 9, confidence: -6 }, tags: ['cautious'], aftermath: '后来被止损洗出去几次，但大亏一次都没有。' },
    right: { label: '止损太早', effects: { confidence: 6, risk: -9 }, tags: ['stubborn'], aftermath: '后来你把止损线越挪越远，模板也不灵了。' },
    roles: ['stock'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'stock-quant-qube',
    speaker: '新人',
    text: '新人用 Qube 一句话生成了个策略，回测收益很好看，问你要不要一起上实盘。',
    left: { label: '先查未来函数', effects: { reputation: 7, capital: -6 }, tags: ['research'], aftermath: '后来发现它用收盘价当天下单，实盘做不到。' },
    right: { label: '一起上实盘', effects: { capital: 6, reputation: -7 }, tags: ['impulsive'], aftermath: '后来实盘第一周，收益和回测对不上号。' },
    roles: ['stock'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'stock-quant-simnow',
    speaker: '前辈',
    text: '前辈说 PandaAI 桌面端能接 SimNow 期货仿真，建议你先去全国期货模拟赛练练手。',
    left: { label: '报名模拟赛', effects: { reputation: 7, confidence: -6 }, tags: ['adaptive'], aftermath: '后来模拟盘亏了几次，你才知道杠杆有多快。' },
    right: { label: '股票够忙了', effects: { confidence: 6, reputation: -7 }, tags: ['passive'], aftermath: '后来群里聊期货时，你只能听着。' },
    roles: ['stock'],
    pandaai: true,
    is_sample: true,
  },
  {
    id: 'stock-quant-params',
    speaker: '盯盘老哥',
    text: '盯盘老哥把均线参数从 5/20 调成 7/23，说回测收益又多了一截。',
    left: { label: '参数太细了', effects: { risk: 7, reputation: -6 }, tags: ['contrarian'], aftermath: '后来换一段行情，他的 7/23 就不灵了。' },
    right: { label: '跟着改参数', effects: { reputation: 6, risk: -7 }, tags: ['trend'], aftermath: '后来你们俩一起又把参数调了五遍。' },
    roles: ['stock'],
    is_sample: true,
  },
  {
    id: 'stock-quant-auto-stop',
    speaker: '营业部大妈',
    text: '营业部大妈听说程序能自动止盈止损，问你能不能帮她也设一个。',
    left: { label: '帮她设好', effects: { reputation: 7, capital: -6 }, tags: ['concentrated'], aftermath: '后来大妈逢人就夸你，还送来一袋橘子。' },
    right: { label: '让她先学', effects: { capital: 6, reputation: -7 }, tags: ['contrarian'], aftermath: '后来大妈自己报了个网课，学得比你还认真。' },
    roles: ['stock'],
    is_sample: true,
  },
];

/** 三角色共享（正文中性）。 */
const SHARED_QUANT_CARDS: readonly Card[] = [
  {
    id: 'quant-lookahead',
    speaker: '导师',
    text: '导师看了你的回测，说里面用到了当时还不知道的数据，这叫未来函数。',
    left: { label: '推倒重来', effects: { risk: 9, confidence: -7 }, tags: ['research', 'cautious'], aftermath: '后来重跑的曲线难看多了，但你敢信它了。' },
    right: { label: '差别不大', effects: { confidence: 7, risk: -9 }, tags: ['stubborn'], aftermath: '后来实盘的结果，替导师把话说完了。' },
    is_sample: true,
  },
  {
    id: 'quant-live-vs-backtest',
    speaker: '自己',
    text: '策略实盘跑了一个月，表现比回测差了一大截。',
    left: { label: '暂停复盘', effects: { risk: 8, capital: -6 }, tags: ['passive'], aftermath: '后来你发现滑点和手续费都没算进回测。' },
    right: { label: '加大仓位', effects: { capital: 6, risk: -8 }, tags: ['concentrated'], aftermath: '后来亏损跟着仓位一起放大了。' },
    is_sample: true,
  },
  {
    id: 'quant-walk-forward',
    speaker: '老同学',
    text: '老同学说参数要做滚动前推验证：用过去一段调参，再拿下一段检验。',
    left: { label: '照这样做', effects: { confidence: 7, reputation: -6 }, tags: ['adaptive'], aftermath: '后来留下来的参数不多，但每个都经得起换段。' },
    right: { label: '太麻烦了', effects: { reputation: 6, confidence: -7 }, tags: ['contrarian', 'impulsive'], aftermath: '后来你晒的回测很漂亮，就是没敢再更新。' },
    is_sample: true,
  },
];

export const QUANT_CARDS: readonly Card[] = [
  ...FUND_QUANT_CARDS,
  ...CRYPTO_QUANT_CARDS,
  ...STOCK_QUANT_CARDS,
  ...SHARED_QUANT_CARDS,
];
