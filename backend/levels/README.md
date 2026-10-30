# 关卡数据（A）

负责人：张家诚（jczhang1105）。Python 3.10+；离线构建、自检和测试仅使用标准库。

本目录生成 `docs/protocol.md` 约定的关卡文件。真实数据通过 Panda Data 官方 MCP 导出，使用本机 Codex 已授权的 OAuth 登录，不读取、导出或提交登录凭证。

## 离线生成与检查

在仓库根目录运行，使用仓库内已冻结的真实行情，不需要登录或联网：

```sh
python backend/levels/build.py
python backend/levels/check.py --require-complete
python -m unittest discover -s backend/levels -p 'test_*.py' -v
```

输出为 `frontend/public/levels/index.json` 和十对 `L01…L10.play.json` / `L01…L10.reveal.json`。索引包含 4 个主关卡与 6 个补充关卡，每个能力维度各有 2 个补充关卡。仅决定前的 60 根 K 线及线索进入 play；后续 15 根、真实身份、日期、结果和对手收益进入 reveal。筛选报告留在本目录，不能复制到前端 public。

使用 Node.js 22.18+ 验证 C 的实际加载器与决定前的请求拦截：

```sh
node --experimental-strip-types backend/levels/check_frontend.mjs
```

前端的启动、构建和部署以 `frontend/README.md` 为准。

## 更新真实行情

另需 Node.js 和支持实验性 app-server API 的 Codex CLI（本次使用 `0.166.0-alpha.5.1`），先按 [官方 MCP 文档](https://www.pandaaiquant.com/docs/api?api=data_mcp) 完成本机登录：

```sh
codex mcp add pandadata --url https://pandadatamcp.pandaaiquant.com/mcp
# 已添加服务时，只需在登录过期后运行：
codex mcp login pandadata
python backend/levels/fetch.py
python backend/levels/build.py
python backend/levels/check.py --require-complete
```

`fetch.py --only bank` 可单独更新一个数据集，选项为 `bank/maotai/catl/eastmoney/zijin/shenhua/gold/silver/benchmark/calendar`。`fetch.py --missing-only` 只取尚未冻结的数据集，保留已有快照；此次用该选项补齐后续关卡源数据。共冻结 6 只 A 股、沪金/沪银固定合约、大盘和日历 10 个数据集、3,234 行。

脚本每次查询至多三个月，拒绝截断预览、失败响应和试用响应；不会遇错重试或自动切换模拟数据。MCP 通过 Codex 管理的 OAuth 访问，不读取密码、token 或凭证文件，不触发任何模型推理。用于工具调用的临时上下文不保存为聊天。服务或实验性 CLI 协议变更时需重新核对适配器。

`source_data/*.json` 保存真实公共行情、查询参数、请求编号、时间和行数据哈希，支持离线复现；上游完整性状态如实保留为 unknown。原始响应仅放在忽略的 `.cache/`。不要把 `.cache/`、凭证或 `user.json` 加入提交。刷新快照后应重新审核筛选结果及 `docs/panda-data.md`。

## 本次范围与来源

题库已扩展为 10 关，覆盖上涨、暴跌、震荡、假突破、V 型反转、跳空。首批 L01/L02 的 JSON 保持不变。每关 6 张线索、3 个策略对手；价格按可见首日收盘归一化，期货使用无杠杆价格收益率。

`build.py` 自动检查完整题库要求；`check.py --require-complete` 还验证 4 个主关卡的类型不同、六种行情均有实际价格证据、补充关卡的信号冲突/不确定性/先跌后反弹条件成立。同标的决定日相隔至少 60 个交易日，同能力补充关卡相隔至少 30 个交易日，避免复用同一小段行情。

补充关卡索引已准备好，游戏中是否自动选中由 D 的 `pickNextLevel` 和 C 的流程决定，本模块不改动画像或前端组件。

数据口径、选段阈值、日期及局限见 [数据说明](../../docs/panda-data.md)。代码由 OpenAI Codex 编写，运行时使用 Python/Node 标准库及 Codex CLI；行情来自 Panda Data 官方 MCP，未复制 QuantSkills 第三方代码。
