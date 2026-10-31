import { ADVENTURES } from './adventures';
import { CARDS } from './cards';
import type { Card } from './types';

/** 日常卡 + 奇遇卡，界面和引擎都用它。 */
export const ALL_CARDS: readonly Card[] = [...CARDS, ...ADVENTURES];
