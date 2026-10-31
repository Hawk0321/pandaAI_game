import type { RoleId, StatKey } from './types';
import { ENDING_THRESHOLDS } from './endings';

const iconModules = import.meta.glob('./assets/icons/icon-*.png', { eager: true, import: 'default' }) as Record<string, string>;
const hintModules = import.meta.glob('./assets/icons/hint-*.png', { eager: true, import: 'default' }) as Record<string, string>;

export type StatVisualState = 'normal' | 'low' | 'high';

export function statVisualState(value: number): StatVisualState {
  if (value <= ENDING_THRESHOLDS.low) return 'low';
  if (value >= ENDING_THRESHOLDS.high) return 'high';
  return 'normal';
}

export function statIcon(role: RoleId, stat: StatKey, value: number): string {
  return iconModules[`./assets/icons/icon-${role}-${stat}-${statVisualState(value)}.png`];
}

export function hintIcon(stat: StatKey): string {
  return hintModules[`./assets/icons/hint-${stat}-a.png`];
}
