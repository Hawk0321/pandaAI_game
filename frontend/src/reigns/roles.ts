/**
 * 角色设定：每个角色有自己的一组四条属性（名字、含义、触底/爆满的意思）。
 *
 * 设计要点：引擎里仍然是四个固定“槽位”（StatKey），槽位语义对所有角色一致，
 * 这样一张事件卡可以被多个角色共享，只是在不同角色眼里叫法不同：
 *   capital    = 钱：主资产 / 业绩
 *   risk       = 安全垫：风控 / 抗风险能力
 *   confidence = 定力：心态 / 信念
 *   reputation = 外界认可：别人怎么看你
 * 触底 = 数值到 0；爆满 = 数值到 100。两头都是坏结局，所以 hint 同时写了两种含义。
 *
 * 示例内容，不构成投资建议（is_sample）。
 */
import type { RoleId, StatKey } from './types';

export interface StatDef {
  readonly label: string;
  /** 一句话说明这条属性代表什么，界面可做提示。 */
  readonly meaning: string;
  /** 触底（到 0）意味着什么。 */
  readonly lowHint: string;
  /** 爆满（到 100）为什么也是坏事。 */
  readonly highHint: string;
}

export interface RoleDef {
  readonly id: RoleId;
  readonly name: string;
  readonly emoji: string;
  readonly tagline: string;
  /** 开局的一两句背景介绍。 */
  readonly intro: string;
  /** 一局的自称，如“这个季度”。结局文案可引用。 */
  readonly period: string;
  readonly stats: Readonly<Record<StatKey, StatDef>>;
}

export const ROLES: Readonly<Record<RoleId, RoleDef>> = {
  fund: {
    id: 'fund',
    name: '基金经理',
    emoji: '🏦',
    tagline: '管着别人的钱，每个决定都要对持有人负责',
    intro: '你接手了一只新发行的混合基金。净值每天公布，持有人每天在看。',
    period: '这个季度',
    stats: {
      capital: { label: '业绩', meaning: '基金净值和排名', lowHint: '净值惨淡，被清盘线盯上', highHint: '业绩冲得太高，规模涌入、风格漂移' },
      risk: { label: '回撤控制', meaning: '回撤和仓位的安全垫', lowHint: '回撤失控，触发风控红线', highHint: '管得太死，业绩跑不赢基准' },
      confidence: { label: '投研定力', meaning: '团队的信念和判断一致性', lowHint: '被市场噪音带着走，投研体系散架', highHint: '过度坚信自己的框架，听不进反对意见' },
      reputation: { label: '客户信任', meaning: '持有人和销售渠道的信任', lowHint: '大额赎回，渠道不再推荐', highHint: '被捧成明星基金经理，期望高到无法兑现' },
    },
  },
  crypto: {
    id: 'crypto',
    name: 'Web3 玩家',
    emoji: '🪙',
    tagline: '24 小时不打烊的市场，链上、合约和叙事一起飞',
    intro: '你在几个链上协议里都有仓位，群里每小时都有人喊“下一个百倍币”。',
    period: '这一轮周期',
    stats: {
      capital: { label: '钱包资产', meaning: '钱包里所有资产折合的价值', lowHint: '资产归零，只剩一个空钱包', highHint: '暴富后飘了，开始相信自己是天选之子' },
      risk: { label: '保证金健康', meaning: '距离被清算有多远', lowHint: '被清算，仓位被系统强平', highHint: '仓位轻到几乎不动，错过整轮行情' },
      confidence: { label: '钻石手', meaning: '拿得住的定力', lowHint: '纸手，一有风吹草动就割肉', highHint: '钻石手变成死多头，归零也不卖' },
      reputation: { label: '社区声量', meaning: '推特和社群里别人怎么看你', lowHint: '被社区拉黑，成了反向指标', highHint: '被捧成 KOL，反而不敢说真话' },
    },
  },
  stock: {
    id: 'stock',
    name: '炒股达人',
    emoji: '📈',
    tagline: '一个人、一块屏、一个自选股，盈亏自己扛',
    intro: '你在股票群里小有名气，账户里是自己攒下的本金，每天盯盘到收市。',
    period: '这一年',
    stats: {
      capital: { label: '账户资金', meaning: '账户里的本金和浮盈', lowHint: '爆仓离场，本金亏光', highHint: '一夜暴富，从此觉得市场是提款机' },
      risk: { label: '仓位风控', meaning: '止损纪律和仓位安全垫', lowHint: '重仓失守，一次回撤就被打穿', highHint: '风控过严，畏手畏脚，什么都不敢买' },
      confidence: { label: '心态', meaning: '盘中的情绪稳定度', lowHint: '心态崩盘，追涨杀跌', highHint: '盲目自信，觉得自己看穿了市场' },
      reputation: { label: '股友口碑', meaning: '股友群里别人对你的评价', lowHint: '口碑扫地，没人再信你的票', highHint: '被捧上神坛，说错一句就成靶子' },
    },
  },
};

/** 第四个角色：待开发。选角界面显示为灰色卡片，不可进入。 */
export const COMING_SOON_ROLE = {
  name: '更多身份',
  emoji: '🔒',
  tagline: '待开发',
} as const;

export const ROLE_IDS: readonly RoleId[] = ['fund', 'crypto', 'stock'];
