import { describe, expect, it, vi } from 'vitest';
import playSample from '../../../data/samples/levels/L01.play.json';
import revealSample from '../../../data/samples/levels/L01.reveal.json';
import indexSample from '../../../data/samples/levels/index.json';
import type { GameEvent } from '../shared/protocol';
import { createEventLog, createLevelLoader, hasDecisionForActiveLevel } from './runtime';

function mockJson(value: unknown) {
  return vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(value), { status: 200 }));
}

describe('事件日志', () => {
  it('历史决定不能解锁同一关卡重新开始后的揭晓', () => {
    const log = createEventLog('s');
    log.emit('level_start', { budget: 3, is_supplementary: false }, 'L01');
    expect(hasDecisionForActiveLevel(log.events, 'L01')).toBe(false);
    log.emit('decision', {}, 'L01');
    expect(hasDecisionForActiveLevel(log.events, 'L01')).toBe(true);
    log.emit('level_start', { budget: 3, is_supplementary: false }, 'L01');
    expect(hasDecisionForActiveLevel(log.events, 'L01')).toBe(false);
    log.emit('decision', {}, 'L01');
    expect(hasDecisionForActiveLevel(log.events, 'L01')).toBe(true);
  });
  it('按会话和每关各自的起点计时，同时保存完整协议字段', () => {
    let time = Date.parse('2026-10-30T12:00:00.000Z');
    const save = vi.fn();
    const log = createEventLog('session-1', [], save, () => time);
    const start = log.emit('session_start', { device: 'mobile' }, null);
    time += 200;
    const level = log.emit('level_start', { budget: 3, is_supplementary: false }, 'L01');
    time += 500;
    const decision = log.emit('decision', { side: 'flat', size: 0 }, 'L01');
    time += 300;
    const profile = log.emit('profile_view', { round: 1 }, null);
    expect(start.t_ms).toBe(0);
    expect(level.t_ms).toBe(0);
    expect(decision).toMatchObject({ seq: 3, session_id: 'session-1', level_id: 'L01', t_ms: 500, type: 'decision' });
    expect(profile.t_ms).toBe(1000);
    expect(profile.at).toBe('2026-10-30T12:00:01.000Z');
    expect(save).toHaveBeenCalledTimes(4);
    expect(save.mock.lastCall?.[0]).toBe(log.events);
  });

  it('刷新恢复后从最大序号继续，并从 at - t_ms 恢复关卡和会话时间', () => {
    const initial: GameEvent[] = [
      { seq: 1, session_id: 's', level_id: null, t_ms: 0, at: '2026-10-30T12:00:00.000Z', type: 'session_start', data: { device: 'mobile' } },
      { seq: 5, session_id: 's', level_id: 'L01', t_ms: 1000, at: '2026-10-30T12:00:03.000Z', type: 'decision', data: { side: 'flat' } },
    ];
    const log = createEventLog('s', initial, undefined, () => Date.parse('2026-10-30T12:00:05.000Z'));
    expect(log.emit('hold_step', { step: 1 }, 'L01')).toMatchObject({ seq: 6, t_ms: 3000 });
    expect(log.emit('session_end', {}, null)).toMatchObject({ seq: 7, t_ms: 5000 });
    expect(initial).toHaveLength(2);
    expect(log.events).toHaveLength(4);
  });

  it('切换关卡重置本关计时；系统时间回拨时不生成负毫秒', () => {
    let time = 10000;
    const log = createEventLog('s', [], undefined, () => time);
    log.emit('session_start', { device: 'desktop' }, null);
    time = 11000;
    log.emit('level_start', { budget: 3, is_supplementary: false }, 'L01');
    time = 13000;
    expect(log.emit('level_start', { budget: 3, is_supplementary: false }, 'L02').t_ms).toBe(0);
    time = 12000;
    expect(log.emit('clue_open', { clue_id: 'vol' }, 'L02').t_ms).toBe(0);
  });

  it('localStorage 写入失败时保留内存事件并提供原始错误', () => {
    const log = createEventLog('s', [], () => { throw new Error('QuotaExceededError'); }, () => 1000);
    const data = { round: 1, nested: { value: 1 } };
    const event = log.emit('profile_view', data, null);
    data.nested.value = 2;
    expect(log.events).toEqual([event]);
    expect(log.events[0].data).toEqual({ round: 1, nested: { value: 1 } });
    expect(log.storageError).toBe('QuotaExceededError');
  });
});

describe('隔离关卡加载器', () => {
  it('创建及读取索引、play 都不会预取 reveal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => new Response(JSON.stringify(String(input).endsWith('index.json') ? indexSample : playSample)));
    const loader = createLevelLoader('./', fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    await loader.loadIndex();
    await loader.loadPlay('L01');
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['./levels/index.json', './levels/L01.play.json']);
  });

  it('decision 之前拒绝 reveal，且不发出任何网络请求', async () => {
    const fetcher = mockJson(revealSample);
    const loader = createLevelLoader('/', fetcher);
    await expect(loader.loadReveal('L01', () => false)).rejects.toThrow('decision');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('提交后允许揭晓，并合并并发请求；命中缓存仍检查 decision', async () => {
    const fetcher = mockJson(revealSample);
    const loader = createLevelLoader('/demo', fetcher);
    const [first, second] = await Promise.all([loader.loadReveal('L01', () => true), loader.loadReveal('L01', () => true)]);
    expect(first).toBe(second);
    expect(first.name).toBe(revealSample.name);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/demo/levels/L01.reveal.json');
    await expect(loader.loadReveal('L01', () => false)).rejects.toThrow('decision');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('拒绝路径注入，不向网络发送不合法 id', async () => {
    const fetcher = mockJson(playSample);
    const loader = createLevelLoader('./', fetcher);
    await expect(loader.loadPlay('../secret')).rejects.toThrow('id');
    await expect(loader.loadReveal('L01?token=x', () => true)).rejects.toThrow('id');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('拒绝 schema 错误及文件 id 不匹配', async () => {
    await expect(createLevelLoader('./', mockJson({ ...indexSample, main: ['L01', 'L01'] })).loadIndex()).rejects.toThrow('重复');
    await expect(createLevelLoader('./', mockJson({ ...playSample, schema: 'wrong' })).loadPlay('L01')).rejects.toThrow('schema');
    await expect(createLevelLoader('./', mockJson({ ...playSample, id: 'L02' })).loadPlay('L01')).rejects.toThrow('不一致');
    await expect(createLevelLoader('./', mockJson({ ...indexSample, schema: 'wrong' })).loadIndex()).rejects.toThrow('schema');
    await expect(createLevelLoader('./', mockJson({ ...revealSample, schema: 'wrong' })).loadReveal('L01', () => true)).rejects.toThrow('schema');
  });

  it('拒绝 play 中的未来 K 线和嵌套的真实标的、日期、行情答案', async () => {
    const future = { ...playSample, bars: [...playSample.bars, { t: 1, o: 1, h: 2, l: 1, c: 2, v: 10 }] };
    await expect(createLevelLoader('./', mockJson(future)).loadPlay('L01')).rejects.toThrow('未来数据');
    for (const field of ['name', 'symbol', 'decision_date', 'scenario', 'outcome', 'after_bars']) {
      const leak = { ...playSample, extra: { [field]: 'hidden answer' } };
      await expect(createLevelLoader('./', mockJson(leak)).loadPlay('L01')).rejects.toThrow('禁止公开');
    }
    await expect(createLevelLoader('./', mockJson(playSample)).loadPlay('L01')).resolves.toMatchObject({ id: 'L01', masked_name: playSample.masked_name });
  });

  it('保留 HTTP / fetch 原始错误，失败不被永久缓存', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(new Response(JSON.stringify(playSample)));
    const loader = createLevelLoader('./', fetcher);
    await expect(loader.loadPlay('L01')).rejects.toThrow('HTTP 404 Not Found');
    await expect(loader.loadPlay('L01')).resolves.toMatchObject({ id: 'L01' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const original = new Error('network offline');
    await expect(createLevelLoader('./', vi.fn<typeof fetch>().mockRejectedValue(original)).loadIndex()).rejects.toBe(original);
  });
});
