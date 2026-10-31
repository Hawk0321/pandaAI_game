/**
 * 「综合解读」：把玩家此刻已经知道的东西整理成一段话。
 *
 * 只用两类信息：已翻开的线索（含它自带的方向 signal）和可见的 K 线（t <= 0）。
 * 不看决定之后的数据，不给买卖建议——给了建议，玩家照做就会污染画像，也变成了投资建议。
 * 这是规则整理，不是大模型；函数边界是 buildDigest(输入) → Digest，以后要换成真模型只需替换这一个函数。
 */
import type { Bar, Clue } from '../shared/protocol';
import { CLUE_TEASERS, clueName, clueTeaser, clueView } from './clueView';
import type { Lean } from './clueView';

export interface DigestInput { bars: Bar[]; clues: Clue[]; opened: string[]; budget: number }
export interface DigestRead { id: string; name: string; lean: Lean; leanText: string; verdict: string }
export interface Digest {
  headline: string;
  facts: string[];
  reads: DigestRead[];
  tally: { up: number; down: number; flat: number };
  conflict: boolean;
  /** teaser 为空表示这张线索没有专门的预告语，界面只显示名字和点数 */
  missing: { id: string; name: string; teaser: string; cost: number }[];
  /** 没得再翻时的一句话（全翻完 / 点数用完） */
  wrapUp: string;
  note: string;
}

const NOTE = '这只是把已有信息整理一遍，不是买卖建议，也不保证之后会涨或会跌。怎么选由你决定。';
const pct = (value: number) => `${Math.abs(value * 100).toFixed(1)}%`;
const SIGNAL: Record<Clue['signal'], { lean: Lean; leanText: string }> = {
  bullish: { lean: 'up', leanText: '偏多' },
  bearish: { lean: 'down', leanText: '偏空' },
  neutral: { lean: 'flat', leanText: '看不出方向' },
};

/** 只从已可见的 K 线里说三件事：这段一共涨跌多少、现在在区间的哪个位置、最近几天动没动。 */
export function chartFacts(input: Bar[]): string[] {
  const bars = [...input].filter(bar => [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)).sort((a, b) => a.t - b.t);
  if (bars.length < 6) return [];
  const first = bars[0];
  const last = bars[bars.length - 1];
  const total = last.c / first.c - 1;
  const low = Math.min(...bars.map(bar => bar.l));
  const high = Math.max(...bars.map(bar => bar.h));
  const position = high > low ? (last.c - low) / (high - low) : 0.5;
  const recent = last.c / bars[bars.length - 6].c - 1;
  const days = bars.length;
  return [
    Math.abs(total) < 0.01 ? `这 ${days} 天价格基本在原地，一共只变了 ${pct(total)}。` : total > 0 ? `这 ${days} 天价格一共涨了 ${pct(total)}。` : `这 ${days} 天价格一共跌了 ${pct(total)}。`,
    position >= 0.75 ? '现在价格靠近这段时间的高位。' : position <= 0.25 ? '现在价格靠近这段时间的低位。' : '现在价格在这段时间的中间位置。',
    Math.abs(recent) < 0.005 ? '最近 5 天基本没动。' : recent > 0 ? `最近 5 天涨了 ${pct(recent)}。` : `最近 5 天跌了 ${pct(recent)}。`,
  ];
}

export function buildDigest({ bars, clues, opened, budget }: DigestInput): Digest {
  const seen = clues.filter(clue => opened.includes(clue.id));
  const reads: DigestRead[] = seen.map(clue => {
    const view = clueView(clue);
    return { id: clue.id, name: view?.name ?? clue.title, ...SIGNAL[clue.signal], verdict: view?.verdict ?? clue.text };
  });
  const tally = { up: 0, down: 0, flat: 0 };
  for (const clue of seen) tally[SIGNAL[clue.signal].lean] += 1;
  const n = seen.length;
  const conflict = tally.up > 0 && tally.down > 0;

  let headline: string;
  if (n === 0) {
    headline = '你还没翻线索，现在只能凭走势本身判断。';
  } else if (tally.flat === n) {
    headline = n === 1 ? '你翻开的这张线索看不出方向，信息还不够明确。' : `你翻开的 ${n} 张线索都看不出方向，信息还不够明确。`;
  } else if (conflict) {
    headline = `你翻开的 ${n} 张线索里，${tally.up} 张偏多、${tally.down} 张偏空${tally.flat ? `、${tally.flat} 张看不出方向` : ''}，互相有分歧。`;
  } else {
    const word = tally.up > 0 ? '偏多' : '偏空';
    const count = tally.up || tally.down;
    headline = count === n
      ? (n === 1 ? `你翻开的这张线索${word}。` : `你翻开的 ${n} 张线索都${word}，方向比较一致。`)
      : `你翻开的 ${n} 张线索里，${count} 张${word}，其余看不出方向。`;
  }

  const unopened = clues.filter(clue => !opened.includes(clue.id));
  const missing = unopened.filter(clue => clue.cost <= budget).slice(0, 3)
    .map(clue => ({ id: clue.id, name: clueName(clue), teaser: clue.id in CLUE_TEASERS ? clueTeaser(clue) : '', cost: clue.cost }));
  const wrapUp = unopened.length === 0 ? '线索都翻完了，接下来靠你自己的判断。'
    : missing.length === 0 ? '研究点用完了，没翻开的线索看不了，接下来靠你自己的判断。' : '';
  return { headline, facts: chartFacts(bars), reads, tally, conflict, missing, wrapUp, note: NOTE };
}
