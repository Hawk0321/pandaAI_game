/**
 * 3 组模拟玩家（谨慎研究型、冲动重仓型、只看不做型）= 演示路径。
 * 校验 data/samples/profile/ 下的文件与 samples.ts 生成结果一致；
 * 设置 UPDATE_SAMPLES=1 时重新写出这些文件。
 */
import { describe, expect, it } from 'vitest';
import type { GameEvent, Profile } from '../shared/protocol';
import { analyze, pickNextLevel } from './index';
import { PLAYERS, SAMPLE_INDEX, buildPlayerEvents, buildSampleLevels, type PlayerSample } from './samples';

const DIR = '../../../data/samples/profile/';
const committed = import.meta.glob('../../../data/samples/profile/**/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const update = import.meta.env.UPDATE_SAMPLES === '1';
type NodeFs = { mkdirSync(p: URL, o: { recursive: boolean }): void; writeFileSync(p: URL, d: string): void };
const loadFs = () => import(/* @vite-ignore */ `node:${'fs'}`) as Promise<NodeFs>;
const levels = buildSampleLevels();
const mainLevels = levels.filter((l) => SAMPLE_INDEX.main.includes(l.play.id));
const FIXED_TIME = '2026-10-30T00:00:00.000Z';

async function syncFile(rel: string, data: unknown) {
  const text = `${JSON.stringify(data, null, 1)}\n`;
  if (update) {
    const fs = await loadFs();
    const url = new URL(DIR + rel, import.meta.url);
    fs.mkdirSync(new URL('.', url), { recursive: true });
    fs.writeFileSync(url, text);
    return;
  }
  expect(committed[DIR + rel], `${rel} 与生成结果不一致，运行 UPDATE_SAMPLES=1 重新生成`).toBe(text);
}

async function round1(p: PlayerSample, events: GameEvent[] = buildPlayerEvents(p)) {
  return analyze({ session_id: `sample-${p.key}`, round: 1, events, levels: mainLevels });
}
const score = (prof: Profile, id: string) => prof.dimensions.find((d) => d.id === id)!.score;
const dimOf = (prof: Profile, id: string) => prof.dimensions.find((d) => d.id === id)!;
const player = (key: PlayerSample['key']) => PLAYERS.find((p) => p.key === key)!;

describe('模拟数据文件', () => {
  it('关卡、索引、玩家事件和画像结果与生成器一致', async () => {
    await syncFile('levels/index.json', SAMPLE_INDEX);
    for (const l of levels) {
      await syncFile(`levels/${l.play.id}.play.json`, l.play);
      await syncFile(`levels/${l.play.id}.reveal.json`, l.reveal);
      // 信息隔离：play 文件里不能有决定之后的 K 线
      expect(l.play.bars.every((b) => b.t <= 0)).toBe(true);
    }
    for (const p of PLAYERS) {
      const events = buildPlayerEvents(p, true);
      await syncFile(`sample_player_${p.key}.json`, { is_sample: true, name: p.name, note: p.note, events });
      const r1 = await round1(p);
      const next = pickNextLevel(r1, SAMPLE_INDEX, SAMPLE_INDEX.main);
      const out: Profile[] = [{ ...r1, generated_at: FIXED_TIME }];
      if (next) {
        const played = levels.filter((l) => [...SAMPLE_INDEX.main, next].includes(l.play.id));
        const r2 = await analyze({ session_id: `sample-${p.key}`, round: 2, events, levels: played, previous: r1 });
        out.push({ ...r2, generated_at: FIXED_TIME });
      }
      await syncFile(`sample_profile_${p.key}.json`, { is_sample: true, name: p.name, profiles: out });
    }
  });
});

describe('3 组模拟玩家画像明显不同', () => {
  it('人物卡各不相同，且符合各自玩法', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map((p) => round1(p)));
    expect(new Set([c, i, w].map((p) => p.persona.name)).size).toBe(3);
    expect(c.persona.name).toBe('夜猫研究员');
    expect(i.persona.name).toBe('冲锋蛮牛');
    expect(w.persona.name).toBe('树懒观察员');
  });

  it('能力：谨慎型三项能力都明显高于冲动型；只看不做型的校准和风控证据不足', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map((p) => round1(p)));
    for (const id of ['evidence_use', 'calibration', 'risk_control']) {
      expect(score(c, id)!).toBeGreaterThan(0.65);
      expect(score(i, id)!).toBeLessThan(0.4);
    }
    expect(score(w, 'calibration')).toBeNull();
    expect(score(w, 'risk_control')).toBeNull();
    expect(dimOf(w, 'calibration').confidence).toBe('low');
    expect(dimOf(w, 'calibration').uncertain).toContain('观望');
  });

  it('偏好：仓位 冲动 > 谨慎 > 只看不做；研究深度 冲动最低', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map((p) => round1(p)));
    expect(score(i, 'risk_appetite')!).toBeGreaterThan(score(c, 'risk_appetite')!);
    expect(score(c, 'risk_appetite')!).toBeGreaterThan(score(w, 'risk_appetite')!);
    expect(score(i, 'research_depth')!).toBeLessThan(0.35);
    expect(score(c, 'research_depth')!).toBeGreaterThan(0.65);
    expect(score(w, 'research_depth')!).toBeGreaterThan(0.65);
    expect(score(i, 'style')).toBe(1);
  });

  it('收益不决定能力：冲动型有两关赚了钱，校准仍判为信心偏高', async () => {
    const i = await round1(player('impulsive'));
    const cal = dimOf(i, 'calibration');
    expect(cal.judgement).toContain('不匹配');
    expect(cal.evidence.some((e) => e.text.includes('信心偏高'))).toBe(true);
  });

  it('谨慎型的趋势偏好有冲突（顺势逆势都做过），如实标出', async () => {
    const c = await round1(player('cautious'));
    expect(dimOf(c, 'style').conflict).toBe(true);
    expect(c.needs_more.some((n) => n.dimension_id === 'style')).toBe(true);
  });
});

describe('补充关卡闭环', () => {
  it('谨慎型和冲动型能力都已看准，不需要补充；只看不做型补一关，画像说明哪里变了', async () => {
    const [c, i, w] = await Promise.all(PLAYERS.map((p) => round1(p)));
    expect(pickNextLevel(c, SAMPLE_INDEX, SAMPLE_INDEX.main)).toBeNull();
    expect(pickNextLevel(i, SAMPLE_INDEX, SAMPLE_INDEX.main)).toBeNull();
    const next = pickNextLevel(w, SAMPLE_INDEX, SAMPLE_INDEX.main);
    expect(next).toBe('S05');

    const watcher = player('watcher');
    const r2 = await analyze({ session_id: 'sample-watcher', round: 2, events: buildPlayerEvents(watcher, true),
      levels: levels.filter((l) => [...SAMPLE_INDEX.main, 'S05'].includes(l.play.id)), previous: w });
    const changed = r2.changes!.map((c) => c.dimension_id);
    expect(changed).toContain('calibration');
    expect(changed).toContain('risk_control');
    // 只多了 1 关，新判断仍然是低置信度
    expect(dimOf(r2, 'risk_control').confidence).toBe('low');
    expect(pickNextLevel(r2, SAMPLE_INDEX, [...SAMPLE_INDEX.main, 'S05'])).toBeNull();
  });
});

describe('改一个关键选择，画像合理变化（评委现场改）', () => {
  it('冲动型在第 2 关改成设止损、浮亏立刻平仓：风险控制变好，其他偏好不变', async () => {
    const base = player('impulsive');
    const before = await round1(base);
    const tweaked: PlayerSample = structuredClone(base);
    tweaked.main[1] = { ...tweaked.main[1], stop: 0.05, steps: [
      { pnl_before: -0.05, action: 'close', position_after: 0 },
      { pnl_before: 0, action: 'hold', position_after: 0 },
      { pnl_before: 0, action: 'hold', position_after: 0 }] };
    const after = await round1(tweaked, buildPlayerEvents(tweaked));
    expect(score(after, 'risk_control')!).toBeGreaterThan(score(before, 'risk_control')! + 0.05);
    expect(dimOf(after, 'risk_control').evidence.some((e) => e.text.includes('设了 5.0% 止损'))).toBe(true);
    for (const id of ['style', 'research_depth', 'evidence_use', 'calibration']) expect(score(after, id)).toBe(score(before, id));
  });

  it('谨慎型在第 2 关改成只看均线就满仓做多：证据使用和风险控制下降，能力维度不再全部高置信度', async () => {
    const base = player('cautious');
    const before = await round1(base);
    const tweaked: PlayerSample = structuredClone(base);
    const ma = tweaked.main[1].clues.find((x) => x.id === 'ma') ?? { id: 'ma', kind: 'ma', signal: 'bullish', cost: 1 };
    tweaked.main[1] = { ...tweaked.main[1], clues: [ma], side: 'long', size: 1, confidence: 5, stop: null, think_ms: 6000, steps: [
      { pnl_before: -0.05, action: 'add', position_after: 1 },
      { pnl_before: -0.1, action: 'hold', position_after: 1 },
      { pnl_before: -0.15, action: 'close', position_after: 0 }] };
    const after = await round1(tweaked, buildPlayerEvents(tweaked));
    expect(score(after, 'evidence_use')!).toBeLessThan(score(before, 'evidence_use')!);
    expect(score(after, 'risk_control')!).toBeLessThan(score(before, 'risk_control')!);
    // 校准只看信心和命中率是否匹配：这一关 5/5 信心却错了，会作为反向证据列出
    expect(dimOf(after, 'calibration').evidence.some((e) => e.direction === '-' && e.text.includes('信心很高，但方向判断错了'))).toBe(true);
    expect(after.dimensions.some((d) => d.group === 'ability' && (d.conflict || d.confidence !== 'high'))).toBe(true);
  });
});
