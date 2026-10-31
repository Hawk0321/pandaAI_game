/**
 * 结局插图与存活段位徽标（美术同事稍后交付，文件放进下面两个目录即可，无需改代码）：
 *   assets/endings/ending-<结局 id>.png          每个结局一张
 *   assets/endings/ending-<结局 id>-<角色>.png   通用 sp- 结局的角色换色版，优先使用
 *   assets/ui/badge-survival-tier-<1–6>.png      存活段位徽标
 * 找不到图就返回 undefined，界面只显示文字、不占位。
 */
import type { RoleId } from './types';
import type { SurvivalTierId } from './survival';

type AssetMap = Readonly<Record<string, string>>;

const endingModules = import.meta.glob('./assets/endings/ending-*.png', { eager: true, import: 'default' }) as AssetMap;
const badgeModules = import.meta.glob('./assets/ui/badge-survival-tier-*.png', { eager: true, import: 'default' }) as AssetMap;

/** 查找顺序：角色换色版 → 通用版 → undefined。单独导出便于用假的映射测试。 */
export function pickEndingArt(modules: AssetMap, endingId: string, role: RoleId): string | undefined {
  return modules[`./assets/endings/ending-${endingId}-${role}.png`] ?? modules[`./assets/endings/ending-${endingId}.png`];
}

export function endingArtwork(endingId: string, role: RoleId): string | undefined {
  return pickEndingArt(endingModules, endingId, role);
}

export function survivalBadge(tierId: SurvivalTierId): string | undefined {
  return badgeModules[`./assets/ui/badge-survival-${tierId}.png`];
}
