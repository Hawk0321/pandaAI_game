# PandaAI 开发资源调研（2026-10-30）

> 说明：pandaaiquant.com 的 API 文档页和 quantskills.ai 都是 JS 渲染，静态抓取拿不到正文。Panda Data 部分是直接下载官方 SDK `panda_data` 1.0.5（PyPI）拆包读出来的函数清单，比文档页更全；QuantSkills 部分来自其 Gitee/GitHub 组织（238 个仓库，未全部逐个打开）。

## 结论先说

1. **Panda Data 完全够做"隐藏结局"历史行情关卡**：A股/期货/港股/美股/指数/基金都有日线、分钟线（1m/5m/15m/60m），期货还有 tick。
2. **没有 MT5 EA / 跟单（copy-trading）那种现成策略**，也没有网格、马丁。PandaAI 不做策略市场和跟单（官网声明不提供证券投资咨询）。
3. **但有大量"策略型 Skill"可以当推荐项和游戏里的 AI 对手人设**：均线交叉、海龟突破+ATR、CTA 动量/carry、均值回归、配对交易、超跌反弹、全天候等。规则都是公开的，游戏里可以用 JS 复刻成简化版对手。
4. **期货"席位"数据是天然的"跟单"替代品**：期货公司净持仓排名、席位盈亏、多空比。可以做"跟主力席位"人设，比 MT5 跟单更贴合国内语境，又是真数据。
5. **QuantSkills 里有两个和你之前"交易记录→用户画像"工作直接对应的技能**：`skill-trading-behavior-diagnostics`（解析交易记录、标出行为偏差）和 `skill-trade-review`。可以当推荐资源，也可以参考它们的偏差分类来对齐你的画像维度。

## 1. Panda Data（数据 API）

- 接入：`pip install panda_data`（Python ≥3.10，返回 pandas DataFrame）；服务地址默认 `http://pandadata.pandaaiquant.com`。
- 认证：`panda_data.init_token(username=..., password=...)`，用 PandaAI 平台账号密码换 token。按订阅/算力计费（Free 注册送 500 算力；数据套餐按月/季/年），限频和免费额度文档页拿不到，需要登录确认。
- 另有 MCP 服务：`https://pandadatamcp.pandaaiquant.com/mcp`（`search_methods` / `call_pandadata`）。
- **H5 前端不能直接调**（要账号密码、Python SDK）。建议做法：离线用 SDK 拉一批历史片段，打包成 JSON 静态题库放进游戏；或者后端代理一层。

### 对游戏有用的接口（函数名为 SDK 原名）

| 用途 | 函数 |
|---|---|
| A股 K线 | `get_stock_daily` / `get_stock_weekly` / `get_stock_monthly`，前/后复权 `_pre` / `_post` |
| A股分钟线 | `get_stock_min(symbol, start_date, end_date, frequency="1m/5m/15m/60m")` |
| 指数 | `get_index_daily`、`get_index_min` |
| 期货 | `get_future_daily`、`get_future_min`、`get_future_tick`、`get_future_dominant`（主力合约） |
| 港股 / 美股 | `get_hk_daily`、`get_hk_min`、`get_us_daily`、`get_us_index_daily` |
| 基金/ETF | `get_fund_daily`、`get_fund_min`、`get_fund_nav` |
| 因子 | `get_factor`、Barra 风格暴露 `get_factor_barra_exposure` 等 |
| 市场情绪/事件 | 龙虎榜 `get_lhb_list`/`get_lhb_detail`、融资融券 `get_margin`、北向 `get_hsgt_hold`、大宗交易 `get_block_trade` |
| **"跟单"替代：期货席位** | 净持仓多空榜 `get_future_netposi_rank`、席位品种盈亏 `get_broker_variety_profit`、多空比 `get_future_ls_ratio`、席位评级 `get_broker_grade` |

没看到 crypto 和外汇（forex）数据，MT5 常见的外汇/黄金差价合约行情这里没有；可以用期货黄金/白银（如 AU、AG 主力）替代。

## 2. PandaAI 平台本身

- 产品：Qube（一句话生成策略+回测）、EVO 多 Agent 投研、因子中心、QuantFlow 工作流、桌面客户端（SimNow 期货仿真）、Qube App。
- 首页自带策略模板（可直接作推荐项）：**茅台 5/20 双均线**、**海龟突破 + ATR 止损**、**多均线趋势过滤（MA5/20/60）**；因子模板：20日动量、低PB+高ROE、量价相关性。
- 活动：因子大赛（第四届进行中）、全国期货模拟赛、LLM 对抗赛。这些都可作为"下一步行动"推荐。
- 套餐：Free / Lite ¥49 / Pro ¥199 / MAX ¥499 每月。

## 3. QuantSkills

- PandaAI 发起的开源量化技能社区。`skill-*` 是给 AI Agent（Claude Code、Cursor 等）加载的能力包（SKILL.md + 脚本），`agent-*` 是多步工作流。分 Listed / Runnable / Verified 三级认证。
- 仓库：github.com/quantskills（gitee.com/quantskills 为镜像）。抽查的两个是 GPL-3.0。
- 大多是研究/因子/审计工具，明确"仅研究、不实盘"；交易类只部署 SimNow 模拟盘。

### 可当"策略"推荐项或 AI 对手人设的技能

| 人设方向 | 技能 |
|---|---|
| 趋势跟随 | `skill-ma-crossover-signal`、`skill-global-macro-trend-strategy`、`skill-trendline-breakdown-reversal` |
| CTA / 期货 | `skill-commodity-carry-cta`、`skill-futures-cta-alpha`、`skill-futures-hedgecraft`、`agent-ssquant` |
| 均值回归 / 抄底 | `skill-shortterm-mean-reversal`、`skill-oversold-rebound`、`skill-microstructure-vwap-deviation` |
| 套利 | `skill-simons-pairs-trading`、`skill-statistical-arbitrage-time-series`、`skill-etf-arbitrage` |
| 大师风格 | `skill-buffett-moat-screener`、`skill-graham-netnet-screener`、`skill-dalio-all-weather`、`skill-soros-reflexivity-detector`、`skill-keynes-contrarian-investment`、`skill-munger-mental-model` |
| 跟"聪明钱" | `skill-smart-money-profiler`、`skill-alpha-f1/f5/f6/f8`（期货席位持仓因子）、`skill-northbound-margin-monitor` |
| 风控 | `skill-b11-auto-stop-loss-take-profit` |
| 生成自己的交易员 | `skill-ssquant-trader-generator`（一句话想法→可加载的 AI 交易员，SimNow 模拟盘） |

### 可当"工具/课程"推荐项（对应画像弱点）

- 行为偏差 → `skill-trading-behavior-diagnostics`、`skill-trade-review`
- 过拟合/回测陷阱 → `skill-backtest-overfit`、`skill-backtest-assumption-check`、`skill-walk-forward-validator`
- 仓位/组合 → `skill-portfolio-risk-parity`、`skill-portfolio-checkup`
- 数据入门 → `skill-pandadata-api`

## 4. 建议的游戏用法

- **关卡数据**：离线用 `panda_data` 截取有代表性的历史片段（如暴涨暴跌、震荡、趋势），隐去标的名和日期，玩家做多/做空/观望，结束后揭晓真实标的和结局。
- **AI 对手**：同一段行情上跑 3 到 5 个简化策略（双均线、海龟、均值回归、跟主力席位、全天候），和玩家同屏比收益，结束后告诉玩家"你最像哪位"。
- **推荐**：画像标签 → 对应 Skill / PandaAI 策略模板 / 因子大赛 / 期货模拟赛，作为"下一步"。
- **待确认**：Panda Data 账号的免费额度和限频；比赛规则是否允许离线预取数据。
