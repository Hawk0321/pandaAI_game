# 关卡数据（A）

负责人：张家诚（jczhang1105）。Python 3.10+；离线构建、自检和测试仅使用标准库。

本目录生成 `docs/protocol.md` 约定的关卡文件。真实数据通过 Panda Data 官方 MCP 导出，使用本机 Codex 已授权的 OAuth 登录，不读取、导出或提交登录凭证。

## 离线生成与检查

在仓库根目录运行，使用仓库内已冻结的真实行情，不需要登录或联网：

```sh
python backend/levels/build.py
python backend/levels/check.py
python -m unittest discover -s backend/levels -p 'test_*.py' -v
```

输出为 `frontend/public/levels/index.json` 和两对 `Lxx.play.json` / `Lxx.reveal.json`。仅决定前的 60 根 K 线及线索进入 play；后续 15 根、真实身份、日期、结果和对手收益进入 reveal。筛选报告留在本目录，不能复制到前端 public。

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
python backend/levels/check.py
```

`fetch.py --only bank` 可单独更新一个数据集，选项为 `bank/gold/benchmark/calendar`。脚本每次查询至多三个月，拒绝截断预览、失败响应和试用响应；不会遇错重试或自动切换模拟数据。MCP 通过 Codex 管理的 OAuth 访问，不读取密码、token 或凭证文件，不触发任何模型推理。用于工具调用的临时上下文不保存为聊天。服务或实验性 CLI 协议变更时需重新核对适配器。

`source_data/*.json` 保存真实公共行情、查询参数、请求编号、时间和行数据哈希，支持离线复现；上游完整性状态如实保留为 unknown。原始响应仅放在忽略的 `.cache/`。不要把 `.cache/`、凭证或 `user.json` 加入提交。刷新快照后应重新审核筛选结果及 `docs/panda-data.md`。

## 本次范围与来源

首批为平安银行假突破、沪金 AU2504 固定合约上涨两关，每关 6 张线索、3 个策略对手。价格按可见首日收盘归一化，期货使用无杠杆价格收益率。不是完整的 4 主关卡 + 补充关卡版本；`check.py --require-complete` 会在尚未达到 8–10 关、6 种行情和补充关卡覆盖要求时明确失败。

数据口径、选段阈值、日期及局限见 [数据说明](../../docs/panda-data.md)。代码由 OpenAI Codex 编写，运行时使用 Python/Node 标准库及 Codex CLI；行情来自 Panda Data 官方 MCP，未复制 QuantSkills 第三方代码。
