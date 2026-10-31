# PandaAI / QuantSkills 可推荐资源盘点

> 2026-10-31 盘点，用来回答"推荐卡片能指向什么"。已经用进推荐的资源标 ✅，规则见 [recommend.md](recommend.md)。
> 另见前一天的开发资源调研 [pandaai-resources.md](pandaai-resources.md)（Panda Data 接口、策略型 Skill）。
> 来源：pandaaiquant.com 公开页面、github.com/orgs/quantskills/repositories、QuantSkills 组织 README。

## 1. QuantSkills 是什么

QuantSkills（[quantskills.ai](https://quantskills.ai)，GitHub [quantskills](https://github.com/quantskills)）是 PandaAI 发起的开源量化社区，收录两类资产：

- **Skill 技能包**（`skill-*`，215 个）：给 Claude Code、Codex 等 AI 编程助手加载的能力包，例如算因子、回测、复盘、生成报告。很多直接调用 Panda Data。
- **Agent 智能体**（`agent-*`，16 个）：多步工作流，例如市场状态监控、期货策略生成。

另有导航仓库 [quantskills/quantskills](https://github.com/quantskills/quantskills)（2.4k star）和本地工作台 [QuantStudio](https://github.com/quantskills/QuantStudio)。组织本身没有分类，下面按我们的用途归类，只列适合推荐给游戏玩家的部分。

注意：技能包需要在 AI 编程助手里加载，H5 只能跳到 GitHub 仓库页；部分仓库没有描述或标注为社区草稿，推荐前要点开确认。

### 1.1 策略类：适合做"你的风格 → 策略卡"

| 技能包 | 说明 | 对应风格 / 人物卡 |
|---|---|---|
| ✅ [skill-ma-crossover-signal](https://github.com/quantskills/skill-ma-crossover-signal) | 均线金叉死叉信号 | 趋势跟随 🐬 |
| ✅ [skill-oversold-rebound](https://github.com/quantskills/skill-oversold-rebound) | A 股超跌反弹择时与选股 | 逆势反转 🦀 |
| [skill-keynes-contrarian-investment](https://github.com/quantskills/skill-keynes-contrarian-investment) | 凯恩斯式反共识研究：过度乐观/悲观、价值陷阱 | 逆向 🦀 |
| [skill-shortterm-mean-reversal](https://github.com/quantskills/skill-shortterm-mean-reversal) | 短期均值回归（仓库无描述） | 逆势 🦀 |
| ✅ [skill-dalio-all-weather](https://github.com/quantskills/skill-dalio-all-weather) | 全天候资产配置：宏观象限 + 风险平价 | 风险预算 🐢 |
| [skill-portfolio-risk-parity](https://github.com/quantskills/skill-portfolio-risk-parity) | 风险平价组合 | 风险预算 🐢 |
| ✅ [skill-market-regime-analysis](https://github.com/quantskills/skill-market-regime-analysis) | 市场状态划分，先认环境再选策略 | 灵活 🦊 |
| [skill-rotation-radar](https://github.com/quantskills/skill-rotation-radar) | 行业轮动与市场状态识别 | 灵活 🦊 |
| ✅ [skill-a-share-stock-dossier](https://github.com/quantskills/skill-a-share-stock-dossier) | 一键生成 A 股个股研究档案（41 star） | 研究型 🦉 / 集中下注 🦈 |
| [skill-buffett-moat-screener](https://github.com/quantskills/skill-buffett-moat-screener) | 巴菲特式护城河选股与持仓复核 | 长期持有 |
| [skill-dividend-yield-scan](https://github.com/quantskills/skill-dividend-yield-scan) | 股息率与分红质量扫描（社区草稿） | 稳健 🐢 / 观望 🦥 |
| [skill-simons-pairs-trading](https://github.com/quantskills/skill-simons-pairs-trading) | 配对交易：同行业、协整筛选 | 进阶 |
| ✅ [skill-xingtai-catcher](https://github.com/quantskills/skill-xingtai-catcher) | 相似 K 线形态搜索（37 star），和本游戏"看 K 线"最贴近 | 所有人 |
| [skill-kline-pattern-vision](https://github.com/quantskills/skill-kline-pattern-vision) | 截图或行情识别 K 线形态 | 所有人 |
| ✅ [skill-qbti](https://github.com/quantskills/skill-qbti) | 五组问答把投资性格翻译成因子方向和策略参数 | 风格不明显时兜底 |

### 1.2 工具类：补能力短板

| 技能包 | 说明 | 对应维度 / 人物卡 |
|---|---|---|
| ✅ [skill-b11-auto-stop-loss-take-profit](https://github.com/quantskills/skill-b11-auto-stop-loss-take-profit) | 自动止盈止损、单票仓位上限 | 风险控制 🐂 🦔 |
| [skill-b12-intraday-position-manager](https://github.com/quantskills/skill-b12-intraday-position-manager) | 日内仓位动态管理 | 风险控制 |
| ✅ [skill-trading-behavior-diagnostics](https://github.com/quantskills/skill-trading-behavior-diagnostics) | 从交易记录识别行为偏差 | 判断校准 🐂 🦔 |
| [skill-forecast-calibration-audit](https://github.com/quantskills/skill-forecast-calibration-audit) | 概率预测可靠性：Brier 分数、校准曲线（和我们的校准口径一致） | 判断校准 |
| ✅ [skill-trade-review](https://github.com/quantskills/skill-trade-review) | 逐笔复盘 | 证据使用 |
| ✅ [skill-backtest-overfit](https://github.com/quantskills/skill-backtest-overfit) | 回测过拟合检测（41 star） | 研究型进阶 🦉 🦈 |
| [skill-walk-forward-validator](https://github.com/quantskills/skill-walk-forward-validator) / [skill-backtest-assumption-check](https://github.com/quantskills/skill-backtest-assumption-check) | 滚动验证、回测假设检查 | 研究型进阶 |
| [skill-portfolio-checkup](https://github.com/quantskills/skill-portfolio-checkup) | 持仓体检：集中度、估值、风险暴露 | 集中下注 🦈 |
| [skill-a-share-market-risk-radar](https://github.com/quantskills/skill-a-share-market-risk-radar) | 市场风险雷达（Qube 模板里也有） | 风险控制 |

### 1.3 数据与日常类：研究深度偏低时的入门

| 技能包 | 说明 |
|---|---|
| ✅ [skill-market-daily-review](https://github.com/quantskills/skill-market-daily-review) | 收盘复盘报告（53 star） |
| [skill-pandadata-api](https://github.com/quantskills/skill-pandadata-api) | 让 AI 助手直接调 Panda Data（本游戏数据来源） |
| [skill-stock-screener](https://github.com/quantskills/skill-stock-screener) | 自然语言选股 |
| [skill-fin-news](https://github.com/quantskills/skill-fin-news) / [skill-news-sentiment-analyst](https://github.com/quantskills/skill-news-sentiment-analyst) | 财经资讯聚合、新闻情绪 |
| [skill-futures-deepview-analyst](https://github.com/quantskills/skill-futures-deepview-analyst) | 期货持仓、基差、期限结构报告（25 star），适合沪金沪银关卡 |

### 1.4 因子研究类：研究型玩家的进阶，接因子大赛

✅ [skill-pandaai-factor-online](https://github.com/quantskills/skill-pandaai-factor-online)（因子大赛上手，夜猫研究员的策略卡）、[skill-factor-mining-pandaai](https://github.com/quantskills/skill-factor-mining-pandaai)、[skill-quant-factor-skill-factory](https://github.com/quantskills/skill-quant-factor-skill-factory)（72 star）、[skill-factor-orthogonalize](https://github.com/quantskills/skill-factor-orthogonalize)、[skill-factor-alpha191-alpha101](https://github.com/quantskills/skill-factor-alpha191-alpha101)，以及几十个 `skill-factor-*`、`skill-alpha-*`。

### 1.5 暂不推荐

机器学习模型（`skill-dl-*`、`skill-ml-*`、`skill-factor-model-*`）、数据审计（`*-auditor`）、组合优化与归因、港美股专题、名人研究模型、Agent 类。对游戏玩家门槛太高，或者和游戏行为没有对应关系。

## 2. PandaAI 产品与资源

| 名称 | 链接 | 是什么 | 门槛 |
|---|---|---|---|
| ✅ Qube | [agent_quant](https://www.pandaaiquant.com/agent_quant/) | 自然语言生成策略、回测、调参、仿真盘 | 快速试用免登录 |
| Qube 能力模板 | 同上 | 首页模板：5/20 双均线、海龟突破 + ATR 止损、多均线趋势过滤；期货模板如黄金 RSI 吊灯止盈；股票模板如红利低估、小市值、风格轮动 | 同上 |
| ✅ 量化因子中心 | [quantfactor-center](https://www.pandaaiquant.com/quantfactor-center) | 因子搜索、对比、诊断，带 AI 因子助手 | 免费版 20 个因子池，需登录 |
| AI 工作流 | [quantflow](https://www.pandaaiquant.com/quantflow/)（盘点时页面报错）/ [开源](https://github.com/PandaAI-Tech/panda_quantflow) | 节点式量化工作流 | — |
| EVO / A2A 办公室 | [evo](https://www.pandaaiquant.com/evo) | 多智能体投研 | 付费版 |
| 专业版客户端 | [download](https://www.pandaaiquant.com/download) | 策略信号直连交易 | 付费版，涉及真实下单，**不推荐给游戏玩家** |
| Panda Data | [docs/api](https://www.pandaaiquant.com/docs/api) | 行情、财务数据 SDK（本游戏数据来源） | 需账号 |
| ✅ 全国期货模拟赛 | [contest](https://www.pandaaiquant.com/contest/) | 模拟盘比赛，手动/策略/AI 辅助三赛道，进行中 | 报名 |
| ✅ 第四届因子大赛 | [fourthFactorCompetition](https://www.pandaaiquant.com/factorhub/fourthFactorCompetition/) | 永续赛制因子比赛，进行中 | 报名 |
| ✅ 量变学院 | [learninghub/newcourse](https://www.pandaaiquant.com/learninghub/newcourse) | L1 量化思维入门 → L6，线上视频 + 线下营 | 课程付费 |
| ✅ 新手入门文档 | [docs](https://www.pandaaiquant.com/docs) | 知识库、新手入门、各产品指南 | 免费 |
| 用户社区 | [community](https://www.pandaaiquant.com/community) | 策略与因子讨论、问答 | 免费 |
| 开源项目 | [panda_factor](https://github.com/PandaAI-Tech/panda_factor)（2.8k star） | 因子库开源版 | 免费 |

会员：Free（注册送 500 算力）、Lite ¥49/月、Pro ¥199/月、MAX ¥499/月，详见 [pricing](https://www.pandaaiquant.com/pricing)。网站声明不提供投资咨询，内容不构成投资建议。

## 3. 还能做成卡片的方向

- ✅ **人物卡 → 策略卡**：已实现，对应表见 [personas.md](personas.md) 第 4 节。
- **关卡 → 同款工具**：玩家在某关输了，推荐那关用到的同类工具，例如沪金关卡推 `skill-futures-deepview-analyst`、形态关推 `skill-xingtai-catcher`。
- **对手 → Qube 模板**：揭晓页的双均线、海龟、均值回归三个对手，正好对应 Qube 首页模板，可以加"一键用这个对手的规则回测"。
