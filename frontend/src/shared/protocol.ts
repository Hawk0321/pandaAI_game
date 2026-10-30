/** 一根 K 线。t 是相对序号：决定时刻那根是 0，之前为负数，之后为正数。不放真实日期。 */
export interface Bar { t: number; o: number; h: number; l: number; c: number; v: number }

export type ClueKind = "volume" | "ma" | "index" | "margin" | "northbound" | "backtest" | "news";

/** 线索卡。内容只能用 t <= 0 的数据算出来。 */
export interface Clue {
  id: string;            // 关内唯一，如 "vol"
  kind: ClueKind;
  title: string;         // 卡面标题，如 "成交量"
  cost: number;          // 消耗研究点，1 或 2
  text: string;          // 翻开后显示的一两句话，如 "最近 3 天成交量是 20 日均量的 0.6 倍"
  signal: "bullish" | "bearish" | "neutral";  // 这张线索本身指向的方向（按当时可见数据解读）
  series?: number[];     // 可选：给 B 画小图用的序列，同样只含 t <= 0
}

export interface LevelPlay {
  schema: "level-play/v1";
  id: string;            // "L01"
  is_sample: boolean;
  market: "A股" | "指数" | "期货";
  timeframe: "1d";
  masked_name: string;   // 隐去名称，如 "某消费龙头"
  bars: Bar[];           // 可见 K 线，t = -59 … 0，共 60 根
  clues: Clue[];         // 4–6 张
  budget: number;        // 本关研究点，建议 3（翻不完所有线索，逼玩家取舍）
  hold_steps: number;    // 决定之后分几步揭晓后续走势，固定 3
}

export interface BotResult {
  id: "ma_cross" | "turtle" | "mean_revert";
  name: string;          // "双均线" / "海龟突破" / "均值回归"
  side: Side;            // 该策略在 t=0 时的方向
  ret: number;           // 持有到 after_bars 结束的收益，小数，0.05 = 5%
}

export interface LevelReveal {
  schema: "level-reveal/v1";
  id: string;
  is_sample: boolean;
  symbol: string;        // "600519.SH"
  name: string;          // "贵州茅台"
  start_date: string;    // 可见区间第一根的真实日期 "2021-01-04"
  decision_date: string; // t=0 的真实日期
  end_date: string;      // after_bars 最后一根的真实日期
  scenario: "uptrend" | "crash" | "range" | "fake_breakout" | "v_reversal" | "gap";
  after_bars: Bar[];     // t = 1 … 15，按 hold_steps 平均分段（每步 5 根）
  outcome: { ret: number; direction: "up" | "down" | "flat" };  // t=15 收盘相对 t=0 收盘；|ret|<2% 记 flat
  key_clue_ids: string[];// 本关真正有判断价值的线索 id（D 用来评估"证据使用"）
  bots: BotResult[];
  source: { api: string; adjust: "pre" | "none"; fields: string[]; fetched_at: string };
}

/** frontend/public/levels/index.json */
export interface LevelIndex {
  schema: "level-index/v1";
  is_sample?: boolean;
  main: string[];        // 正式关卡顺序，4 关，如 ["L01","L02","L03","L04"]
  pool: { id: string; probes: DimensionId[] }[];  // 补充关卡池，probes 表示这关擅长检验哪个维度
}

export type Side = "long" | "short" | "flat";

export interface GameEvent {
  seq: number;           // 本局从 1 递增
  session_id: string;
  level_id: string | null;
  t_ms: number;          // 距本关 level_start 的毫秒数（关外事件为距 session_start）
  at: string;            // ISO 时间
  type: EventType;
  data: Record<string, unknown>;  // 各类型的 data 见下表，字段不能少
}

export type EventType =
  | "session_start" | "level_start" | "clue_open" | "decision"
  | "hold_step" | "stop_triggered" | "level_end"
  | "reveal_view" | "profile_view" | "session_end";

export type DimensionId =
  | "evidence_use"    // 能力：证据使用——翻了关键线索没有、决定和线索是否一致
  | "calibration"     // 能力：判断校准——信心高低和对错是否匹配（不看赚多少）
  | "risk_control"    // 能力：风险控制——仓位、止损、浮亏时加仓还是减仓
  | "style"           // 偏好：趋势 vs 反转
  | "research_depth"  // 偏好：先研究再决定 vs 凭直觉快速决定
  | "risk_appetite";  // 偏好：重仓 vs 轻仓

export interface EvidenceItem {
  level_id: string;
  event_seqs: number[];  // 指向具体事件，C 可以据此高亮
  text: string;          // 人话："第 3 关没翻成交量就重仓做多，而成交量是本关关键线索"
  direction: "+" | "-" | "?";  // 支持 / 反对 / 不确定 该判断
}

export interface Dimension {
  id: DimensionId;
  group: "ability" | "preference";
  name: string;          // "证据使用"
  judgement: string;     // "倾向先下结论再找证据"
  score: number | null;  // 0–1，能力类可给，偏好类表示倾向位置；证据不足为 null
  evidence: EvidenceItem[];
  confidence: "low" | "medium" | "high";
  uncertain: string;     // "还不清楚是不会看成交量，还是不想花研究点"
  conflict: boolean;     // 证据互相矛盾
}

export interface Profile {
  schema: "profile/v1";
  session_id: string;
  is_sample: boolean;
  generated_at: string;
  method: "rules" | "rules+llm";
  round: 1 | 2;          // 1 = 主关卡后，2 = 补充关卡后
  dimensions: Dimension[];          // 能力 3 个 + 偏好 3 个
  persona: { name: string; emoji: string; tagline: string; is_fun_label: true };
  summary: string;                  // 两三句总评
  needs_more: { dimension_id: DimensionId; reason: string }[];
  changes?: { dimension_id: DimensionId; before: string; after: string }[];  // round 2 时相对 round 1 的变化
}

// B 导出（frontend/src/play/index.ts）
export interface PlayLevelProps {
  level: LevelPlay;
  isSupplementary: boolean;
  loadReveal: () => Promise<LevelReveal>;  // 只能在玩家提交 decision 之后调用
  emit: (type: EventType, data: Record<string, unknown>) => void;
  onDone: (result: { level_id: string; pnl: number; final_position: number }) => void;
}

// D 导出（frontend/src/profile/index.ts）
export interface AnalyzeInput {
  session_id: string;
  round: 1 | 2;
  events: GameEvent[];
  levels: { play: LevelPlay; reveal: LevelReveal }[];  // 已经玩过的关卡
  previous?: Profile;    // round 2 时传入 round 1 的结果
}
