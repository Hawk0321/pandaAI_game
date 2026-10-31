/**
 * 结局页人物卡的“为什么是你”文案与依据胶囊。纯函数、全是规则，不用随机。
 * 最终人格由 engine.resolvePersona 给出，可能是标签推断的（tally），也可能因与结局矛盾而按结局气质配的（seeded）。
 * 所以文案只能说真实发生的事：次数、占比都来自 resolved，对不上结局时不把人格说成“选择次数”造成的。
 *
 * 文案分支表（自上而下，命中第一条）：
 *  1. tally + 有次数 + 唯一最高 + count>=3   “这局里你有 N 次选择偏X，占全部带风格倾向选择的 P%。”
 *  2. tally + 并列最高                        “你这局有好几种风格不相上下（各 N 次）……”，不写占比
 *  3. tally + 0<count<3                       “这局里你的选择比较分散，偏X的有 N 次……”，不写占比
 *  4. tally + count>=3 但不是最高（兜底）     “偏X的有 N 次，是其中一条线索。”，不写占比
 *  5. tally + count=0（标签全空的狐狸）        “这局里你的选择没有明显的偏向……”，不写数字
 *  6. seeded + count>0                        结局与人格的关系，补一句“你有 N 次选择偏X”，不写占比
 *  7. seeded + count=0                        结局与人格的关系，不提次数，不写 0 次 / 0%
 * 全部文案：不下定性结论，不给投资建议，不出现“买入/卖出/稳赚”；各角色用中性词，
 * 不出现“股友”“营业部”等只属于某个场景的词（见 ROLE_STYLE_WORD 的说法）。
 */
import { TAG_BY_PERSONA, TAG_PHRASE } from './referral';
import type { ResolvedPersona, RoleId } from './types';

/** “这类 X”的说法，按角色换，只用中性词。 */
const ROLE_STYLE_WORD: Readonly<Record<RoleId, string>> = {
  fund: '操盘思路',
  crypto: '玩法',
  stock: '打法',
};

/** 占比：count / total 四舍五入；total 为 0 时返回 null（调用方不应走到这里）。 */
function percent(count: number, total: number): number | null {
  return total > 0 ? Math.round((count / total) * 100) : null;
}

/** seeded 文案：说结局和人格的关系，次数只在 > 0 时才提。 */
function seededLine(resolved: ResolvedPersona, personaName: string, endingTitle: string, role: RoleId, phrase: string): string {
  const base = `“${endingTitle}”这样的结局，常见于${personaName}这类${ROLE_STYLE_WORD[role]}；你这局的选择比较分散，我们按结局的气质给你配了这张卡。`;
  return resolved.count > 0 ? `${base}你有 ${resolved.count} 次选择偏${phrase}。` : base;
}

/**
 * “为什么是你”一句话。
 * @param resolved engine.resolvePersona 的结果
 * @param personaName 最终人格名，如“冲锋蛮牛”
 * @param endingTitle 结局标题，如“清盘通知”
 * @param role 当前角色，只影响“打法 / 玩法 / 操盘思路”这类中性词
 */
export function buildWhyLine(resolved: ResolvedPersona, personaName: string, endingTitle: string, role: RoleId): string {
  const phrase = TAG_PHRASE[TAG_BY_PERSONA[resolved.id]];
  const { source, count, total, isTop, isTied } = resolved;

  if (source === 'seeded') return seededLine(resolved, personaName, endingTitle, role, phrase);

  if (count <= 0) return '这局里你的选择没有明显的偏向，所以更像是各种风格轮着来。';
  if (isTied) return `你这局有好几种风格不相上下（各 ${count} 次），其中偏${phrase}的和这个结局最搭。`;
  const pct = percent(count, total);
  if (isTop && count >= 3 && pct !== null) return `这局里你有 ${count} 次选择偏${phrase}，占全部带风格倾向选择的 ${pct}%。`;
  if (isTop) return `这局里你的选择比较分散，偏${phrase}的有 ${count} 次，是最明显的一条线索。`;
  return `这局里你的选择比较分散，偏${phrase}的有 ${count} 次，是其中一条线索。`;
}

export interface EvidenceChip {
  /** 胶囊种类，方便界面和测试区分。 */
  readonly kind: 'count' | 'share' | 'note';
  readonly label: string;
}

/**
 * 依据胶囊，最多 3 个，内容只来自 resolved 里的真实数字：
 *  - 次数：count>0 才放（“偏冲动 5 次”）
 *  - 占比：只在 tally、唯一最高、count>=3 时放，和 buildWhyLine 第 1 条同条件（“占比 31%”）
 *  - 说明：tally 且 isTop 时放“主要线索”（并列时放“并列最高”）
 *  seeded 时只放次数胶囊，count=0 则一个都不放。
 */
export function buildEvidenceChips(resolved: ResolvedPersona): EvidenceChip[] {
  const phrase = TAG_PHRASE[TAG_BY_PERSONA[resolved.id]];
  const { source, count, total, isTop, isTied } = resolved;
  if (count <= 0) return [];

  const chips: EvidenceChip[] = [{ kind: 'count', label: `偏${phrase} ${count} 次` }];
  if (source === 'seeded') return chips;

  const pct = percent(count, total);
  if (isTop && !isTied && count >= 3 && pct !== null) chips.push({ kind: 'share', label: `占比 ${pct}%` });
  if (isTied) chips.push({ kind: 'note', label: '并列最高' });
  else if (isTop) chips.push({ kind: 'note', label: '主要线索' });
  return chips.slice(0, 3);
}
