import type { PersonaId } from './types';

export const ALL_PERSONAS: readonly PersonaId[] = [
  'sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox',
  'puffin', 'raccoon', 'gecko', 'squirrel', 'bat', 'panda',
];

const OLD = ['sloth', 'bull', 'hedgehog', 'owl', 'shark', 'turtle', 'dolphin', 'crab', 'fox'] as const;
const RISK = ['bull', 'shark', 'hedgehog', 'puffin', 'bat', 'crab', 'raccoon'] as const;
const CAUTION = ['sloth', 'turtle', 'gecko', 'squirrel'] as const;
const RESEARCH = ['owl', 'squirrel', 'gecko', 'fox', 'puffin', 'raccoon', 'panda'] as const;
const TREND = ['dolphin', 'puffin', 'bull', 'hedgehog'] as const;
const CONTRARIAN = ['crab', 'raccoon', 'fox'] as const;
const ADAPTIVE = ['fox', 'panda', 'owl', 'squirrel'] as const;

const BY_SLOT: Readonly<Record<string, readonly PersonaId[]>> = {
  'low-capital': [...RISK, 'crab', 'raccoon', 'panda'],
  'high-capital': ['bull', 'puffin', 'shark', 'hedgehog', 'panda'],
  'low-risk': [...RISK, 'crab', 'raccoon'],
  'high-risk': [...CAUTION, 'owl', 'panda'],
  'low-confidence': ['panda', 'fox', 'sloth', 'puffin', 'raccoon'],
  'high-confidence': ['bull', 'hedgehog', 'shark', 'puffin', 'bat', 'raccoon'],
  'low-reputation': [...CONTRARIAN, 'owl', 'gecko'],
  'high-reputation': ['puffin', 'dolphin', 'bull', 'shark', 'bat'],
};

const SPECIAL: Readonly<Record<string, readonly PersonaId[]>> = {
  'sp-inertia': [...TREND, 'squirrel'],
  'sp-obsessive': [...OLD, ...ALL_PERSONAS.slice(9)],
  'sp-balanced': [...CAUTION, 'fox', 'panda', 'owl'],
  'sp-adventurer': [...TREND, ...CONTRARIAN, 'bat'],
  'sp-survivor': [...CAUTION, 'fox', 'panda', 'owl'],
  'sp-fund-star': ['bull', 'puffin', 'shark', 'hedgehog'],
  'sp-fund-unloved': [...RESEARCH, 'crab', 'raccoon'],
  'sp-fund-chaser': ['puffin', 'dolphin', 'panda', 'bat'],
  'sp-crypto-allin': ['bull', 'bat', 'hedgehog', 'shark'],
  'sp-crypto-moon': ['hedgehog', 'puffin', 'dolphin', 'bat'],
  'sp-crypto-paper': ['sloth', 'gecko', 'squirrel', 'panda'],
  'sp-stock-guru': ['bull', 'puffin', 'dolphin', 'hedgehog', 'raccoon'],
  'sp-stock-bagholder': ['hedgehog', 'raccoon', 'crab', 'panda'],
  'sp-stock-hermit': ['sloth', 'gecko', 'squirrel', 'turtle'],
};

/** Stable affinity lookup for all 38 endings and 15 personas; no random downgrade. */
export function COMPATIBLE_PERSONAS(endingId: string): readonly PersonaId[] {
  if (SPECIAL[endingId]) return [...new Set(SPECIAL[endingId])];
  const match = endingId.match(/^(?:fund|crypto|stock)-(low|high)-(capital|risk|confidence|reputation)$/);
  return match ? [...new Set(BY_SLOT[`${match[1]}-${match[2]}`])] : ALL_PERSONAS;
}

export function KNOWN_ENDING_IDS(): readonly string[] {
  return Object.keys(SPECIAL);
}
