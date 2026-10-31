# 画像后的技能卡

依赖现有 React / TypeScript，无新增运行依赖、后端、密钥或在线模型。

在 `frontend/` 执行 `npm ci && npm run dev`。完成主线，画像页出现四张卡，前两张按画像优先推荐。点击卡片、选择已完成关卡和参数、完成练习，可导出独立的推荐与练习 JSON。原 `profile/v1` 和事件协议保持兼容。

| 文件 | 用途 |
|---|---|
| `model.ts` | 四张卡的来源版本、游戏改动、推荐排序及同会话证据筛选 |
| `simulations.ts` | 双均线、止盈止损、反转确认的因果模拟与事件复盘 |
| `SkillCards.tsx` / `skills.css` | 卡面、实验室、参数、曲线、完成反馈与导出 |
| `skills.test.ts` | 推荐差异、证据归属、成交/跳空、信号时序、空仓与数据不可变性 |

`npm test` 验证规则；`npm run build` 验证类型及生产构建。先启动 dev 再 `npm run test:browser`，验证三条主线路径中的全部卡片、参数变化、导出及手机布局。

完整规则、来源、简化范围见 [技能卡说明](../../../docs/skill-cards.md)。这是参考 QuantSkills 用途与通用策略规则、独立编写的游戏练习，不是直接运行其完整 Python Skill。未复制或打包上游源码，未将上游 236 个仓库引入 H5。代码由 OpenAI Codex 协助完成。
