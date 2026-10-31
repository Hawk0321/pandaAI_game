// 界面接入用的纯函数：该放哪首曲子、哪些数值进了危险区、结局放哪个音效。
// 阈值直接取自 endings.ts 的 ENDING_THRESHOLDS，不另写常量。
import { ENDING_THRESHOLDS } from '../endings';
import { STAT_KEYS } from '../types';
import type { RoleId, StatKey, Stats } from '../types';
import type { BgmId, SfxId } from './audioTypes';

/** 游戏中的基础曲（安全区版本），紧张层由 audio.setTension 切换。 */
export function playBgmFor(role: RoleId): BgmId {
  return `bgm-play-${role}-safe`;
}

/** 当前处于危险区的数值：<= low 或 >= high。 */
export function dangerStats(stats: Stats): readonly StatKey[] {
  return STAT_KEYS.filter((key) => stats[key] <= ENDING_THRESHOLDS.low || stats[key] >= ENDING_THRESHOLDS.high);
}

export function isInDanger(stats: Stats): boolean {
  return dangerStats(stats).length > 0;
}

/** 这一步新进入危险区的数值（上一步不在、这一步在）。 */
export function newlyDangerous(prev: Stats, next: Stats): readonly StatKey[] {
  const before = new Set(dangerStats(prev));
  return dangerStats(next).filter((key) => !before.has(key));
}

/** 结局音效：任一数值触底 -> final-low，爆满 -> final-high，都没有（特殊/存活结局）-> null。 */
export function finalSfxFor(stats: Stats): SfxId | null {
  if (STAT_KEYS.some((key) => stats[key] <= 0)) return 'sfx-final-low';
  if (STAT_KEYS.some((key) => stats[key] >= 100)) return 'sfx-final-high';
  return null;
}
