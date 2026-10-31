import type { Card } from './types';

/**
 * 奇遇卡：由 public/levels 的 10 个行情关卡改写，每关 2 张（共 20 张）。
 * 示例内容（is_sample），不构成投资建议。
 *
 * 信息隔离（AGENTS.md 第 4 节）：
 * - text 和 label 只写 play 文件里“当时可见”的信息（市场类型、K 线形状、线索卡）。
 * - 后续走势只写在 aftermath 里，选完才显示；用 reveal.outcome.ret 四舍五入的概括。
 * - 不出现真实股票名、代码、日期。
 *
 * 角色限定：
 * - 正文带 A 股 / 期货 / 盘中 / 收盘 等场景词的 11 张卡标 roles: ['stock', 'fund']；
 * - 措辞改成中性（“某个资产”“15 天”）的 9 张卡不写 roles，三个角色共享（Web3 玩家也能遇到）。
 *
 * 数值：槽位语义 capital=钱，risk=安全垫，confidence=定力，reputation=外界认可；
 * 单次幅度 5–15。走势更优的选项略占优势，整体净和靠其他卡牌抵消。
 */
export const ADVENTURES: readonly Card[] = [
  // ---- L01 fake_breakout，后 15 日约 -4% ----
  {
    id: 'adv-L01-a',
    speaker: '盯盘群老哥',
    text: '一只 A 股，涨了一阵，短均线在长均线上方。今天盘中冲到新高，收盘却没站稳前高。',
    left: {
      label: '等回踩',
      effects: { risk: 9, reputation: 6 },
      tags: ['research'],
      aftermath: '后来 15 个交易日回落约 4%，没追高，躲开了一小段下跌。',
    },
    right: {
      label: '追突破',
      effects: { capital: -10, risk: -8, confidence: 6 },
      tags: ['impulsive', 'trend'],
      aftermath: '后来 15 个交易日回落约 4%，冲高没站稳，追进去的人被套了一阵。',
    },
    adventure: { levelId: 'L01', scenario: 'fake_breakout' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L01-b',
    speaker: '自己',
    text: '你已持仓。历史上均线信号的命中率只有四成出头，今天又是冲高回落。',
    left: {
      label: '按核验减仓',
      effects: { capital: 5, risk: 7, reputation: -6 },
      tags: ['adaptive'],
      aftermath: '后来 15 天回落约 4%，减掉的那一半帮你少亏了点。',
    },
    right: {
      label: '舍不得卖',
      effects: { capital: -8, confidence: 6 },
      tags: ['stubborn'],
      aftermath: '后来 15 天回落约 4%，账面利润缩了水，你还说“能涨”。',
    },
    adventure: { levelId: 'L01', scenario: 'fake_breakout' },
    is_sample: true,
  },

  // ---- L02 uptrend，后 15 日约 +6% ----
  {
    id: 'adv-L02-a',
    speaker: '期货老手',
    text: '一个期货品种，价格缓步抬升，成交量连日放大。今天盘中创新高，收盘差一点点。',
    left: {
      label: '再观察',
      effects: { capital: -10, confidence: -6, reputation: -7 },
      tags: ['passive'],
      aftermath: '后来 15 个交易日涨了约 6%，你在场外看完了这一段。',
    },
    right: {
      label: '顺势做多',
      effects: { capital: 10, risk: -9, reputation: 5 },
      tags: ['trend'],
      aftermath: '后来 15 个交易日涨了约 6%，放量上行的趋势延续了。',
    },
    adventure: { levelId: 'L02', scenario: 'uptrend' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L02-b',
    speaker: '自己',
    text: '你已持有多头仓位。止损线放得很远，足有日波动的五倍，成交量还在放大。',
    left: {
      label: '再翻线索',
      effects: { risk: 5, confidence: 5 },
      tags: ['research'],
      aftermath: '线索没说反话，后来 15 天涨了约 6%，稳稳拿住。',
    },
    right: {
      label: '重仓压上',
      effects: { capital: 13, risk: -10, reputation: -6 },
      tags: ['concentrated'],
      aftermath: '后来 15 天涨了约 6%，重仓赚得更多，心也悬了一路。',
    },
    adventure: { levelId: 'L02', scenario: 'uptrend' },
    is_sample: true,
  },

  // ---- L03 crash，后 15 日约 -10% ----
  {
    id: 'adv-L03-a',
    speaker: '基金经理',
    text: '一只 A 股，两个月涨了近五成，刚从高点回落又反弹，大盘近几天偏弱。',
    left: {
      label: '落袋为安',
      effects: { capital: 5, confidence: -6, reputation: 5 },
      tags: ['cautious'],
      aftermath: '后来 15 个交易日跌了约 10%，落袋的部分躲过了回撤。',
    },
    right: {
      label: '继续持有',
      effects: { capital: -15, confidence: 8 },
      tags: ['stubborn'],
      aftermath: '后来 15 个交易日跌了约 10%，回撤吃掉了不少账面利润。',
    },
    adventure: { levelId: 'L03', scenario: 'crash' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L03-b',
    speaker: '群里的大V',
    text: '群里一片喊多，说强势资产回调就是机会。可整个市场近几天走弱，这个资产今天又收涨。',
    left: {
      label: '跟着喊多',
      effects: { capital: -11, reputation: 7, risk: -7 },
      tags: ['trend'],
      aftermath: '后来 15 天跌了约 10%，一路喊多的人安静了。',
    },
    right: {
      label: '反着做',
      effects: { capital: 7, reputation: -10, confidence: 5 },
      tags: ['contrarian'],
      aftermath: '后来 15 天跌了约 10%，你逆着群声，反而躲过一劫。',
    },
    adventure: { levelId: 'L03', scenario: 'crash' },
    is_sample: true,
  },

  // ---- L04 range，后 15 日约 +1% ----
  {
    id: 'adv-L04-a',
    speaker: '匿名行情',
    text: '一只 A 股，跌了一阵后反弹，短均线转到长均线上方，但成交量在萎缩。',
    left: {
      label: '缩量不碰',
      effects: { risk: 9, confidence: -6 },
      tags: ['passive'],
      aftermath: '后来 15 个交易日基本横盘，只涨了约 1%，没动也没少什么。',
    },
    right: {
      label: '抢反弹',
      effects: { capital: -10, confidence: 5, reputation: -6 },
      tags: ['impulsive'],
      aftermath: '后来 15 个交易日只涨了约 1%，来回折腾没赚到多少。',
    },
    adventure: { levelId: 'L04', scenario: 'range' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L04-b',
    speaker: '同事',
    text: '反弹后价格停在近两个月区间的中部，上下都没有明确方向。同事问要不要做差价。',
    left: {
      label: '高抛低吸',
      effects: { capital: 8, reputation: 6, confidence: -10 },
      tags: ['adaptive'],
      aftermath: '后来 15 天窄幅来回，净涨约 1%，做差价的人赚了点小钱。',
    },
    right: {
      label: '押注突破',
      effects: { capital: -7, risk: -6, confidence: 5 },
      tags: ['concentrated'],
      aftermath: '后来 15 天只涨了约 1%，没有突破，重仓白白占了资金。',
    },
    adventure: { levelId: 'L04', scenario: 'range' },
    is_sample: true,
  },

  // ---- L05 v_reversal，后 15 日约 +20% ----
  {
    id: 'adv-L05-a',
    speaker: '恐慌的室友',
    text: '一只 A 股，连续阴跌，今天放量再跌三个点，短均线压在长均线下方，大盘也在走弱。',
    left: {
      label: '割肉离场',
      effects: { capital: -10, risk: 9, confidence: -8 },
      tags: ['cautious'],
      aftermath: '后来短暂探底又强势反弹，15 个交易日净涨约 20%，卖早了。',
    },
    right: {
      label: '越跌越买',
      effects: { capital: 14, risk: -8, reputation: -9 },
      tags: ['contrarian'],
      aftermath: '后来先探底再强势反弹，15 个交易日净涨约 20%，逆势接货成功。',
    },
    adventure: { levelId: 'L05', scenario: 'v_reversal' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L05-b',
    speaker: '自己',
    text: '你的仓位已经被套。短均线向下，历史上均线信号只命中四成出头。',
    left: {
      label: '再看线索',
      effects: { risk: 8, reputation: 5, capital: -7 },
      tags: ['research'],
      aftermath: '线索翻了一圈没结论，后来强势反弹，15 天净涨约 20%。',
    },
    right: {
      label: '重仓补一手',
      effects: { capital: 15, risk: -12, confidence: 5 },
      tags: ['concentrated', 'contrarian'],
      aftermath: '后来先探底再反弹，15 天净涨约 20%，补仓那笔赚得最多。',
    },
    adventure: { levelId: 'L05', scenario: 'v_reversal' },
    is_sample: true,
  },

  // ---- L06 gap，后 15 日约 +13% ----
  {
    id: 'adv-L06-a',
    speaker: '营业部大妈',
    text: '一只 A 股，几天内价格翻了一倍，成交量放大十倍。今天单日下跌近 18%，从高点回落近三成。',
    left: {
      label: '清仓走人',
      effects: { capital: 6, risk: 8, confidence: -8 },
      tags: ['cautious'],
      aftermath: '后来 15 个交易日震荡走高，净涨约 13%，你看着它又涨了回去。',
    },
    right: {
      label: '拿住不动',
      effects: { capital: 9, confidence: 6, reputation: 5 },
      tags: ['stubborn'],
      aftermath: '后来 15 个交易日震荡走高，净涨约 13%，拿住的人回了血。',
    },
    adventure: { levelId: 'L06', scenario: 'gap' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L06-b',
    speaker: '自己',
    text: '这个资产日波动约九个点，5% 的止损线比一天的波动还窄。仓位怎么定？',
    left: {
      label: '按波动降仓',
      effects: { capital: 7, risk: 7, reputation: -7 },
      tags: ['adaptive'],
      aftermath: '后来 15 天震荡走高，净涨约 13%，小仓位让你拿得稳。',
    },
    right: {
      label: '满仓搏一把',
      effects: { capital: 14, risk: -12, confidence: 5 },
      tags: ['concentrated'],
      aftermath: '后来 15 天净涨约 13%，赚到了，但中间几次回撤吓人。',
    },
    adventure: { levelId: 'L06', scenario: 'gap' },
    is_sample: true,
  },

  // ---- L07 fake_breakout，后 15 日约 -3% ----
  {
    id: 'adv-L07-a',
    speaker: '老股民',
    text: '一只 A 股，涨势很强，历史信号命中近七成。但今天盘中新高、收盘没站稳，大盘也偏弱。',
    left: {
      label: '信号说了算',
      effects: { capital: -9, reputation: 5, confidence: 5 },
      tags: ['trend'],
      aftermath: '后来 15 个交易日小幅回落约 3%，信号没能扛住假突破。',
    },
    right: {
      label: '不跟信号',
      effects: { capital: 6, risk: 9, reputation: -6 },
      tags: ['contrarian'],
      aftermath: '后来 15 个交易日小幅回落约 3%，你没跟，省了一次回撤。',
    },
    adventure: { levelId: 'L07', scenario: 'fake_breakout' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L07-b',
    speaker: '自己',
    text: '你已持仓。今天一度大幅低开，后来又拉回平盘，突破信号偏空。',
    left: {
      label: '再翻线索',
      effects: { risk: 6, reputation: 6, confidence: -9 },
      tags: ['research'],
      aftermath: '后来 15 天先冲高再回落，净跌约 3%，线索提醒过你。',
    },
    right: {
      label: '继续扛着',
      effects: { capital: -9, confidence: 5 },
      tags: ['stubborn'],
      aftermath: '后来 15 天冲高后回落，净跌约 3%，只换来一场虚惊。',
    },
    adventure: { levelId: 'L07', scenario: 'fake_breakout' },
    is_sample: true,
  },

  // ---- L08 fake_breakout（期货），后 15 日约 -5% ----
  {
    id: 'adv-L08-a',
    speaker: '匿名行情',
    text: '一个期货品种，收盘站上了近期前高，可成交量比前阵子萎缩了近三成。',
    left: {
      label: '追突破',
      effects: { capital: -9, confidence: 6, reputation: 5 },
      tags: ['trend', 'impulsive'],
      aftermath: '后来 15 个交易日回落约 5%，缩量突破没能延续。',
    },
    right: {
      label: '再看量价',
      effects: { risk: 8, reputation: 5, confidence: -6 },
      tags: ['research'],
      aftermath: '多看一眼量价，后来 15 个交易日回落约 5%，省下一笔。',
    },
    adventure: { levelId: 'L08', scenario: 'fake_breakout' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L08-b',
    speaker: '朋友',
    text: '你持有多单，价格已涨了一截。朋友说期货也能做空，不如反手。',
    left: {
      label: '反手做空',
      effects: { capital: 7, confidence: 5, reputation: -9 },
      tags: ['contrarian'],
      aftermath: '后来 15 个交易日回落约 5%，反手做空的人吃到了下跌。',
    },
    right: {
      label: '多单硬扛',
      effects: { capital: -10, confidence: 5 },
      tags: ['stubborn'],
      aftermath: '后来 15 个交易日回落约 5%，多单拿着只换来浮亏。',
    },
    adventure: { levelId: 'L08', scenario: 'fake_breakout' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },

  // ---- L09 v_reversal，后 15 日约 +1%（先探底再拉回） ----
  {
    id: 'adv-L09-a',
    speaker: '亏钱的同事',
    text: '一只 A 股，两周从高点回落近两成，短均线远在长均线下方，大盘也在走弱。',
    left: {
      label: '先出来',
      effects: { risk: 6, confidence: -7 },
      tags: ['passive'],
      aftermath: '后来先探底再拉回，15 个交易日净涨约 1%，出来后它回到了原位。',
    },
    right: {
      label: '分批低吸',
      effects: { capital: 7, risk: -5, reputation: 5 },
      tags: ['contrarian'],
      aftermath: '后来先探底再拉回，15 个交易日净涨约 1%，分批买的成本更低。',
    },
    adventure: { levelId: 'L09', scenario: 'v_reversal' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L09-b',
    speaker: '自己',
    text: '近期日波动约五个点，5% 的止损线只有一天的波动，很容易被震出去。',
    left: {
      label: '放宽止损',
      effects: { capital: 6, risk: -9, confidence: 5 },
      tags: ['adaptive'],
      aftermath: '后来先探底再拉回，15 天净涨约 1%，宽止损没被扫掉。',
    },
    right: {
      label: '照旧不动',
      effects: { capital: -7, reputation: -8 },
      tags: ['passive'],
      aftermath: '后来先探底再拉回，15 天净涨约 1%，窄止损被震了出去。',
    },
    adventure: { levelId: 'L09', scenario: 'v_reversal' },
    is_sample: true,
  },

  // ---- L10 fake_breakout，后 15 日约 -5% ----
  {
    id: 'adv-L10-a',
    speaker: '短线朋友',
    text: '一只 A 股，一个月反弹近两成，今天放量冲到新高，收盘却没站稳前高。',
    left: {
      label: '重仓追进',
      effects: { capital: -10, risk: -8, confidence: 6 },
      tags: ['concentrated', 'trend'],
      aftermath: '后来 15 个交易日回落约 5%，追进去的重仓被套在高位。',
    },
    right: {
      label: '等回踩',
      effects: { risk: 8, reputation: 5, capital: 5 },
      tags: ['adaptive'],
      aftermath: '后来 15 个交易日回落约 5%，等回踩的人拿到了更好的价格。',
    },
    adventure: { levelId: 'L10', scenario: 'fake_breakout' },
    roles: ['stock', 'fund'],
    is_sample: true,
  },
  {
    id: 'adv-L10-b',
    speaker: '自己',
    text: '你已持仓，赚了近两成。历史上均线信号命中约五成，今天又冲高回落。',
    left: {
      label: '分批止盈',
      effects: { capital: 8, risk: 6, confidence: -10 },
      tags: ['adaptive'],
      aftermath: '后来 15 天回落约 5%，分批止盈让你留住了大半利润。',
    },
    right: {
      label: '再赌一把',
      effects: { capital: -9, confidence: 5 },
      tags: ['concentrated', 'stubborn'],
      aftermath: '后来 15 天回落约 5%，再赌一把换来了回吐。',
    },
    adventure: { levelId: 'L10', scenario: 'fake_breakout' },
    is_sample: true,
  },
];
