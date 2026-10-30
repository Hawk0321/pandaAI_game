# 任务 B：对局玩法（一关之内的全部交互）

> 给负责人和 AI 读。开工前先读：`AGENTS.md`、`README.md`、`docs/protocol.md`（第 2、3、5 节和你有关）。
> 参考：`frontend/PandaAI_Skill_Card_Demo.html` 是队友之前做的卡牌 Demo，卡牌视觉和手感可以借鉴，但玩法按本文件做。

## 你做什么

做 `<PlayLevel>` 组件：玩家在一关里看盘、翻线索卡、下决定、经历后续走势。每个动作都要发一条行为事件，这些事件是画像的唯一依据，所以**事件比动画重要**。

## 你负责的目录

- `frontend/src/play/`，入口 `frontend/src/play/index.ts` 导出 `PlayLevel`。
- 不改其他目录。需要共享样式或工具函数，找 C。

## 输入与输出

按 `docs/protocol.md` 第 5 节的 `PlayLevelProps`：

- 输入 `level: LevelPlay`、`isSupplementary`、`loadReveal()`、`emit()`、`onDone()`。
- 输出：调用 `emit(type, data)` 发事件（第 3 节表格里标 B 的类型，data 字段一个都不能少），一关结束调用 `onDone`。

开发时直接 import `data/samples/levels/L01.play.json` 和 `L01.reveal.json`，`emit` 先用 `console.log`，不用等 C 和 A。

## 一关的流程

1. **看盘**：K 线图（建议 TradingView `lightweight-charts`，Apache-2.0）显示 60 根可见 K 线。顶部显示 `masked_name` 和研究点。发 `level_start`。
2. **翻线索**：线索卡背面朝上，点开消耗研究点，显示 `text`。研究点不够翻全部，逼玩家取舍。每翻一张发 `clue_open`。
3. **下决定**：一个面板选方向（做多 / 观望 / 做空）、仓位（轻 0.2 / 中 0.5 / 重 1）、信心（1–5）、止损（不设 / 5% / 10%）。提交后发 `decision`，**这之后**才调用 `loadReveal()`。
4. **持有三步**：把 `after_bars` 分 3 段，每段 5 根逐根动画揭晓。每段结束时显示当前浮盈浮亏，让玩家选：持有 / 加仓 / 减仓 / 平仓，发 `hold_step`。设了止损且被触发时自动平仓，发 `stop_triggered`。观望的玩家也走这三步，可以中途入场。
5. **结束**：发 `level_end`，调用 `onDone`。揭晓真实名称和 AI 对手由 C 的揭晓页负责，你不用做。

## 模拟成交（简单就好）

- 决定按 t=0 收盘价成交；加仓 / 减仓按当步最后一根收盘价成交；止损按触发价成交。
- `pnl` 用小数收益率，做空方向取反。

## 要做到的工作量

- 完整的一关流程，手机竖屏单手能玩（主要按钮在屏幕下半部分）。
- 线索卡有翻牌动画，研究点不足时卡片置灰。
- K 线逐根揭晓的动画，决定时刻画一条竖线。
- 整关 40–60 秒能玩完，第一次玩不看说明也能懂（按钮文字直白，必要时一行提示）。
- 补充关卡（`isSupplementary` 为 true）时，顶部有明显标识"补充关卡：再看看你"。

## 必须遵守

- **提交 decision 之前不能调用 `loadReveal()`**，也不能用任何方式提前拿到后续数据。
- 事件 data 字段严格按协议，不随意加删。确实需要新字段，先改 `docs/protocol.md`（只能加可选字段）。
- 不在页面上显示真实名称和日期（那是 C 的揭晓页的事）。

## 怎么自测

- 用示例关卡玩一遍，在控制台检查事件序列，和 `data/samples/sample_events.json` 的结构对照。
- 用三种不同玩法各玩一遍（全翻线索轻仓、不翻线索重仓、观望），确认事件都对。
- 在手机浏览器（或开发者工具的手机模式）里试。
