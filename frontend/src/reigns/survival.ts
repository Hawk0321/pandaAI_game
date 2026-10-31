/**
 * “活了多少关”：段位、加时进度、本机最佳纪录、加时抖动文案。全部是纯函数（存储通过参数注入）。
 * 玩家口中的“关”就是 state.turn（已经做过的决定数）。
 * 段位名称和区间与美术说明（徽标 badge-survival-tier-N.png）一一对应，改动前先和美术同事对齐。
 * 示例内容，不构成投资建议（is_sample）。
 */
import { ROLES, ROLE_IDS } from './roles';
import { OVERTIME_START, STAT_KEYS } from './types';
import type { Effects, RoleId } from './types';

export type SurvivalTierId = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4' | 'tier-5' | 'tier-6';

export interface SurvivalTier {
  readonly id: SurvivalTierId;
  /** 1–6，越大视觉越突出。 */
  readonly level: number;
  readonly name: string;
  /** 本段最少关数（含）。 */
  readonly min: number;
  /** 本段最多关数（含）；最高段为 null。 */
  readonly max: number | null;
}

/** 加时之后再活这么多关，就是“市场传说”（OVERTIME_START = 40 时为 55）。 */
export const LEGEND_EXTRA_TURNS = 15;
export const LEGEND_TURN = OVERTIME_START + LEGEND_EXTRA_TURNS;

export const SURVIVAL_TIERS: readonly SurvivalTier[] = [
  { id: 'tier-1', level: 1, name: '试水', min: 1, max: 9 },
  { id: 'tier-2', level: 2, name: '站稳脚跟', min: 10, max: 19 },
  { id: 'tier-3', level: 3, name: '老练', min: 20, max: 29 },
  { id: 'tier-4', level: 4, name: '穿越周期', min: 30, max: OVERTIME_START - 1 },
  { id: 'tier-5', level: 5, name: '加时幸存者', min: OVERTIME_START, max: LEGEND_TURN - 1 },
  { id: 'tier-6', level: 6, name: '市场传说', min: LEGEND_TURN, max: null },
];

/** 非数字、负数按 0 处理，小数向下取整。 */
const toTurn = (turn: number): number => (Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0);

/** 关数 → 段位。0 关（理论上不会出现）也归入最低段。 */
export function survivalTier(turn: number): SurvivalTier {
  const t = toTurn(turn);
  const reached = SURVIVAL_TIERS.filter((tier) => t >= tier.min);
  return reached.length > 0 ? reached[reached.length - 1] : SURVIVAL_TIERS[0];
}

/** 每档一句短文案（≤ 20 字），按角色区分。 */
const TIER_BLURBS: Readonly<Record<SurvivalTierId, Readonly<Record<RoleId, string>>>> = {
  'tier-1': {
    fund: '产品刚成立，净值曲线还没画完',
    crypto: '钱包刚连上，行情就先教你做人',
    stock: '刚开户的手感，市场先上了一课',
  },
  'tier-2': {
    fund: '熬过了第一份季报',
    crypto: '第一轮插针没把你扫下车',
    stock: '止损单开始真的派上用场',
  },
  'tier-3': {
    fund: '持有人开始记住你的名字',
    crypto: '叙事轮动了几次，你还在牌桌上',
    stock: '涨跌都见过了，手不再抖',
  },
  'tier-4': {
    fund: '一轮牛熊，规模和心态都还在',
    crypto: '熬过寒冬，钱包还没清零',
    stock: '牛熊各走一遍，账户还活着',
  },
  'tier-5': {
    fund: '任期早已走满，你还在加时',
    crypto: '别人早已离场，你还在链上',
    stock: '收盘铃响过了，你还在盘中',
  },
  'tier-6': {
    fund: '加时赛里活成了同行的教材',
    crypto: '社区把你的钱包写进了传说',
    stock: '营业部的大妈都在打听你',
  },
};

export function survivalBlurb(tier: SurvivalTier, role: RoleId): string {
  return TIER_BLURBS[tier.id][role];
}

/** 加时多活了几关：超过 OVERTIME_START 的部分。 */
export function overtimeTurns(turn: number): number {
  return Math.max(0, toTurn(turn) - OVERTIME_START);
}

export interface SurvivalProgress {
  /** 常规段走了几关（0–OVERTIME_START）。 */
  readonly regular: number;
  /** 加时 +K 关。 */
  readonly overtime: number;
  /** 进度条上常规段的宽度（%）。 */
  readonly regularPct: number;
  /** 进度条上加时段的宽度（%），没有加时为 0。 */
  readonly overtimePct: number;
}

/**
 * 进度条：不到 40 关时以 40 为满；进入加时后整条按 40 + K 等分，
 * 常规段和加时段并排，加时段用另一种颜色和斜纹表示。
 */
export function survivalProgress(turn: number): SurvivalProgress {
  const t = toTurn(turn);
  const regular = Math.min(t, OVERTIME_START);
  const overtime = overtimeTurns(t);
  if (overtime === 0) return { regular, overtime, regularPct: (regular / OVERTIME_START) * 100, overtimePct: 0 };
  const total = OVERTIME_START + overtime;
  return { regular, overtime, regularPct: (OVERTIME_START / total) * 100, overtimePct: (overtime / total) * 100 };
}

/* ---- 本机最佳纪录 ---- */

export const BEST_STORAGE_KEY = 'reigns-best-v1';

/** localStorage 的最小子集，测试时可以传假的进来。 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BestRecord {
  /** 刷新后（或保持不变）的本角色最佳关数。 */
  readonly best: number;
  /** 本局之前的最佳；第一次玩为 null。 */
  readonly previous: number | null;
  /** 打破了之前的纪录（第一次玩不算）。 */
  readonly isNew: boolean;
}

type BestTable = Readonly<Partial<Record<RoleId, number>>>;

/** 隐私模式、沙箱 iframe 里访问 localStorage 本身就可能抛错。 */
function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** 存储内容不可信：只接受三个角色的非负整数，其余丢弃。 */
function parseBest(raw: string | null): BestTable {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const record = data as Record<string, unknown>;
    return Object.fromEntries(
      ROLE_IDS.flatMap((role) => {
        const value = record[role];
        return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? [[role, value]] : [];
      }),
    ) as BestTable;
  } catch {
    return {};
  }
}

/** 读本角色最佳关数；存储不可用或没有纪录返回 null。 */
export function readBest(role: RoleId, storage: StorageLike | null = defaultStorage()): number | null {
  if (!storage) return null;
  try {
    return parseBest(storage.getItem(BEST_STORAGE_KEY))[role] ?? null;
  } catch {
    return null;
  }
}

/**
 * 结局时调用一次：比之前多才写入。存储读或写失败返回 null（界面就不显示纪录），绝不抛错。
 */
export function recordBest(role: RoleId, turn: number, storage: StorageLike | null = defaultStorage()): BestRecord | null {
  if (!storage) return null;
  let table: BestTable;
  try {
    table = parseBest(storage.getItem(BEST_STORAGE_KEY));
  } catch {
    return null;
  }
  const t = toTurn(turn);
  const previous = table[role] ?? null;
  if (previous !== null && t <= previous) return { best: previous, previous, isNew: false };
  try {
    storage.setItem(BEST_STORAGE_KEY, JSON.stringify({ ...table, [role]: t }));
  } catch {
    return null;
  }
  return { best: t, previous, isNew: previous !== null };
}

/* ---- 加时抖动 ---- */

/** state.jitter → “市场抖动：业绩 -6，客户信任 +3”；没有抖动（含 undefined / 全为 0）返回 null。 */
export function formatJitter(jitter: Effects | null | undefined, role: RoleId): string | null {
  if (!jitter) return null;
  const parts = STAT_KEYS.flatMap((key) => {
    const value = jitter[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return [];
    return [`${ROLES[role].stats[key].label} ${value > 0 ? '+' : ''}${value}`];
  });
  return parts.length > 0 ? `市场抖动：${parts.join('，')}` : null;
}
