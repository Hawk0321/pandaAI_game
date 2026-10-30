import type { EventType, GameEvent, LevelIndex, LevelPlay, LevelReveal } from '../shared/protocol';

export interface EventLog {
  events: GameEvent[];
  emit: (type: EventType, data: Record<string, unknown>, levelId: string | null) => GameEvent;
  readonly storageError: string | null;
}

/** C 的日志容器：协议事件保持原样，持久化失败不影响内存中的行为证据。 */
export function createEventLog(
  sessionId: string,
  initialEvents: GameEvent[] = [],
  save?: (events: GameEvent[]) => void,
  now: () => number = Date.now,
): EventLog {
  const events = initialEvents.slice();
  const levelOrigins = new Map<string, number>();
  let sequence = 0;
  let sessionOrigin = now();
  let restoredSessionOrigin = false;
  let storageError: string | null = null;

  for (const event of events) {
    sequence = Math.max(sequence, event.seq);
    if (event.session_id !== sessionId) continue;
    const timestamp = Date.parse(event.at);
    if (!Number.isFinite(timestamp) || !Number.isFinite(event.t_ms)) continue;
    const origin = timestamp - event.t_ms;
    if (event.type === 'session_start' || (!restoredSessionOrigin && event.level_id === null)) {
      sessionOrigin = origin;
      restoredSessionOrigin = true;
    }
    if (event.level_id !== null) levelOrigins.set(event.level_id, origin);
  }

  return {
    events,
    get storageError() { return storageError; },
    emit(type, data, levelId) {
      const timestamp = now();
      if (type === 'session_start') sessionOrigin = timestamp;
      if (type === 'level_start' && levelId !== null) levelOrigins.set(levelId, timestamp);
      const origin = levelId === null ? sessionOrigin : (levelOrigins.get(levelId) ?? timestamp);
      const event: GameEvent = {
        seq: ++sequence,
        session_id: sessionId,
        level_id: levelId,
        t_ms: Math.max(0, Math.round(timestamp - origin)),
        at: new Date(timestamp).toISOString(),
        type,
        data: structuredClone(data),
      };
      events.push(event);
      try {
        save?.(events);
        storageError = null;
      } catch (cause) {
        storageError = cause instanceof Error ? cause.message : String(cause);
      }
      return event;
    },
  };
}

export interface LevelLoader {
  loadIndex: () => Promise<LevelIndex>;
  loadPlay: (id: string) => Promise<LevelPlay>;
  loadReveal: (id: string, canReveal: () => boolean) => Promise<LevelReveal>;
}

type JsonObject = Record<string, unknown>;

function object(value: unknown, description: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${description} 必须是 JSON 对象`);
  }
  return value as JsonObject;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
}

function requireId(value: unknown): asserts value is string {
  check(validId(value), '关卡 id 只能包含字母、数字、下划线和连字符');
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function bar(value: unknown, isFuture: boolean): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as JsonObject;
  return ['t', 'o', 'h', 'l', 'c', 'v'].every(key => finite(candidate[key]))
    && Number.isInteger(candidate.t)
    && (isFuture ? (candidate.t as number) > 0 : (candidate.t as number) <= 0);
}

/** 避免将额外嵌套字段中的未来数据或真实身份传给 B。 */
function checkPlayIsolation(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(checkPlayIsolation);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    const forbidden = normalized === 'name' || normalized === 'source' || normalized === 'fetched_at'
      || /(^|_)(date|dates|symbol|scenario|outcome|after_bars|future_bars|real_name)(_|$)/.test(normalized);
    check(!forbidden, `play 文件包含禁止公开的字段：${key}`);
    check(!(normalized === 't' && finite(child) && child > 0), 'play 文件包含 t > 0 的未来数据');
    checkPlayIsolation(child);
  }
}

const dimensionIds = new Set(['evidence_use', 'calibration', 'risk_control', 'style', 'research_depth', 'risk_appetite']);

function validateIndex(value: unknown): LevelIndex {
  const index = object(value, '关卡索引');
  check(index.schema === 'level-index/v1', '关卡索引 schema 必须是 level-index/v1');
  check(Array.isArray(index.main) && index.main.length > 0 && index.main.every(validId), '关卡索引 main 必须包含合法关卡 id');
  check(Array.isArray(index.pool), '关卡索引 pool 必须是数组');
  for (const value of index.pool) {
    const item = object(value, '补充关卡');
    requireId(item.id);
    check(Array.isArray(item.probes) && item.probes.every(id => typeof id === 'string' && dimensionIds.has(id)), '补充关卡 probes 必须使用协议维度');
  }
  check(index.is_sample === undefined || typeof index.is_sample === 'boolean', '索引 is_sample 必须是布尔值');
  return index as unknown as LevelIndex;
}

function validatePlay(value: unknown, id: string): LevelPlay {
  const level = object(value, 'play 文件');
  check(level.schema === 'level-play/v1', 'play schema 必须是 level-play/v1');
  check(level.id === id, `play 文件 id 与请求的 ${id} 不一致`);
  checkPlayIsolation(level);
  check(typeof level.is_sample === 'boolean', 'play is_sample 必须是布尔值');
  check(['A股', '指数', '期货'].includes(String(level.market)) && level.timeframe === '1d', 'play 市场或时间周期不符合协议');
  check(typeof level.masked_name === 'string', 'play 必须有 masked_name');
  check(Array.isArray(level.bars) && level.bars.length > 0 && level.bars.every(value => bar(value, false)), 'play bars 必须是 t <= 0 的有效 K 线');
  check(Array.isArray(level.clues), 'play clues 必须是数组');
  for (const value of level.clues) {
    const clue = object(value, '线索卡');
    check(typeof clue.id === 'string' && typeof clue.title === 'string' && typeof clue.text === 'string', '线索卡缺少 id、title 或 text');
    check(['volume', 'ma', 'index', 'margin', 'northbound', 'backtest', 'news'].includes(String(clue.kind)), '线索卡 kind 不符合协议');
    check(clue.cost === 1 || clue.cost === 2, '线索卡 cost 必须是 1 或 2');
    check(['bullish', 'bearish', 'neutral'].includes(String(clue.signal)), '线索卡 signal 不符合协议');
    check(clue.series === undefined || (Array.isArray(clue.series) && clue.series.every(finite)), '线索卡 series 必须是数值数组');
  }
  check(finite(level.budget) && level.budget >= 0 && Number.isInteger(level.budget), 'play budget 必须是非负整数');
  check(level.hold_steps === 3, 'play hold_steps 必须为 3');
  return level as unknown as LevelPlay;
}

function validateReveal(value: unknown, id: string): LevelReveal {
  const reveal = object(value, 'reveal 文件');
  check(reveal.schema === 'level-reveal/v1', 'reveal schema 必须是 level-reveal/v1');
  check(reveal.id === id, `reveal 文件 id 与请求的 ${id} 不一致`);
  check(typeof reveal.is_sample === 'boolean', 'reveal is_sample 必须是布尔值');
  check(['symbol', 'name', 'start_date', 'decision_date', 'end_date'].every(key => typeof reveal[key] === 'string'), 'reveal 缺少真实标的或日期字段');
  check(['uptrend', 'crash', 'range', 'fake_breakout', 'v_reversal', 'gap'].includes(String(reveal.scenario)), 'reveal scenario 不符合协议');
  check(Array.isArray(reveal.after_bars) && reveal.after_bars.length > 0 && reveal.after_bars.every(value => bar(value, true)), 'reveal after_bars 必须是 t > 0 的有效 K 线');
  const outcome = object(reveal.outcome, '行情结果');
  check(finite(outcome.ret) && ['up', 'down', 'flat'].includes(String(outcome.direction)), 'reveal outcome 不符合协议');
  check(Array.isArray(reveal.key_clue_ids) && reveal.key_clue_ids.every(id => typeof id === 'string'), 'reveal key_clue_ids 必须是字符串数组');
  check(Array.isArray(reveal.bots), 'reveal bots 必须是数组');
  for (const value of reveal.bots) {
    const bot = object(value, 'AI 对手');
    check(['ma_cross', 'turtle', 'mean_revert'].includes(String(bot.id)) && typeof bot.name === 'string', 'AI 对手 id 或 name 不符合协议');
    check(['long', 'short', 'flat'].includes(String(bot.side)) && finite(bot.ret), 'AI 对手 side 或 ret 不符合协议');
  }
  const source = object(reveal.source, '数据来源');
  check(typeof source.api === 'string' && ['pre', 'none'].includes(String(source.adjust)), 'reveal source 接口或复权字段不符合协议');
  check(Array.isArray(source.fields) && source.fields.every(field => typeof field === 'string') && typeof source.fetched_at === 'string', 'reveal source 缺少 fields 或 fetched_at');
  return reveal as unknown as LevelReveal;
}

/** 只在调用时请求对应 JSON，不预取揭晓；并发调用共享同一请求。 */
export function createLevelLoader(baseUrl: string, fetcher: typeof fetch = fetch): LevelLoader {
  const base = baseUrl === '' ? './' : baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const pending = new Map<string, Promise<unknown>>();

  function request<T>(filename: string, validate: (value: unknown) => T): Promise<T> {
    const cached = pending.get(filename);
    if (cached) return cached as Promise<T>;
    const path = `${base}levels/${filename}`;
    const result = (async () => {
      const response = await fetcher(path);
      if (!response.ok) throw new Error(`GET ${path}: HTTP ${response.status} ${response.statusText}`.trim());
      return validate(await response.json());
    })();
    pending.set(filename, result);
    void result.catch(() => { if (pending.get(filename) === result) pending.delete(filename); });
    return result;
  }

  return {
    async loadIndex() { return request('index.json', validateIndex); },
    async loadPlay(id) {
      requireId(id);
      return request(`${id}.play.json`, value => validatePlay(value, id));
    },
    async loadReveal(id, canReveal) {
      requireId(id);
      check(canReveal(), '尚未提交 decision，拒绝加载揭晓数据');
      return request(`${id}.reveal.json`, value => validateReveal(value, id));
    },
  };
}
