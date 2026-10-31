# 推荐规则说明（画像 → 推荐卡片 → PandaAI / QuantSkills）

> 写给评委和队友：画像出来之后，我们推荐什么、为什么推荐、点下去去哪里。
> 代码在 `frontend/src/recommend/`，阈值在 `recommend.ts` 的 `R`，资源在 `catalog.ts`。全部是规则计算，不用大模型。
> 可推荐资源的完整盘点见 [recommend-resources.md](recommend-resources.md)。

## 1. 思路

推荐的目的是把玩家引到 PandaAI 的产品和 QuantSkills 的开源技能包，让"在游戏里看出的习惯"接上"真实的量化工具"。

```
画像的 6 个维度（判断 + 分数 + 置信度 + 证据）
   → 按规则挑出最匹配的策略、最该补的短板、最合适的产品/活动/课程
   → 最多 4 张卡片，每类最多一张，至少一张 PandaAI 产品卡
   → 每张写清：依据哪项判断、引用哪条行为证据、为什么推荐、按钮跳到哪里
```

| 卡片类型 | 作用 | 资源来源 |
|---|---|---|
| 策略 | 按人物卡或交易风格推荐可回测的规则 | QuantSkills 策略技能包 |
| 工具 | 补能力短板（止损、行为偏差、复盘、防过拟合） | QuantSkills 工具技能包 |
| 产品 | 每份画像必有一张，引到 PandaAI 平台 | Qube、量化因子中心 |
| 活动 | 适合当下水平的比赛 | 全国期货模拟赛、因子大赛 |
| 学习 | 研究或证据使用偏弱时，给系统学习入口 | 量变学院课程、新手入门文档 |

链接都在 2026-10-31 核实过，标 `is_sample: false`。

## 2. 触发规则

阈值：能力分 ≤ 0.45 算短板，≥ 0.65 算不错；偏好分 ≥ 0.65 或 ≤ 0.35，且置信度不低、没有冲突，算倾向明确；风险偏好 ≤ 0.2 算几乎不入场。

| 卡片 | 类型 | 触发条件 | 优先级 |
|---|---|---|---|
| 人物卡对应的策略技能包（见 [personas.md](personas.md) 第 4 节） | 策略 | 人物卡有专属策略（蛮牛、刺猬没有） | 70 |
| [skill-ma-crossover-signal](https://github.com/quantskills/skill-ma-crossover-signal) 均线金叉死叉 | 策略 | 无专属策略时，趋势偏好明确 | 70 |
| [skill-oversold-rebound](https://github.com/quantskills/skill-oversold-rebound) 超跌反弹 | 策略 | 无专属策略时，反转偏好明确 | 70 |
| [skill-qbti](https://github.com/quantskills/skill-qbti) 性格 → 策略问答 | 策略 | 以上都不满足（兜底） | 40 |
| [skill-b11-auto-stop-loss-take-profit](https://github.com/quantskills/skill-b11-auto-stop-loss-take-profit) | 工具 | 风险控制短板 | 100 − 分数×100 |
| [skill-trade-review](https://github.com/quantskills/skill-trade-review) | 工具 | 证据使用短板 | 95 − 分数×100 |
| [skill-trading-behavior-diagnostics](https://github.com/quantskills/skill-trading-behavior-diagnostics) | 工具 | 判断校准短板 | 92 − 分数×100 |
| [skill-backtest-overfit](https://github.com/quantskills/skill-backtest-overfit) | 工具 | 证据使用和研究深度都不错 | 50 |
| [skill-market-daily-review](https://github.com/quantskills/skill-market-daily-review) 收盘复盘 | 工具 | 研究深度偏低 | 45 |
| [量化因子中心](https://www.pandaaiquant.com/quantfactor-center) | 产品 | 证据使用和研究深度都不错 | 60 |
| [Qube](https://www.pandaaiquant.com/agent_quant/) | 产品 | 其余情况（兜底）；趋势型提示双均线/海龟模板 | 55 |
| [全国期货模拟赛](https://www.pandaaiquant.com/contest/) | 活动 | 几乎不入场 | 80 |
| [第四届因子大赛](https://www.pandaaiquant.com/factorhub/fourthFactorCompetition/) | 活动 | 三项能力都不错 | 58 |
| [量变学院课程](https://www.pandaaiquant.com/learninghub/newcourse) | 学习 | 研究深度或证据使用偏弱 | 48 |
| [新手入门文档](https://www.pandaaiquant.com/docs) | 学习 | 判断校准证据不足 | 35 |

## 3. 排序与条数

- 每类只留优先级最高的一张；产品卡必留；其余按优先级取前 3。
- 最终按优先级排序展示，所以第一张总是这份画像最突出的问题或特点。
- 每张卡的 `based_on` 列出依据的维度、判断原文和最多 2 条证据原文；页面"依据"里可以展开。
- 卡片底部注明"推荐只基于本局游戏行为，不构成投资建议"。

## 4. 三条演示路径

用 `data/samples/profile/` 的 3 组模拟玩家（模拟关卡）：

| 模拟玩家 | 人物卡 | 推荐卡片（按顺序） |
|---|---|---|
| 冲动重仓型 | 🐂 冲锋蛮牛 | 止损技能包 → 均线策略 → Qube（趋势模板）→ 量化课程 |
| 谨慎研究型 | 🦉 夜猫研究员 | 因子大赛上手技能包 → 量化因子中心 → 因子大赛 → 防过拟合 |
| 只看不做型 | 🦥 树懒观察员 | 全国期货模拟赛 → 相似 K 线搜索 → Qube → 逐笔复盘 |

现场改一个关键选择：冲动型改成每关半仓、设 5% 止损、浮亏就平仓后，止损技能包不再出现。（测试 `recommend.test.ts` 覆盖。）

用真实关卡自测：`npm run dev` 后打开 `/src/recommend/demo.html?player=impulsive`（或 `cautious`、`watcher`）。

## 5. 已知局限

- 资源目录是人工整理的，没有接入 PandaAI 的推荐接口；链接以 2026-10-31 的页面为准。
- QuantSkills 技能包需要在 AI 编程助手（Claude Code、Codex 等）里加载，H5 里只能跳到仓库页。
- 阈值根据游戏设计定，没有用真实用户数据校准。
