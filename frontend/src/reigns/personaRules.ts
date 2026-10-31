/**
 * 结局 → 兼容人格表（”死逻辑”部分），改用黑名单实现（快速收敛）。
 *
 * 为什么需要它：交易人格原本只由 9 种风格标签的累计次数决定，和结局互不相干，
 * 结果会出现”盲目自信（信心爆满）却拿到死扛刺猬””爆仓却是稳健老龟”这类矛盾。
 * 现在每个结局都有一张”明确矛盾不能用”的黑名单，engine.ts 的 resolvePersona 这样用它：
 *   1. 只按标签推出的人格（rawId）不在黑名单 → 直接采用（source = 'tally'）；
 *   2. 在黑名单 → 在全部 9 个人格里排除黑名单、用本局种子做加权伪随机选（source = 'seeded'），
 *      权重 = 1 + 该人格对应标签的次数，所以标签偏向它的人更容易被选中；同一局结果永远一致。
 *
 * 黑名单的依据：人物卡 archetype / rule（frontend/src/profile/persona.ts）与结局语义明确矛盾。
 *   bull 冲锋蛮牛：过度自信、重仓      hedgehog 死扛刺猬：处置效应、亏了不认
 *   shark 深海猎鲨：高确信集中下注     dolphin 冲浪海豚：趋势跟随
 *   owl 夜猫研究员：证据驱动           turtle 稳健老龟：风险预算、止损
 *   sloth 树懒观察员：观望、损失厌恶   crab 逆行螃蟹：逆向投资
 *   fox 灵活狐狸：没有固定套路
 *
 * 规则：只列明确矛盾，不在黑名单的都能用。未知 endingId 返回空数组（无禁止）。
 * 标签 ↔ 人格的对应关系在 engine.ts（TAG_TO_PERSONA）和 referral.ts（TAG_BY_PERSONA），这里不重复定义。
 * 模拟：4500 局随机游玩，黑名单方案的 seeded 占比约 6.6%，白名单方案约 48%；黑名单快速收敛到玩家选择。
 *
 * 示例内容，人物卡是趣味表达，不是投资建议（is_sample）。
 */
import type { PersonaId } from './types';

/** 全部 9 个人格，顺序固定（决定伪随机选择时的遍历顺序，改动会改变既有种子的结果）。 */
export const ALL_PERSONAS: readonly PersonaId[] = [
  'sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox',
];

type Blacklist = Readonly<Record<string, readonly PersonaId[]>>;

/** 三个角色共用同一套”属性语义”，所以普通结局按 `<kind>-<stat>` 写一次，再展开成 24 个 id。 */
const NORMAL_BY_SLOT: Blacklist = {
  // 资金触底：爆仓、清盘、空钱包 → 绝不是”稳健老龟”或”只看不动的树懒”
  'low-capital': ['turtle', 'sloth'],
  // 资金爆满：规模失控、溢出 → 不会是”只看不动的树懒”
  'high-capital': ['sloth'],
  // 风控触底（被清算/回撤红线/重仓失守）→ 不是谨慎派（turtle/sloth/owl 都设止损）
  'low-risk': ['turtle', 'sloth', 'owl'],
  // 风控爆满（空仓观众/业绩跑输/只看不买）→ 不是重仓冲的（bull/shark）
  'high-risk': ['bull', 'shark'],
  // 信心触底（纸手/投研散架/追涨杀跌）→ 不会是过度自信的（bull/shark）
  'low-confidence': ['bull', 'shark'],
  // 信心爆满（死多头/固执己见/盲目自信）→ 不会是怕亏损的树懒、谨慎的老龟
  'high-confidence': ['sloth', 'turtle'],
  // 口碑触底（大额赎回/反向指标/口碑扫地）→ 没有明确矛盾
  'low-reputation': [],
  // 口碑爆满（期望过载/KOL 的枷锁/被捧上神坛）→ 不会是”只看不动”的树懒
  'high-reputation': ['sloth'],
};

const SPECIAL: Blacklist = {
  // ---- 通用特殊结局 ----
  // 惯性思维：连续同向滑 → 不会是”没有固定套路”的灵活狐狸
  'sp-inertia': ['fox'],
  // 偏执专家：由最高标签决定，没有禁止
  'sp-obsessive': [],
  // 稳如磐石：四条数值都居中 → 不会是极端重仓冲动的（bull/shark）
  'sp-balanced': ['bull', 'shark'],
  // 行情亲历者：多次亲历奇遇 → 没有明确矛盾
  'sp-adventurer': [],
  // 活到收盘：走完全程没出大事 → 不会是”过度自信冲动”的蛮牛
  'sp-survivor': ['bull'],

  // ---- 基金经理专属 ----
  // 明星基金经理的倒计时：业绩与口碑双高、回撤控制松 → 不会是谨慎的树懒/老龟
  'sp-fund-star': ['sloth', 'turtle'],
  // 赢了业绩输了人心：业绩好但客户不买账 → 没有明确矛盾
  'sp-fund-unloved': [],
  // 追热点的明星：定力散了跟热点 → 不会是谨慎观望的树懒/老龟
  'sp-fund-chaser': ['sloth', 'turtle'],

  // ---- Web3 玩家专属 ----
  // 全仓梭哈的幸存者：保证金薄活下来 → 不会是谨慎的树懒/老龟
  'sp-crypto-allin': ['sloth', 'turtle'],
  // 登月成功：资产飙升且拿住 → 不会是”只看不动”的树懒
  'sp-crypto-moon': ['sloth'],
  // 安全的纸手：保证金很肥、手却抖 → 不会是重仓冲的（bull/shark）
  'sp-crypto-paper': ['bull', 'shark'],

  // ---- 炒股达人专属 ----
  // 荐股大 V：口碑与心态双高、仓位极限 → 不会是谨慎的树懒/老龟
  'sp-stock-guru': ['sloth', 'turtle'],
  // 套牢信徒：账户亏光却越跌越信 → 不会是”设止损”的老龟
  'sp-stock-bagholder': ['turtle'],
  // 空仓钉子户：风控拉满、口碑冷清 → 不会是重仓冲的（bull/shark）
  'sp-stock-hermit': ['bull', 'shark'],
};

const BLACKLIST: Blacklist = buildBlacklist();

function buildBlacklist(): Blacklist {
  const out: Record<string, readonly PersonaId[]> = { ...SPECIAL };
  for (const role of ['fund', 'crypto', 'stock']) {
    for (const [slot, banned] of Object.entries(NORMAL_BY_SLOT)) {
      const [kind, stat] = slot.split('-');
      out[`${role}-${kind}-${stat}`] = banned;
    }
  }
  return out;
}

/** 某结局下说得通的人格（白名单）= 全部人格 - 黑名单；未知 endingId 返回全部 9 个（无禁止）。 */
export function COMPATIBLE_PERSONAS(endingId: string): readonly PersonaId[] {
  const banned = Object.prototype.hasOwnProperty.call(BLACKLIST, endingId) ? BLACKLIST[endingId] : [];
  return ALL_PERSONAS.filter((p) => !banned.includes(p));
}

/** 全部已登记的结局 id（供测试和图鉴核对覆盖率）。 */
export function KNOWN_ENDING_IDS(): readonly string[] {
  return Object.keys(BLACKLIST);
}
