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

第 2 步已完成三种路径浏览器自测、18 项测试和生产构建。动画、手机布局与节奏留待后续打磨 PR；未在真实手机上验证。
AI 辅助实现；复用 C 的 MarketChart 和现有 React，无新增第三方库。
