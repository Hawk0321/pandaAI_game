import type { Card, RoleId } from './types';

/**
 * 扩充事件卡（只用已有人物）。示例内容，原创虚构，不含真实公司、人物、币种或代码，不构成投资建议。
 * 题材：生活与人情压力、信息噪音、情绪与身体状态、复盘与学习、风控意外、社交声誉。
 * 槽位语义：capital=钱，risk=安全垫，confidence=定力，reputation=外界认可。
 * 共享卡（id 前缀 "more-"）正文保持中性；角色专属卡 roles 只填一个角色。
 */

/** 给一组卡统一加上单一角色限定。 */
const forRole = (role: RoleId, cards: readonly Omit<Card, 'roles'>[]): readonly Card[] =>
  cards.map((c) => ({ ...c, roles: [role] }));

/** 三角色共享。 */
const SHARED_MORE: readonly Card[] = [
  {
    id: 'more-wedding-gift',
    speaker: '亲友',
    text: '表妹下个月结婚，份子钱和请假都等你拿主意。',
    left: { label: '随个大份', effects: { capital: -8, reputation: 9 }, tags: ['adaptive'], aftermath: '后来全家都夸你懂事，账户却瘦了一圈。' },
    right: { label: '心意到就好', effects: { capital: 6, reputation: -7 }, tags: ['cautious'], aftermath: '后来饭桌上有人提起这事，你笑着岔开了。' },
    is_sample: true,
  },
  {
    id: 'more-push-flood',
    speaker: '财经 App',
    text: '你订阅的资讯一天推送两百条，手机震个不停。',
    left: { label: '全部退订', effects: { confidence: 8, reputation: -6 }, tags: ['contrarian'], aftermath: '后来你耳根清净，只是聊天时常插不上话。' },
    right: { label: '一条不落', effects: { confidence: -8, reputation: 6 }, tags: ['research', 'trend'], aftermath: '后来你什么都知道一点，却越来越难下决定。' },
    is_sample: true,
  },
  {
    id: 'more-rumor-screenshot',
    speaker: '群友',
    text: '群里疯传一张“内部会议纪要”截图，来源不明。',
    left: { label: '先查出处', effects: { risk: 7, capital: -5 }, tags: ['research'], aftermath: '后来截图被证实是拼的，你错过的只是噪音。' },
    right: { label: '抢先行动', effects: { capital: 8, risk: -9 }, tags: ['impulsive', 'trend'], aftermath: '后来消息被辟谣，你跑得比辟谣还快。' },
    is_sample: true,
  },
  {
    id: 'more-gym-card',
    speaker: '朋友',
    text: '他拉你办张健身卡，说身体好了才扛得住回撤。',
    left: { label: '办一张', effects: { capital: -6, confidence: 9 }, tags: ['adaptive'], aftermath: '后来你跑完五公里，看账户波动也淡定多了。' },
    right: { label: '没时间', effects: { capital: 5, confidence: -7 }, tags: ['concentrated'], aftermath: '后来那张卡被朋友转送了别人，你还在加班。' },
    is_sample: true,
  },
  {
    id: 'more-old-journal',
    speaker: '自己',
    text: '翻出一年前的交易日记，当时的判断错得离谱。',
    left: { label: '逐条复盘', effects: { confidence: -7, risk: 9 }, tags: ['research'], aftermath: '后来你发现，同一个错你犯了整整七次。' },
    right: { label: '合上本子', effects: { confidence: 6, risk: -7 }, tags: ['stubborn'], aftermath: '后来那本日记又回到了抽屉最深处。' },
    is_sample: true,
  },
  {
    id: 'more-cut-winners',
    speaker: '导师',
    text: '他看完你的记录：赚一点就跑，亏了却死扛。',
    left: { label: '照着改', effects: { capital: 7, confidence: -8 }, tags: ['adaptive'], aftermath: '后来新规矩别扭了一个月，才慢慢顺手。' },
    right: { label: '坚持己见', effects: { capital: -7, confidence: 8 }, tags: ['stubborn', 'contrarian'], aftermath: '后来你的胜率依旧好看，盈亏比依旧难看。' },
    is_sample: true,
  },
  {
    id: 'more-fat-finger',
    speaker: '自己',
    text: '下单时多按了一个零，成交回报已经弹了出来。',
    left: { label: '立刻平掉', effects: { capital: -9, risk: 8 }, tags: ['cautious'], aftermath: '后来你给下单界面加了二次确认。' },
    right: { label: '将错就错', effects: { capital: 5, risk: -12 }, tags: ['concentrated', 'impulsive'], aftermath: '后来行情帮了你一把，你却一夜没睡好。' },
    is_sample: true,
  },
  {
    id: 'more-critic-article',
    speaker: '财经记者',
    text: '他写文章唱反调，点名说你的观点站不住脚。',
    left: { label: '公开回应', effects: { reputation: 8, confidence: -7 }, tags: ['contrarian'], aftermath: '后来你们在评论区吵了三天，热度涨了不少。' },
    right: { label: '不予理会', effects: { reputation: -6, confidence: 7 }, tags: ['passive'], aftermath: '后来那篇文章沉了，没几个人记得。' },
    is_sample: true,
  },
  {
    id: 'more-roommate-panic',
    speaker: '恐慌的室友',
    text: '他凌晨敲门：自己已经全清仓了，劝你也赶紧跑。',
    left: { label: '跟着减仓', effects: { capital: -7, risk: 9 }, tags: ['trend', 'cautious'], aftermath: '后来市场缓了过来，室友睡得比你香。' },
    right: { label: '反手加点', effects: { capital: 9, risk: -8 }, tags: ['contrarian'], aftermath: '后来恐慌过去，你在室友面前没敢多提。' },
    is_sample: true,
  },
  {
    id: 'more-course-homework',
    speaker: '网课讲师',
    text: '课程留了作业：用一年的记录手算胜率和盈亏比。',
    left: { label: '熬夜算完', effects: { confidence: -7, risk: 8 }, tags: ['research'], aftermath: '后来你第一次看清，自己的钱是怎么亏的。' },
    right: { label: '抄个答案', effects: { confidence: 6, reputation: -6 }, tags: ['passive'], aftermath: '后来讲师在课上点评作业，你低头不语。' },
    is_sample: true,
  },
  {
    id: 'more-mystery-forecast',
    speaker: '神秘人',
    text: '一个陌生账号每天准点发预告，已经连对五次。',
    left: { label: '跟一次', effects: { capital: 9, risk: -9 }, tags: ['trend', 'impulsive'], aftermath: '后来第六次预告错了，账号也注销了。' },
    right: { label: '拉黑', effects: { risk: 7, confidence: -5 }, tags: ['contrarian', 'cautious'], aftermath: '后来你听说，这种账号同时发了正反两版。' },
    is_sample: true,
  },
  {
    id: 'more-family-dinner',
    speaker: '家人',
    text: '过年饭桌上，长辈追问你今年到底赚了多少。',
    left: { label: '如实说', effects: { reputation: -7, confidence: 6 }, tags: ['passive'], aftermath: '后来长辈叹了口气，你却觉得一身轻松。' },
    right: { label: '往多了说', effects: { reputation: 9, confidence: -8 }, tags: ['impulsive'], aftermath: '后来亲戚们排队来问你带不带。' },
    is_sample: true,
  },
  {
    id: 'more-partner-invite',
    speaker: '老同事',
    text: '他辞职全职交易，邀请你一起合伙干。',
    left: { label: '一起干', effects: { capital: -8, confidence: 9 }, tags: ['concentrated'], aftermath: '后来你们租了个小办公室，房租先吃掉一截。' },
    right: { label: '留在原地', effects: { capital: 6, confidence: -6 }, tags: ['cautious', 'passive'], aftermath: '后来他偶尔发来消息，你总忍不住想如果。' },
    is_sample: true,
  },
  {
    id: 'more-platform-outage',
    speaker: '平台客服',
    text: '系统维护延长了两小时，你的单子悬在半空。',
    left: { label: '另找渠道', effects: { capital: -6, risk: 8 }, tags: ['adaptive'], aftermath: '后来你多开了一个备用账户，以防万一。' },
    right: { label: '等它恢复', effects: { risk: -8, confidence: 10 }, tags: ['passive'], aftermath: '后来系统恢复了，价格也早已不是那个价。' },
    is_sample: true,
  },
  {
    id: 'more-failure-talk',
    speaker: '同行',
    text: '交流会请你讲一次自己的失败案例。',
    left: { label: '讲真事', effects: { reputation: 8, confidence: -7 }, tags: ['research'], aftermath: '后来台下有人专门来道谢，说少踩了个坑。' },
    right: { label: '只讲成功', effects: { reputation: -6, confidence: 7 }, tags: ['stubborn'], aftermath: '后来听众记住的只有你的自信。' },
    is_sample: true,
  },
  {
    id: 'more-anniversary',
    speaker: '家人',
    text: '纪念日正好撞上一波大行情，你答应过陪家人吃饭。',
    left: { label: '准时赴约', effects: { capital: -7, reputation: 8 }, tags: ['passive'], aftermath: '后来那顿饭吃得很好，行情也没等你。' },
    right: { label: '边吃边看', effects: { capital: 8, reputation: -9 }, tags: ['concentrated'], aftermath: '后来家人把你的手机收进了包里。' },
    is_sample: true,
  },
  {
    id: 'more-fever',
    speaker: '自己',
    text: '发烧到三十九度，屏幕上的数字都在晃。',
    left: { label: '全部暂停', effects: { capital: -6, risk: 8 }, tags: ['passive'], aftermath: '后来你躺了三天，回来发现一切照旧。' },
    right: { label: '硬撑操作', effects: { capital: 6, confidence: -6, risk: -9 }, tags: ['stubborn'], aftermath: '后来你看不懂自己那几天下的单。' },
    is_sample: true,
  },
  {
    id: 'more-take-profit-plan',
    speaker: '前辈',
    text: '前辈劝你把止盈也写进计划，别只想着止损。',
    left: { label: '写进去', effects: { capital: -5, risk: 7 }, tags: ['cautious'], aftermath: '后来你按计划下了车，少赚了最后一段。' },
    right: { label: '让利润跑', effects: { capital: 5, risk: -7 }, tags: ['trend', 'stubborn'], aftermath: '后来利润跑了一阵，又跑回去一半。' },
    is_sample: true,
  },
];

/** 基金经理专属。 */
const FUND_MORE: readonly Card[] = forRole('fund', [
  {
    id: 'fund-compliance-chat',
    speaker: '合规专员',
    text: '合规抽查聊天记录，发现你在私人群里聊过持仓方向。',
    left: { label: '主动说明', effects: { reputation: -6, risk: 8 }, tags: ['cautious'], aftermath: '后来你写了份情况说明，此事就此翻篇。' },
    right: { label: '说是闲聊', effects: { risk: -9, reputation: 6 }, tags: ['stubborn'], aftermath: '后来合规又约你喝了两次茶。' },
    is_sample: true,
  },
  {
    id: 'fund-sector-limit',
    speaker: '风控专员',
    text: '风控提示：单一行业的持仓已逼近比例上限。',
    left: { label: '按规减持', effects: { capital: -7, risk: 9 }, tags: ['adaptive'], aftermath: '后来那个行业继续涨，你只能看着。' },
    right: { label: '申请豁免', effects: { capital: 10, risk: -8, reputation: -5 }, tags: ['concentrated'], aftermath: '后来豁免批了，风控把你列进重点名单。' },
    is_sample: true,
  },
  {
    id: 'fund-junior-pick',
    speaker: '研究员',
    text: '入职半年的研究员力推一只冷门标的，会上没人接话。',
    left: { label: '给个小仓位', effects: { capital: -6, reputation: 8 }, tags: ['contrarian', 'research'], aftermath: '后来研究员干劲十足，报告越写越扎实。' },
    right: { label: '等等再说', effects: { reputation: -6, confidence: 5 }, tags: ['passive'], aftermath: '后来那份报告压在了邮箱底部。' },
    is_sample: true,
  },
  {
    id: 'fund-new-product',
    speaker: '销售总监',
    text: '公司要发新产品，想让你兼管，管理规模能翻倍。',
    left: { label: '接下来', effects: { reputation: 9, confidence: -8 }, tags: ['trend'], aftermath: '后来你一天开八个会，研究时间少了一半。' },
    right: { label: '专心老产品', effects: { reputation: -7, confidence: 5 }, tags: ['concentrated'], aftermath: '后来新产品换了别人，老持有人更信你了。' },
    is_sample: true,
  },
  {
    id: 'fund-window-dressing',
    speaker: '投资总监',
    text: '总监建议季末前砍掉回撤最大的那只，报表好看点。',
    left: { label: '砍掉', effects: { capital: -7, reputation: 7 }, tags: ['adaptive'], aftermath: '后来报表干净了，那只却在下季度反弹。' },
    right: { label: '逻辑没变', effects: { capital: 8, reputation: -8 }, tags: ['research'], aftermath: '后来季报很难看，但你睡得踏实。' },
    is_sample: true,
  },
  {
    id: 'fund-weekly-view',
    speaker: '渠道经理',
    text: '渠道希望你每周写一篇市场观点，给客户打打气。',
    left: { label: '每周都写', effects: { reputation: 8, risk: -7 }, tags: ['trend', 'impulsive'], aftermath: '后来有一篇写得太满，被客户截图追问。' },
    right: { label: '只写季报', effects: { reputation: -7, risk: 7 }, tags: ['cautious'], aftermath: '后来渠道换了家更勤快的合作。' },
    is_sample: true,
  },
]);

/** Web3 玩家专属。 */
const CRYPTO_MORE: readonly Card[] = forRole('crypto', [
  {
    id: 'crypto-seed-backup',
    speaker: '安全研究员',
    text: '你的助记词只抄在一张便利贴上，贴在显示器背面。',
    left: { label: '做冷备份', effects: { capital: -5, risk: 9 }, tags: ['cautious'], aftermath: '后来你把备份分成两份，藏在两个地方。' },
    right: { label: '回头再说', effects: { risk: -8, capital: 5 }, tags: ['passive'], aftermath: '后来便利贴被保洁阿姨顺手扔了。' },
    is_sample: true,
  },
  {
    id: 'crypto-gas-rush',
    speaker: '协议文档',
    text: '新池子开放首日，链上手续费贵到一笔几十块。',
    left: { label: '等一等', effects: { capital: -6, risk: 6 }, tags: ['contrarian'], aftermath: '后来手续费降了，最肥的那段也过去了。' },
    right: { label: '硬挤进去', effects: { capital: 8, risk: -8 }, tags: ['impulsive', 'trend'], aftermath: '后来你算了算，手续费吃掉了三成收益。' },
    is_sample: true,
  },
  {
    id: 'crypto-advisor-offer',
    speaker: '匿名开发者',
    text: '他邀请你当新项目顾问，报酬是一大笔代币。',
    left: { label: '签了', effects: { capital: 6, reputation: -8 }, tags: ['concentrated'], aftermath: '后来项目方一出事，社区就来翻你的推文。' },
    right: { label: '婉拒', effects: { capital: -5, reputation: 7 }, tags: ['cautious'], aftermath: '后来有人夸你爱惜羽毛，你只是笑笑。' },
    is_sample: true,
  },
  {
    id: 'crypto-ama-host',
    speaker: '社区管理员',
    text: '管理员请你在社区开答疑频道，答错可能被群嘲。',
    left: { label: '开频道', effects: { reputation: 9, confidence: -7 }, tags: ['research'], aftermath: '后来为了不答错，你把文档读了三遍。' },
    right: { label: '继续潜水', effects: { reputation: -6, confidence: 6 }, tags: ['passive'], aftermath: '后来别人开了频道，粉丝涨得飞快。' },
    is_sample: true,
  },
  {
    id: 'crypto-whale-exit',
    speaker: '链上分析员',
    text: '他发现你常用的一个协议，大户正在悄悄撤资。',
    left: { label: '跟着撤', effects: { capital: -6, risk: 9 }, tags: ['trend', 'adaptive'], aftermath: '后来协议爆出漏洞，你庆幸走得早。' },
    right: { label: '当作噪音', effects: { capital: 5, risk: -8 }, tags: ['stubborn'], aftermath: '后来收益照常到账，心里却总有根刺。' },
    is_sample: true,
  },
  {
    id: 'crypto-withdraw-pause',
    speaker: '交易所客服',
    text: '提币通道临时关闭，客服只说“很快恢复”。',
    left: { label: '换个平台', effects: { capital: -6, risk: 8 }, tags: ['adaptive'], aftermath: '后来你学会了，资产别全放一个篮子。' },
    right: { label: '耐心等', effects: { capital: 5, risk: -8 }, tags: ['stubborn'], aftermath: '后来通道开了，你等出了一身冷汗。' },
    is_sample: true,
  },
]);

/** 炒股达人专属。 */
const STOCK_MORE: readonly Card[] = forRole('stock', [
  {
    id: 'stock-auntie-tip',
    speaker: '营业部大妈',
    text: '大妈说，她跳广场舞的姐妹们都在买同一只票。',
    left: { label: '当反指标', effects: { capital: -6, risk: 7 }, tags: ['contrarian'], aftermath: '后来那只票涨了一周，然后跌了一个月。' },
    right: { label: '也买点', effects: { capital: 7, reputation: -7 }, tags: ['trend'], aftermath: '后来大妈见你就问：小伙子还拿着没？' },
    is_sample: true,
  },
  {
    id: 'stock-forum-column',
    speaker: '论坛版主',
    text: '版主邀你在论坛开专栏，条件是每天都要给出方向。',
    left: { label: '开专栏', effects: { reputation: 9, risk: -8 }, tags: ['impulsive'], aftermath: '后来你为了凑方向，自己都信了一半。' },
    right: { label: '只写复盘', effects: { reputation: -6, risk: 5 }, tags: ['research'], aftermath: '后来看的人不多，留下的都是认真的。' },
    is_sample: true,
  },
  {
    id: 'stock-base-position',
    speaker: '老股民',
    text: '老股民劝你：做 T 要有底仓，别空着手去追高。',
    left: { label: '留底仓', effects: { capital: 6, confidence: -6 }, tags: ['adaptive'], aftermath: '后来你每天做点差价，成本慢慢降了下来。' },
    right: { label: '空仓等机会', effects: { capital: -6, confidence: 7 }, tags: ['passive'], aftermath: '后来机会来了两次，你都嫌不够完美。' },
    is_sample: true,
  },
  {
    id: 'stock-fee-discount',
    speaker: '券商客户经理',
    text: '客户经理说，转户过来佣金能打对折。',
    left: { label: '转过去', effects: { capital: 6, confidence: -6 }, tags: ['adaptive'], aftermath: '后来你填了一下午表格，省下的够吃顿好的。' },
    right: { label: '懒得折腾', effects: { capital: -6, confidence: 5 }, tags: ['stubborn'], aftermath: '后来每次看到手续费，你都会想起他。' },
    is_sample: true,
  },
  {
    id: 'stock-auction-rush',
    speaker: '短线朋友',
    text: '他说明早有只票大概率高开，让你集合竞价去抢。',
    left: { label: '挂单抢', effects: { capital: 6, risk: -9 }, tags: ['impulsive', 'concentrated'], aftermath: '后来高开低走，你在半山腰站了一天。' },
    right: { label: '只看不碰', effects: { capital: -5, risk: 7 }, tags: ['cautious'], aftermath: '后来朋友晒了单，你淡定地点了个赞。' },
    is_sample: true,
  },
  {
    id: 'stock-proxy-account',
    speaker: '亏钱的同事',
    text: '他想把账户交给你代操，说亏了也不怪你。',
    left: { label: '帮他看看', effects: { reputation: 8, risk: -8 }, tags: ['concentrated'], aftermath: '后来他一天问你八遍，你开始后悔了。' },
    right: { label: '只给建议', effects: { reputation: -6, risk: 7 }, tags: ['cautious'], aftermath: '后来他自己学着止损，亏得少了些。' },
    is_sample: true,
  },
]);

export const MORE_CARDS: readonly Card[] = [...SHARED_MORE, ...FUND_MORE, ...CRYPTO_MORE, ...STOCK_MORE];
