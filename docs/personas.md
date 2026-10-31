# 人物卡说明（给设计和前端）

> 9 张人物卡，每张对应一个有文献依据的行为金融学概念，由玩家这一局的行为特征直接判别（规则见 [features.md](features.md)）。
> 卡片数据的唯一来源是 `frontend/src/profile/persona.ts` 的 `PERSONA_CARDS`，本文和它保持一致；改文案请改那里。
> 人物卡是**趣味表达**（`is_fun_label: true`）：描述的是"这局游戏里的行为像什么"，不是心理诊断，也不是投资建议。文献描述的是人群层面的倾向。

## 1. 一览

| | 人物卡 | 金融学概念 | 一句话 | 主色 |
|---|---|---|---|---|
| 🦥 | **树懒观察员** | 损失厌恶 · 维持现状偏差 | 看得多、动得少，按兵不动也是一种选择 | `#8FB8A8` |
| 🐂 | **冲锋蛮牛** | 过度自信 | 看到机会就冲，先上车再说 | `#F28C6B` |
| 🦔 | **死扛刺猬** | 处置效应 | 亏了不认，缩成一团等它涨回来 | `#C9A36B` |
| 🦉 | **夜猫研究员** | 证据驱动 · 慢思考 | 线索翻遍才出手，证据说话 | `#9CE5CB` |
| 🦈 | **深海猎鲨** | 高确信集中下注 | 研究透了就下重注 | `#6FA8DC` |
| 🐢 | **稳健老龟** | 风险预算 | 慢一点没关系，先保住本金 | `#A3C77A` |
| 🐬 | **冲浪海豚** | 趋势跟随 · 动量 | 顺着浪头走，趋势就是朋友 | `#5EC8E5` |
| 🦀 | **逆行螃蟹** | 逆向投资 · 均值回归 | 别人追涨我抄底，偏爱反着走 | `#E5736B` |
| 🦊 | **灵活狐狸** | 适应性市场 | 没有固定套路，看情况出牌 | `#F2B35E` |

## 2. 卡片上有什么（数据契约）

`analyze()` 返回的 `profile.persona`（协议第 4 节）：

| 字段 | 例子 | 显示建议 |
|---|---|---|
| `emoji` + `name` | 🐂 冲锋蛮牛 | 卡片主视觉和标题，必显示 |
| `tagline` | 看到机会就冲，先上车再说 | 标题下一行，必显示 |
| `archetype` | 过度自信 | 小标签，告诉玩家"这在金融学里叫什么" |
| `traits` | 重仓 / 决定快 / 信心满格 | 3 个胶囊标签 |
| `why` | 平均仓位 100%，平均信心 5.0/5，命中率 50% | **"为什么是我"**，用本局数字说话，建议放在卡片正面 |
| `strength` / `blind_spot` | — | 正反两栏："你的长处" / "需要留意" |
| `basis` + `refs` | — | 卡片背面或"依据"折叠区；文献用小字 |
| `also` | 另外也有点像 🦔 死扛刺猬 | 卡片底部一行，可点开看那张卡 |
| `is_fun_label` | true | 卡片角落标"趣味人物卡" |

每张卡的视觉建议：`palette.main`（主色，用于描边、标签、插画主色）、`palette.soft`（深色底，适配现在的深色主题）、`mood`（插画/动效关键词）。现在用 emoji 占位，换成插画时保持同一动物和情绪。

建议的卡片层级（手机竖屏，一屏内）：

```
┌────────────────────────────┐
│ 趣味人物卡          过度自信 │  ← is_fun_label / archetype
│        🐂（插画）            │
│       冲锋蛮牛               │  ← name
│  看到机会就冲，先上车再说     │  ← tagline
│ [重仓] [决定快] [信心满格]    │  ← traits
│ 为什么是你：平均仓位 100%…   │  ← why（本局数据）
│ 长处 ……    │ 留意 ……        │  ← strength / blind_spot
│ 依据 ▸                       │  ← basis + refs（折叠）
│ 另外也有点像 🦔 死扛刺猬      │  ← also
└────────────────────────────┘
```

文案规则：不用"你是……的人"这种定性说法，用"这局里你……"；不出现"建议买入/卖出"；盲点要配一个可以做的下一步（画像页下方的推荐就是）。

## 3. 九张卡

### 1. 🦥 树懒观察员 · 损失厌恶 · 维持现状偏差

> 看得多、动得少，按兵不动也是一种选择

- **判别规则**：至少 3/4 的关选择观望
- **特征标签**：爱观望 / 怕亏损 / 重研究轻行动
- **长处**：不会因为冲动而亏钱，耐心是稀缺品质
- **需要留意**：把"不确定"当成"不行动"的理由，也就没机会验证自己的判断
- **金融依据**：前景理论发现，同样金额的损失带来的痛苦约是收益快乐的两倍，人因此倾向回避可能亏钱的选择；面对模糊信息时，人还会偏好"什么都不改"的默认选项。
- **文献**：Kahneman & Tversky (1979), Prospect Theory, Econometrica；Samuelson & Zeckhauser (1988), Status Quo Bias in Decision Making, J. Risk & Uncertainty；Ellsberg (1961), Risk, Ambiguity, and the Savage Axioms, QJE
- **视觉**：主色 `#8FB8A8`，底色 `#1E3530`；慢、安静、树枝上眯眼看盘

### 2. 🐂 冲锋蛮牛 · 过度自信

> 看到机会就冲，先上车再说

- **判别规则**：平均仓位 ≥ 70%，且信心比命中率高 15 个百分点以上（或平均信心 ≥ 4.5 且研究点用不到 40%）
- **特征标签**：重仓 / 决定快 / 信心满格
- **长处**：执行力强，机会来时不犹豫
- **需要留意**：信心常常高过实际把握，重仓放大了每一次看错
- **金融依据**：对数万个券商账户的研究发现，交易越频繁、越自信的散户，扣费后收益越差；过度自信表现为高估自己信息的准确度，并因此下更大的注。
- **文献**：Barber & Odean (2000), Trading Is Hazardous to Your Wealth, J. Finance；Odean (1999), Do Investors Trade Too Much?, AER；Lichtenstein, Fischhoff & Phillips (1982), Calibration of Probabilities
- **视觉**：主色 `#F28C6B`，底色 `#3A2219`；冲刺、红色尘土、低头顶角

### 3. 🦔 死扛刺猬 · 处置效应

> 亏了不认，缩成一团等它涨回来

- **判别规则**：浮亏时加仓 ≥ 2 次；或浮亏加仓 1 次、从不在浮亏时减仓且很少设止损
- **特征标签**：浮亏加仓 / 不愿止损 / 摊平成本
- **长处**：不怕波动，有坚持的韧劲
- **需要留意**：用加仓"摊平"来回避认错，小亏容易拖成大亏
- **金融依据**：处置效应指投资者倾向过早卖出赚钱的仓位、过久持有亏钱的仓位；对真实账户的研究证实，散户实现盈利的概率明显高于实现亏损。浮亏时加仓是它最典型的表现之一。
- **文献**：Shefrin & Statman (1985), The Disposition to Sell Winners Too Early and Ride Losers Too Long, J. Finance；Odean (1998), Are Investors Reluctant to Realize Their Losses?, J. Finance
- **视觉**：主色 `#C9A36B`，底色 `#33291B`；蜷成球、刺竖起、咬牙坚持

### 4. 🦉 夜猫研究员 · 证据驱动 · 慢思考

> 线索翻遍才出手，证据说话

- **判别规则**：研究点使用率 ≥ 80%，关键线索命中率 ≥ 70%，入场方向与线索一致率 ≥ 67%
- **特征标签**：研究点用足 / 先看关键线索 / 跟着证据走
- **长处**：决定有依据，不容易被单一信号带偏
- **需要留意**：研究得越多越容易觉得"已经想清楚了"，仍需检验规则是否只是巧合
- **金融依据**：双系统理论区分快速直觉（系统 1）与慢速推理（系统 2）；预测研究发现，愿意主动找反方证据、按新信息更新判断的人预测更准。确认偏误则是只找支持自己观点的证据。
- **文献**：Kahneman (2011), Thinking, Fast and Slow；Nickerson (1998), Confirmation Bias, Review of General Psychology；Tetlock & Gardner (2015), Superforecasting
- **视觉**：主色 `#9CE5CB`，底色 `#17332C`；夜色、台灯、翻卡片

### 5. 🦈 深海猎鲨 · 高确信集中下注

> 研究透了就下重注

- **判别规则**：平均仓位 ≥ 70%，研究点使用率 ≥ 70%，入场方向与线索一致率 ≥ 67%
- **特征标签**：研究深 / 仓位重 / 方向坚定
- **长处**：把研究优势转化为足够的仓位
- **需要留意**：集中下注时一次看错的代价很大，更需要止损和仓位上限
- **金融依据**：对主动管理基金的研究发现，持仓更集中的基金经理平均表现更好，说明有信息优势时集中是合理的；但凯利公式也提醒，下注比例应和真实胜率匹配，过度下注会显著增加破产风险。
- **文献**：Kacperczyk, Sialm & Zheng (2005), On the Industry Concentration of Actively Managed Equity Mutual Funds, J. Finance；Kelly (1956), A New Interpretation of Information Rate, Bell System Technical Journal
- **视觉**：主色 `#6FA8DC`，底色 `#16263A`；深蓝、静默逼近、一击即中

### 6. 🐢 稳健老龟 · 风险预算

> 慢一点没关系，先保住本金

- **判别规则**：入场的关至少 3/4 设了止损，平均仓位 ≤ 50%，从不浮亏加仓
- **特征标签**：轻仓 / 必设止损 / 不摊平
- **长处**：每笔交易都事先限定最大亏损，能活得久
- **需要留意**：仓位太轻时，看对了也赚不到多少
- **金融依据**：研究表明，在趋势性行情里，系统化止损规则能在不明显牺牲收益的情况下降低回撤；凯利框架下，在胜率不确定时用较小的下注比例更稳健。
- **文献**：Kaminski & Lo (2014), When Do Stop-Loss Rules Stop Losses?, J. Financial Markets；Kelly (1956), A New Interpretation of Information Rate, Bell System Technical Journal
- **视觉**：主色 `#A3C77A`，底色 `#232F18`；龟壳、稳步前行、盾牌

### 7. 🐬 冲浪海豚 · 趋势跟随 · 动量

> 顺着浪头走，趋势就是朋友

- **判别规则**：有明显趋势的关里，至少 2/3 顺势下单（至少 2 关）
- **特征标签**：涨了追 / 跌了空 / 顺势而为
- **长处**：跟上大级别趋势，和许多 CTA 基金的思路一致
- **需要留意**：趋势反转或假突破时容易追在最高点
- **金融依据**：动量效应是金融学最稳健的发现之一：过去 3–12 个月涨得多的资产，之后一段时间往往继续跑赢；时间序列动量在期货、股指、外汇等几十个市场中都存在。
- **文献**：Jegadeesh & Titman (1993), Returns to Buying Winners and Selling Losers, J. Finance；Moskowitz, Ooi & Pedersen (2012), Time Series Momentum, J. Financial Economics
- **视觉**：主色 `#5EC8E5`，底色 `#123039`；海浪、跃出水面、流线

### 8. 🦀 逆行螃蟹 · 逆向投资 · 均值回归

> 别人追涨我抄底，偏爱反着走

- **判别规则**：有明显趋势的关里，至多 1/3 顺势下单（至少 2 关）
- **特征标签**：跌多了买 / 涨多了空 / 不随大流
- **长处**：能在市场过度反应时找到机会
- **需要留意**："便宜还能更便宜"，逆势时更需要止损
- **金融依据**：研究发现市场会对消息过度反应：过去几年跌得最多的股票之后往往跑赢涨得最多的；短期（一周到一个月）也存在收益反转。
- **文献**：De Bondt & Thaler (1985), Does the Stock Market Overreact?, J. Finance；Jegadeesh (1990), Evidence of Predictable Behavior of Security Returns, J. Finance
- **视觉**：主色 `#E5736B`，底色 `#3A1C1A`；横着走、钳子、逆流

### 9. 🦊 灵活狐狸 · 适应性市场

> 没有固定套路，看情况出牌

- **判别规则**：以上都不满足
- **特征标签**：风格多变 / 随行情调整 / 不走极端
- **长处**：不被单一框架锁死，能根据情境调整
- **需要留意**：没有固定规则时，很难复盘到底是哪一步做对了
- **金融依据**：适应性市场假说认为，没有一种策略永远有效，参与者会随环境变化调整行为；有效的做法是知道自己在什么情境下用什么规则。
- **文献**：Lo (2004), The Adaptive Markets Hypothesis, J. Portfolio Management
- **视觉**：主色 `#F2B35E`，底色 `#3A2A14`；机敏、回头张望、尾巴一甩

## 4. 和维度、推荐的关系

- 人物卡由**特征**判别，6 维判断由**证据**得出，两者用同一套事件和阈值，结论方向一致。例如冲锋蛮牛的"信心偏高"在判断校准维度里有逐关证据。
- 卡片的"需要留意"和画像页的推荐卡片对应，推荐卡片的策略卡优先按人物卡挑（`recommend.ts` 的 `PERSONA_STRATEGY`）：

  | 人物卡 | 策略卡（QuantSkills） | 为什么 |
  |---|---|---|
  | 🦥 树懒观察员 | [skill-xingtai-catcher](https://github.com/quantskills/skill-xingtai-catcher) 相似 K 线搜索 | 不用下单，先看历史上相似走势后来怎样 |
  | 🐂 冲锋蛮牛 | 按趋势偏好（均线 / 超跌反弹） | 先补短板：止损技能包、行为偏差诊断排在前面 |
  | 🦔 死扛刺猬 | 按趋势偏好 | 先补短板：止损技能包排在前面 |
  | 🦉 夜猫研究员 | [skill-pandaai-factor-online](https://github.com/quantskills/skill-pandaai-factor-online) 因子大赛上手 | 翻线索的习惯就是因子研究的雏形 |
  | 🦈 深海猎鲨 | [skill-a-share-stock-dossier](https://github.com/quantskills/skill-a-share-stock-dossier) 个股档案 | 重仓之前把研究做扎实 |
  | 🐢 稳健老龟 | [skill-dalio-all-weather](https://github.com/quantskills/skill-dalio-all-weather) 全天候 | 风险预算扩展到资产配置 |
  | 🐬 冲浪海豚 | [skill-ma-crossover-signal](https://github.com/quantskills/skill-ma-crossover-signal) 均线金叉死叉 | 把顺势写成规则 |
  | 🦀 逆行螃蟹 | [skill-oversold-rebound](https://github.com/quantskills/skill-oversold-rebound) 超跌反弹 | 把抄底量化检验 |
  | 🦊 灵活狐狸 | [skill-market-regime-analysis](https://github.com/quantskills/skill-market-regime-analysis) 市场状态划分 | 把"看情况"变成可复盘的规则 |

  其余卡片（工具、PandaAI 产品、活动、课程）按 6 维判断挑，规则见 [recommend.md](recommend.md)。

## 5. 改卡片的流程

1. 改 `frontend/src/profile/persona.ts`（文案、规则或颜色）。
2. 在 `frontend/` 运行 `npx vitest run src/profile` 确认测试通过；改了规则要运行 `UPDATE_SAMPLES=1 npx vitest run src/profile/samples.test.ts` 更新示例。
3. 同步本文（第 1、3 节）和 [features.md](features.md) 第 4 节。
