import type { RoleId } from './types';

export const SCENE_COPY = {
  select: { kicker: 'PANDA / DECISION ROOM', title: '每个选择，都有代价。', subtitle: '三种身份，三套风险法则。你负责滑动，市场负责出招。' },
  ending: { kicker: 'THE CLOSING BELL', title: '收盘之后，看见自己。', subtitle: '不是每次坚持都有回报，但每次选择都留下你的交易痕迹。' },
} as const;

export const ROLE_SCENES: Readonly<Record<RoleId, { code: string; location: string; chapter: string; leftLabel: string; rightLabel: string }>> = {
  fund: { code: 'FUND / 01', location: '深夜投研室', chapter: '净值、信任与你的下一次判断', leftLabel: '克制', rightLabel: '进取' },
  crypto: { code: 'CHAIN / 02', location: '链上不夜城', chapter: '叙事永不眠，保证金会', leftLabel: '防守', rightLabel: '出击' },
  stock: { code: 'STOCK / 03', location: '散户盯盘屋', chapter: '一杯热茶，四种市场情绪', leftLabel: '稳住', rightLabel: '出手' },
};
