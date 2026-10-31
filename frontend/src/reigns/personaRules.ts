/**
 * 结局 → 兼容人格表（“死逻辑”部分）。
 *
 * 为什么需要它：交易人格原本只由 9 种风格标签的累计次数决定，和结局互不相干，
 * 结果会出现“盲目自信（信心爆满）却拿到死扛刺猬”“爆仓却是稳健老龟”这类矛盾。
 * 现在每个结局都有一张“这个结局下说得通的人格”清单，engine.ts 的 resolvePersona 这样用它：
 *   1. 只按标签推出的人格（rawId）在清单里 → 直接采用（source = 'tally'）；
 *   2. 不在清单里 → 在清单里用本局种子做加权伪随机选一个（source = 'seeded'），
 *      权重 = 1 + 该人格对应标签的次数，所以标签偏向它的人更容易被选中；同一局结果永远一致。
 *
 * 兼容表的依据：人物卡 archetype / rule（frontend/src/profile/persona.ts）与结局语义是否能讲得通。
 *   bull 冲锋蛮牛：过度自信、重仓      hedgehog 死扛刺猬：处置效应、亏了不认
 *   shark 深海猎鲨：高确信集中下注     dolphin 冲浪海豚：趋势跟随
 *   owl 夜猫研究员：证据驱动           turtle 稳健老龟：风险预算、止损
 *   sloth 树懒观察员：观望、损失厌恶   crab 逆行螃蟹：逆向投资
 *   fox 灵活狐狸：没有固定套路
 *
 * 规则：普通结局与专属结局每个 2–5 个人格（“偏执专家”例外，兼容全部 9 个，由本局最高标签决定）；
 * 未知 endingId 返回全部 9 个人格（兜底，不抛错）。
 * 标签 ↔ 人格的对应关系在 engine.ts（TAG_TO_PERSONA）和 referral.ts（TAG_BY_PERSONA），这里不重复定义。
 *
 * 示例内容，人物卡是趣味表达，不是投资建议（is_sample）。
 */
import type { PersonaId } from './types';

/** 全部 9 个人格，顺序固定（决定伪随机选择时的遍历顺序，改动会改变既有种子的结果）。 */
export const ALL_PERSONAS: readonly PersonaId[] = [
  'sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox',
];

type Table = Readonly<Record<string, readonly PersonaId[]>>;

/** 三个角色共用同一套“属性语义”，所以普通结局按 `<kind>-<stat>` 写一次，再展开成 24 个 id。 */
const NORMAL_BY_SLOT: Table = {
  // 资金触底：重仓看错、死扛不认、押对方向却被反转
  'low-capital': ['bull', 'hedgehog', 'shark', 'dolphin'],
  // 资金爆满：重注押中、顺势而为、研究得好，或者冲锋运气好
  'high-capital': ['shark', 'dolphin', 'owl', 'bull'],
  // 风控触底（被清算/回撤红线/重仓失守）：冲动重仓、集中下注、亏了还加仓
  'low-risk': ['bull', 'shark', 'hedgehog'],
  // 风控爆满（空仓观众/业绩跑输/只看不买）：止损拉满、只看不动、研究多出手少
  'high-risk': ['turtle', 'sloth', 'owl'],
  // 信心触底（纸手/投研散架/追涨杀跌）：不敢动、没主见、总逆着人群乱反应、保守到发抖
  'low-confidence': ['sloth', 'fox', 'crab', 'turtle'],
  // 信心爆满（死多头/固执己见/盲目自信）：过度自信、不认错、高确信重仓
  'high-confidence': ['bull', 'hedgehog', 'shark'],
  // 口碑触底（大额赎回/反向指标/口碑扫地）：冲动喊单、亏了不认被看穿、追热点被反转、逆着大家走不被理解
  'low-reputation': ['bull', 'hedgehog', 'dolphin', 'crab'],
  // 口碑爆满（期望过载/KOL 的枷锁/被捧上神坛）：敢冲的、重仓押中的、顺势吃到浪头的、研究扎实被信任的
  'high-reputation': ['bull', 'shark', 'dolphin', 'owl'],
};

const SPECIAL: Table = {
  // ---- 通用特殊结局 ----
  // 惯性思维：一直往同一边滑，要么顺势、要么死扛、要么冲到底、要么懒得动
  'sp-inertia': ['dolphin', 'hedgehog', 'bull', 'sloth'],
  // 偏执专家：同一套打法用到极致，本局最高标签是谁就是谁，所以九个都说得通
  'sp-obsessive': ALL_PERSONAS,
  // 稳如磐石：四条数值都居中，稳健、研究扎实或随机应变都能做到
  'sp-balanced': ['turtle', 'owl', 'fox'],
  // 行情亲历者：多次亲历奇遇行情，研究、应变、顺势、逆势都会在场
  'sp-adventurer': ['owl', 'fox', 'dolphin', 'crab'],
  // 活到收盘：没出大事走完全程，靠稳、靠等、靠研究或靠应变
  'sp-survivor': ['turtle', 'sloth', 'owl', 'fox'],

  // ---- 基金经理专属 ----
  // 明星基金经理的倒计时：业绩与口碑双高、回撤控制松动，敢冲、重仓、顺势
  'sp-fund-star': ['bull', 'shark', 'dolphin'],
  // 赢了业绩输了人心：业绩好但客户不买账，常见于逆向、集中、不认错或研究派的“不被理解”
  'sp-fund-unloved': ['crab', 'shark', 'hedgehog', 'owl'],
  // 追热点的明星：定力散了但客户还信，追热点的顺势派、冲动派、没有固定套路的应变派
  'sp-fund-chaser': ['dolphin', 'bull', 'fox'],

  // ---- Web3 玩家专属 ----
  // 全仓梭哈的幸存者：资产高、保证金薄，梭哈活下来
  'sp-crypto-allin': ['shark', 'bull', 'dolphin', 'hedgehog'],
  // 登月成功：资产飙升且拿得住，顺势、重仓、死拿，或研究得好
  'sp-crypto-moon': ['dolphin', 'shark', 'hedgehog', 'owl'],
  // 安全的纸手：保证金很肥、手却一抖就卖，观望、随机应变、保守、或总逆着叙事走
  'sp-crypto-paper': ['sloth', 'fox', 'turtle', 'crab'],

  // ---- 炒股达人专属 ----
  // 荐股大 V：口碑与心态双高、仓位极限，过度自信、重仓、顺势或研究派
  'sp-stock-guru': ['bull', 'shark', 'dolphin', 'owl'],
  // 套牢信徒：账户亏光却越跌越信，死扛、盲目、重仓押注，或干脆不动
  'sp-stock-bagholder': ['hedgehog', 'bull', 'shark', 'sloth'],
  // 空仓钉子户：风控拉满、口碑冷清，谨慎、观望或只研究不出手
  'sp-stock-hermit': ['sloth', 'turtle', 'owl'],
};

const TABLE: Table = buildTable();

function buildTable(): Table {
  const out: Record<string, readonly PersonaId[]> = { ...SPECIAL };
  for (const role of ['fund', 'crypto', 'stock']) {
    for (const [slot, personas] of Object.entries(NORMAL_BY_SLOT)) {
      const [kind, stat] = slot.split('-');
      out[`${role}-${kind}-${stat}`] = personas;
    }
  }
  return out;
}

/** 某结局下说得通的人格；未知 endingId 返回全部 9 个（兜底，不抛错）。 */
export function COMPATIBLE_PERSONAS(endingId: string): readonly PersonaId[] {
  return Object.prototype.hasOwnProperty.call(TABLE, endingId) ? TABLE[endingId] : ALL_PERSONAS;
}

/** 全部已登记的结局 id（供测试和图鉴核对覆盖率）。 */
export function KNOWN_ENDING_IDS(): readonly string[] {
  return Object.keys(TABLE);
}
