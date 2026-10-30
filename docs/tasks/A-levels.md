# 任务 A：关卡数据（Panda Data → 关卡 JSON）

> 给负责人和 AI 读。开工前先读：`AGENTS.md`、`README.md`、`docs/protocol.md`（第 2 节是你的输出格式）、`docs/pandaai-resources.md`（Panda Data 接口清单）。

## 你做什么

写 Python 脚本，用 Panda Data 拉真实历史行情，切成游戏关卡。玩家看到一段隐去名称和日期的 K 线做判断，之后揭晓真实走势。关卡的质量直接决定游戏好不好玩，也决定画像能不能读出东西。

## 你负责的目录

- `backend/levels/`：所有脚本、`requirements.txt`、`README.md`
- `frontend/public/levels/`：脚本的输出（只放生成的 JSON，不放代码）
- `docs/panda-data.md`：数据说明
- 不改其他目录。

## 输入

- Panda Data SDK：`pip install panda_data`，`panda_data.init_token(username=..., password=...)`。
- 账号密码只从环境变量 `PANDA_DATA_USERNAME`、`PANDA_DATA_PASSWORD` 读，绝不写进代码或提交。
- 主要用 `get_stock_daily_pre`（前复权日线）、`get_index_daily`（同期大盘），资金面可选 `get_margin`（融资融券）、`get_hsgt_hold`（北向）。

## 输出（格式严格按 `docs/protocol.md` 第 2 节）

- `index.json`：`main` 放 4 关正式关卡，`pool` 放补充关卡并标注每关检验哪个维度（`probes`）。
- 每关 `Lxx.play.json` + `Lxx.reveal.json`。
- 可见 60 根日线（t = -59…0），之后 15 根（t = 1…15）放在 reveal 里。

## 要做到的工作量

1. **8–10 关**，覆盖 6 种行情：单边上涨、暴跌、震荡、假突破、V 型反转、跳空。4 关进 `main`（行情类型要不同），其余进 `pool`。
2. **每关 4–6 张线索卡**，类型从成交量、均线、同期大盘、融资余额、北向持仓、突破回测里选。每张线索的 `text` 和 `signal` 由脚本按可见数据自动算出，不手写。
3. **关键线索**：每关挑片段时就想好"哪张线索真正有用"，写进 `key_clue_ids`。好的关卡里，关键线索和表面信号最好方向相反（比如价格创新高但缩量），这样才能区分"会不会用证据"。
4. **补充关卡**：`pool` 里至少每个能力维度（`evidence_use`、`calibration`、`risk_control`）各有一关专门检验它。比如检验 `risk_control` 的关，揭晓后先大跌再反弹，看玩家浮亏时怎么处理。
5. **3 个 AI 对手**：双均线（MA5/MA20）、海龟突破（20 日高点）、均值回归（偏离 MA20 超过 2 倍标准差反向）。脚本按 t=0 时的状态定方向，算持有到 t=15 的收益。
6. `docs/panda-data.md`：用了哪些接口、哪些字段、复权方式、时间口径（t 怎么对应真实日期）、每关的真实标的和区间列表。

## 必须遵守（评分硬要求）

- **信息隔离**：play 文件里不能有真实名称、真实日期、行情类型、t > 0 的任何数据。线索计算只能用 t ≤ 0 的数据，包括均线和回测。写一个自检脚本：扫描所有 play 文件，确认没有 reveal 才该有的字段，并确认 bars 的最大 t 是 0。
- 价格可以按 t=-59 那天的收盘价归一化到 100，防止玩家通过价位认出股票（真实价格放 reveal）。
- 没有 Panda Data 账号时，先用模拟数据跑通整条流水线，文件里标 `is_sample: true`，`source.api` 写明是模拟。

## 怎么自测

- `python backend/levels/build.py` 一条命令生成全部关卡。
- 自检脚本通过。
- 把生成的文件放到 `frontend/public/levels/`，在游戏里能直接加载（可以找 C 一起验）。

## 交付顺序

1. 先交 2 关真实数据（上午中段），让 B 和 C 尽早用真数据测。
2. 再补齐 8–10 关和补充关卡池。
3. 下午做完后，转去帮 B 做对局页的动画和手机适配（和 B 商量拆分）。
