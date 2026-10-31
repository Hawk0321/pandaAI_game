# 上游数据 → 行为特征 → 画像

> 回答三个问题：A/B/C 上游实际能给什么数据；画像之前的"特征层"是什么；极简规则能不能直接区分玩家。
> 代码：`frontend/src/profile/features.ts`（特征）、`persona.ts`（人物卡）。人物卡说明见 [personas.md](personas.md)。

## 1. 上游能提供什么（2026-10-31 盘点 main）

### A 关卡数据（Panda Data，离线生成 `frontend/public/levels/`）

10 关真实行情（4 主关 + 6 补关，8 个标的：6 只 A 股 + 沪金、沪银固定合约），详见 [panda-data.md](panda-data.md)。

| 文件 | 玩家何时可见 | 字段 | 画像能用来做什么 |
|---|---|---|---|
| `Lxx.play.json` | 决定前 | 60 根可见 K 线（OHLCV，首根收盘归一为 100）、6 张线索（成交量、MA5/MA20、同期大盘、历史信号检验、ATR14 风险、20 根突破确认，各带 `signal` 和 `cost`）、研究点 3 | 决定前的趋势（20 日涨跌）、波动率（日收益标准差）、线索多空方向 |
| `Lxx.reveal.json` | 决定后 | 后续 15 根、真实结局 `outcome`（涨/跌/横盘）、行情标签 `scenario`、**关键线索 `key_clue_ids`**、3 个对手（双均线/海龟/均值回归）的方向与收益 | 对错（校准）、关键线索命中、和经典策略的风格对照 |
| `index.json` | — | 主关顺序、补关池及每关擅长检验的能力 `probes` | 补充关卡选择 |

限制：L04、L09 的结局是横盘，这两关无法检验方向对错；成交量不能跨品种比较绝对值；没有融资融券/北向线索。

### B 对局玩法（每个动作一条事件）

| 事件 | 字段 | 画像能用来做什么 |
|---|---|---|
| `level_start` | `budget`, `is_supplementary` | 区分主关/补关 |
| `clue_open` | `clue_id`, `kind`, `signal`, `cost`, `budget_left` | 翻了哪些线索、顺序、花了多少研究点 |
| `decision` | `side`, `size`（0/0.2/0.5/1）, `confidence`（1–5）, `stop`（无/5%/10%）, `clues_opened`, `think_ms` | 方向、仓位、信心、止损、思考时长——画像最核心的一条 |
| `hold_step` ×3 | `step`, `pnl_before`, `action`（持有/加/减/平）, `position_after` | 浮亏/浮盈时怎么做，观望后是否中途入场 |
| `stop_triggered` | `step`, `pnl` | 止损是否真的起作用 |
| `level_end` | `pnl`, `final_position` | 只做展示，不进能力判断 |

B 目前**不**记录：决定前改了几次方向/仓位（犹豫程度）、看 K 线的时长、点开线索后停留多久。需要的话可以加可选事件，先改协议。

### C 流程与展示

| 事件 | 字段 | 画像能用来做什么 |
|---|---|---|
| `session_start` | `device` | 手机/桌面 |
| `reveal_view` | `dwell_ms` | 揭晓页停留时长（复盘意愿，目前只记录不打分） |
| `profile_view` | `round` | 第几次看画像 |

## 2. 设计里的位置：事件 → 特征 → 画像

```
A 关卡 + B/C 事件
   │
   ├─▶ 特征层 features.ts：16 个会话级数字（带样本量 n）──▶ 人物卡（极简规则直接判别）
   │
   └─▶ 证据层 evidence.ts：一条条带事件编号的证据 ──▶ 判断层 judge.ts：6 维判断、置信度、冲突
                                                              └─▶ 推荐 recommend.ts
```

- **特征**回答"这局整体是什么样"，适合做分类（人物卡）和导出给其他系统。
- **证据**回答"凭哪一步这么说"，适合做可追溯的维度判断和推荐理由。
- 两者用同一份事件和同一套阈值（`evidence.ts` 的 `T`），不会互相矛盾。

## 3. 16 个特征

样本量 `n` 不够时值为 `null`，不硬算。`analyze()` 的输出里带 `profile.features`。

| 特征 | 含义 | 计算 | 来源 |
|---|---|---|---|
| `flat_rate` | 观望比例 | 决定为观望的关 / 总关数 | B decision |
| `avg_size` | 平均仓位 | 每关仓位的平均，观望计 0 | B decision |
| `stop_rate` | 止损使用率 | 入场的关里设了止损的比例 | B decision |
| `add_on_loss` | 浮亏加仓次数 | 持仓浮亏超过 1% 时选择加仓的次数（自动止损后的空仓不算） | B hold_step / stop_triggered |
| `cut_on_loss` | 浮亏止损次数 | 持仓浮亏超过 1% 时减仓或平仓的次数 | B hold_step |
| `research_spend` | 研究点使用率 | 每关已翻线索的成本 / 研究点 的平均 | B clue_open |
| `think_sec` | 决定用时 | `think_ms` 的中位数（秒） | B decision |
| `key_clue_hit` | 关键线索命中率 | 每关翻到的关键线索 / 关键线索数 的平均 | B + A reveal |
| `clue_agree` | 跟随证据 | 入场的关里，方向与已翻线索多空合计一致的比例（线索合计为中性的关不计） | B + A play |
| `confirm_only` | 确认偏误次数 | 翻 ≥2 张都支持自己方向、且漏看关键线索的关数 | B + A |
| `trend_follow` | 顺势比例 | 决定前 20 日涨跌超过 3% 的关里，顺势下单的比例 | B + A play |
| `avg_confidence` | 平均信心 | 入场的关的信心平均（1–5） | B decision |
| `hit_rate` | 方向命中率 | 入场且结局非横盘的关里方向对的比例（**只作参考，不进能力**） | B + A reveal |
| `overconfidence` | 过度自信程度 | 平均信心换算的把握（1→50% … 5→90%）− 命中率，至少 2 关可判 | B + A reveal |
| `reveal_dwell_sec` | 揭晓页停留 | `dwell_ms` 中位数（秒） | C reveal_view |

## 4. 极简版：画像之前，规则能不能直接区分？

**能。**人物卡现在就是直接用上面的特征判别的，不经过维度分数。一条规则只看 2–3 个特征，按顺序匹配：

| 顺序 | 人物卡 | 规则 |
|---|---|---|
| 1 | 🦥 树懒观察员 | `flat_rate ≥ 75%` |
| 2 | 🐂 冲锋蛮牛 | `avg_size ≥ 70%` 且（`overconfidence ≥ 15%`，或 `avg_confidence ≥ 4.5` 且 `research_spend ≤ 40%`） |
| 3 | 🦔 死扛刺猬 | `add_on_loss ≥ 2`；或 `add_on_loss = 1` 且 `cut_on_loss = 0` 且 `stop_rate ≤ 25%` |
| 4 | 🦉 夜猫研究员 | `research_spend ≥ 80%` 且 `key_clue_hit ≥ 70%` 且 `clue_agree ≥ 67%` 且 `flat_rate ≤ 50%` |
| 5 | 🦈 深海猎鲨 | `avg_size ≥ 70%` 且 `research_spend ≥ 70%` 且 `clue_agree ≥ 67%` |
| 6 | 🐢 稳健老龟 | `stop_rate ≥ 75%` 且 `avg_size ≤ 50%` 且 `add_on_loss = 0` |
| 7 | 🐬 冲浪海豚 | 至少 2 关有趋势，`trend_follow ≥ 67%` |
| 8 | 🦀 逆行螃蟹 | 至少 2 关有趋势，`trend_follow ≤ 33%` |
| 9 | 🦊 灵活狐狸 | 以上都不满足 |

第一条命中为主卡，第二条命中显示为"另外也有点像"。三条演示路径的结果：

| 模拟玩家 | 关键特征 | 主卡 | 第二张 |
|---|---|---|---|
| 谨慎研究型 | 研究点 100%，关键线索 100%，止损 100%，仓位 43% | 🦉 夜猫研究员 | 🐢 稳健老龟 |
| 冲动重仓型 | 仓位 100%，信心 5.0，命中 50%，浮亏加仓 2 次 | 🐂 冲锋蛮牛 | 🦔 死扛刺猬 |
| 只看不做型 | 观望 100% | 🦥 树懒观察员 | — |

极简规则的代价：它只给一个标签，说不清"凭哪一步"、也没有置信度。所以我们保留两层：人物卡负责好记、好传播，6 维判断负责证据和不确定项。
