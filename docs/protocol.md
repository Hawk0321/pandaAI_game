# 沟通协议 v1（四个模块之间唯一的约定）

> 给人和 AI 读的。四个模块分开开发，彼此只通过本文件定义的 **文件格式** 和 **函数接口** 对接。
> 改协议必须先改本文件并通知全员，不能在自己代码里私自加字段让别人去猜。
> 所有示例文件在 `data/samples/`，开发时先对着示例做，不用等别人。

## 0. 模块与数据流

```
A 关卡数据 (backend/levels, Python 离线)
   │ 写出 frontend/public/levels/*.json
   ▼
C 流程与展示 (frontend/src/shell) ── 加载关卡、串起整局、保存事件、展示揭晓页和画像页
   │  给 B：LevelPlay + loadReveal() + emit()
   ▼
B 对局玩法 (frontend/src/play) ── 一关之内的全部玩法，每个动作 emit 一条事件
   │  事件回到 C 汇总
   ▼
D 证据与画像 (frontend/src/profile) ── analyze(事件 + 关卡) → Profile；pickNextLevel() 选补充关卡
   │  Profile 回到 C 展示
   ▼
C 画像页
```

技术栈（全员统一）：前端 Vite + React + TypeScript；关卡脚本 Python 3.10+。
本文件第 2–4 节的 TypeScript 类型原样放进 `frontend/src/shared/protocol.ts`（由 D 维护），大家都从这里 import。

## 1. 目录约定

```
backend/levels/              A：Panda Data 拉数、切关卡、算线索和 AI 对手
frontend/public/levels/      A 的产出：index.json、L01.play.json、L01.reveal.json ……
frontend/src/shared/         protocol.ts（D 维护）
frontend/src/play/           B
frontend/src/shell/          C（项目骨架、App、页面、事件日志、部署）
frontend/src/profile/        D
data/samples/                各接口的示例文件（is_sample: true）
```

## 2. 关卡文件（A 产出 → B、C、D 使用）

每关两个文件，**信息隔离的关键**：

- `Lxx.play.json`：玩家做决定前能看到的一切。**不能含任何决定时刻之后的数据**，也不能含真实名称、真实日期、行情类型等会泄露答案的字段。
- `Lxx.reveal.json`：决定之后才加载，含后续走势、真实标的、答案相关信息。

```ts
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
```

## 3. 行为事件（B、C 产出 → D 使用）

B 调用 `emit(type, data)` 只传类型和内容；C 负责补上 `seq`、`session_id`、`level_id`、`t_ms`、`at` 并保存。

```ts
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
```

| type | 谁发 | data 字段 |
|---|---|---|
| `session_start` | C | `{ device: "mobile" \| "desktop" }` |
| `level_start` | B | `{ budget: number, is_supplementary: boolean }` |
| `clue_open` | B | `{ clue_id, kind, signal, cost, budget_left }` |
| `decision` | B | `{ side, size: 0 \| 0.2 \| 0.5 \| 1, confidence: 1–5, stop: null \| 0.05 \| 0.1, clues_opened: string[], think_ms }` |
| `hold_step` | B | `{ step: 1–3, pnl_before: number, action: "hold" \| "add" \| "reduce" \| "close", position_after: number }` |
| `stop_triggered` | B | `{ step, pnl: number }` |
| `level_end` | B | `{ pnl: number, final_position: number }` |
| `reveal_view` | C | `{ dwell_ms }` 玩家在揭晓页停留时长 |
| `profile_view` | C | `{ round: 1 \| 2 }` 第几次看画像（补充关卡前/后） |
| `session_end` | C | `{}` |

约定：`size` 是仓位比例；`position_after` 是带方向的仓位（做空为负）；`pnl` 一律是小数收益率，按 B 的模拟成交计算。观望时 `side="flat"`、`size=0`，之后仍然要走完 3 步揭晓并发 `hold_step`（action 可为 "hold" 或中途入场 "add"）。

## 4. 画像（D 产出 → C 展示）

```ts
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
```

## 5. 函数接口

```ts
// B 导出（frontend/src/play/index.ts）
export interface PlayLevelProps {
  level: LevelPlay;
  isSupplementary: boolean;
  loadReveal: () => Promise<LevelReveal>;  // 只能在玩家提交 decision 之后调用
  emit: (type: EventType, data: Record<string, unknown>) => void;
  onDone: (result: { level_id: string; pnl: number; final_position: number }) => void;
}
export function PlayLevel(props: PlayLevelProps): JSX.Element;

// D 导出（frontend/src/profile/index.ts）
export interface AnalyzeInput {
  session_id: string;
  round: 1 | 2;
  events: GameEvent[];
  levels: { play: LevelPlay; reveal: LevelReveal }[];  // 已经玩过的关卡
  previous?: Profile;    // round 2 时传入 round 1 的结果
}
export function analyze(input: AnalyzeInput): Promise<Profile>;
export function pickNextLevel(profile: Profile, index: LevelIndex, playedIds: string[]): string | null;

// C 负责：整局流程、加载 JSON、事件日志、揭晓页、画像页、导出、部署。C 不导出给别人用的接口。
```

## 6. 一局的流程（C 按这个串）

1. 首页 → 30 秒玩法说明 → `session_start`
2. 按 `index.main` 依次玩 4 关：渲染 `<PlayLevel>`，`onDone` 后显示 C 的揭晓页（真实名称、日期、AI 对手对比、你的结果），发 `reveal_view`
3. 调 `analyze({round: 1})` → 画像页（第 1 次），发 `profile_view`
4. 若 `pickNextLevel` 返回关卡 id：画像页提示"还有一点看不准，再来一关"→ 玩补充关卡 → `analyze({round: 2, previous})` → 画像页（第 2 次，展示 `changes`）
5. 画像页可导出 Profile JSON；`session_end`

## 7. 示例文件

| 文件 | 内容 |
|---|---|
| `data/samples/levels/index.json` | 关卡索引示例 |
| `data/samples/levels/L01.play.json` / `L01.reveal.json` | 一关完整示例（模拟行情，is_sample: true） |
| `data/samples/sample_events.json` | 一局玩完一关的事件序列示例 |
| `data/samples/sample_profile.json` | 画像输出示例 |

示例里的数值只用于演示格式，彼此之间不保证算得上（例如事件里的 pnl 和 K 线不一定对得上）。

C 搭骨架时把 `data/samples/levels/` 复制到 `frontend/public/levels/` 先用着；A 交付后直接覆盖。

## 8. 改协议的规则

- 只加可选字段（`?:`）可以直接改本文件和 `protocol.ts`，在 PR 标题写 `[协议]`。
- 删字段、改字段含义、改函数签名：先和 nate 确认。
- 版本号写在 `schema` 字段里，破坏性修改时 v1 → v2。
