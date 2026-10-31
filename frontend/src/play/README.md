# 对局玩法

main 已提供 Vite + React + TypeScript 骨架；类型从 `../shared/protocol` 引用。

运行：在 `frontend` 执行 `npm ci`、`npm run dev`。本目录不增加第三方依赖。
入口 `index.ts` 导出协议第 5 节约定的 `PlayLevel`。

开发步骤 0：已核对 main 的 `frontend/package.json`，无需等待骨架。

## 完整流程与验证

看盘 → 在预算内翻线索 → 方向/仓位/信心/止损 → 提交 → 才调用 loadReveal → 三步操作 → onDone。
仓位档位为 0/20%/50%/100%，加减一档；观望可以选择多空方向中途入场。
初始资金归一为 1；每笔按成交价格换算数量，减仓实现收益，剩余持仓按最新价估值。
止损基于当前持仓加权成本，多头检查最低价、空头检查最高价，按触发价成交（包括跳空）；不计费用和滑点。

`npm test` 检查盈亏/成本/多空止损；`npm run build` 验证类型与生产构建。
`npm run dev` 后打开 `/src/play/demo.html`，控制台打印 emit 与 onDone；示例揭晓只在提交后动态 import。
`node src/play/browser-check.mjs` 使用独立 Chrome 临时配置验证三种手机模式路径（可用 BROWSER_EXECUTABLE 指定浏览器）。
与 sample_events.json 对比的是事件字段结构，示例事件数值本来不保证与行情相符。
“全翻”按预算允许翻尽（L01 为三张）测试；不允许超预算。

第 2 步已完成三种路径浏览器自测、18 项测试和生产构建。未在真实手机上验证。

## 对局动画（第 3 步）

只改观感，不改事件、成交和止损逻辑：

- **线索翻牌**：线索卡做成正反两面，点开时 3D 翻面（0.55 秒）；研究点不够翻的卡置灰、虚线边框，正面直接写"研究点不足（还剩 N 点）"。
- **K 线逐根揭晓**：提交决定后，每步的 5 根 K 线每根约 150 毫秒依次出现（`reveal.ts` 的 `scheduleReveal`），图下方显示"第 N 步行情逐根揭晓中 · k/5 根"。放完之前持有/加仓/减仓/平仓按钮先按住，避免玩家对着还没画完的行情操作。记分板的"当前收益"跟着已画出的那根走；成交、止损和 `hold_step` 事件仍按整段 5 根一次算完，和之前完全一样。
- **决定时刻竖线**：提交后 t=0 的虚线从上往下画出来，右侧区域淡入（复用 `MarketChart` 的 `decisionT`）。
- **减少动态**：系统开了 `prefers-reduced-motion` 时，翻面和竖线不做过渡，K 线整段一次显示（JS 用 `matchMedia` 判断，CSS 同步关掉过渡）。
- `MarketChart` 只新增一个可选参数 `visibleCount`：前 N 根正常画，其余加 `candle-pending` 类（透明）。坐标按全部传入的 K 线算，逐根出现时图不会抖。不传时行为不变，揭晓页不受影响。
- 一关的动画总共多 2.25 秒（3 步 × 0.75 秒），整关仍在 40–60 秒内。

`npm test` 新增 `reveal.test.ts`（节奏、减少动态、取消）。`browser-check.mjs` 增加：翻开的卡 + 置灰的卡覆盖全部线索；提交后竖线存在；research / heavy 路径逐根出现期间操作按钮禁用，每步等 5 根画完再操作；flat 路径模拟 `prefers-reduced-motion: reduce`，整段一次出现。
AI 辅助实现；复用 C 的 MarketChart 和现有 React，无新增第三方库。
