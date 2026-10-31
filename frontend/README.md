# 前端

## React + TypeScript 应用（C / ARKimo-mo）

环境：Node.js 20.19+ 或 22.12+（Vite 要求），npm。React 18 保持协议中 `JSX.Element` 的类型兼容。

```sh
cd frontend
npm ci
npm run dev
```

打开终端给出的地址；同一局域网手机可访问 Network 地址。生产检查和预览：

```sh
npm run build
npm run preview
```

产物在 `dist/`，不提交依赖、构建产物或 `.env`。不需要 Panda Data 凭证，前端不调用 Panda Data。

模块入口：`src/play/index.ts` 提供 B 的真实交易交互；`src/profile/index.ts` 提供 D 的规则画像和补关选择；C 的 `src/shell/` 负责串联。类型和 props 遵守 `docs/protocol.md`。

`public/levels/` 为 A 从 Panda Data 历史快照生成的 10 道真实行情题（4 主关 + 6 补关），生成与复核见 `backend/levels/README.md` 和 `docs/panda-data.md`。画像根据本局动作计算，包含 6 个维度、事件证据和不确定项；不再返回固定样例。每局主线 4 关，按画像情况最多补 1 关，题库 10 关不代表一局必须打完 10 关。当前范围为“游戏 → 证据 → 画像”，推荐及后续任务尚未实现。

### 流程与展示

- 首页 → 30 秒说明 → 正式关卡 → 每关揭晓 → 第一轮画像；`pickNextLevel` 返回尚未玩过的池内关卡时可进入补充关卡，再调用 `analyze({ round: 2, previous })` 展示变化。
- `src/shell/runtime.ts` 延迟请求关卡 JSON。创建加载器、首页、索引和 play 加载不会请求 reveal；只有 B 在提交 `decision` 后显式调用 `loadReveal()` 才请求揭晓，重复调用共享缓存。
- C 为事件补齐 `seq/session_id/level_id/t_ms/at`；关内按 `level_start` 计时，关外按 `session_start` 计时。事件在内存保存并同步当前浏览器的 `localStorage`，不会发送到服务器。
- 存档键为 `pandaai:c-shell:v1`。揭晓页和画像页刷新后恢复进度、会话与序号；揭晓停留时间在离开页面时记录。当前 B 接口不提供仓位恢复入口，所以对局中途刷新会保留已记录事件并提示重新开局，上一局另存 `:previous`，不混入新局画像。浏览器禁用存储或空间不足时会明确提示限制。
- 揭晓页显示标的、日期、可见和后续 OHLC K 线、决定时刻线、玩家与三个 AI 对手的结果，以及关键线索是否查看。
- 画像页仅展示 `analyze()` 返回的内容：人物卡、能力/偏好两栏、置信度、证据、冲突、不确定项、补充理由和第二轮 `changes`。真实画像的事件编号可展开本局动作；固定示例的编号不误关联本局同序号事件。
- 导出仅下载 Profile JSON，不附加原始事件日志；没有把原始行为公开分享的入口。

### 自动验证

```sh
npm test
npm run build
# 另一个终端先运行 npm run dev，然后：
npm run test:browser
```

44 项单元测试覆盖 B 交易计算、C 的日志/存储/揭晓隔离、D 的证据/校准/置信度/补关与三组模拟玩家。浏览器脚本需要本机 Chrome/Edge（可用 `BROWSER_EXECUTABLE` 指定路径），使用独立临时配置，不接管日常浏览器。真实十关题库验收覆盖研究型、重仓型、全观望三条主线路径、真实画像、可用补关、第二轮画像、证据关联、JSON 导出、刷新和 375px/桌面布局；独立请求夹具保留新局索引更新、第二轮协议与存储归档失败验证。不会改写生产关卡或画像模块。

`PANDAAI_QA_URL` 可指定预览地址；静态生产站点设置 `PANDAAI_QA_FIXTURES=0`，只验证真实数据流程，跳过 Vite 源模块拦截夹具。桌面手机模拟不替代国内手机网络实测。

### 静态部署

当前公开演示：[寻找你的交易人格](https://pandaai-trading-persona-arkimo.chirpy-oasis-3049.chatgpt.site)。Sites v1 已于 2026-10-30 发布，允许免登录访问。这是旧版 C 示例部署，仍使用单关示例/占位模块；本次集成后的十关与真实 B/D 尚未发布，不能用旧站代表当前 main。

部署只需要 `npm ci && npm run build` 生成的 `dist/`；将目录内容放到静态托管根目录即可。Vite 使用相对资源路径，不需要服务端路由或 Panda Data 凭证。

本次使用 Sites 托管：在隔离部署目录复制已验证的 `dist/`，以 `.openai/hosting.json` 指定静态目录 `dist`；站点 ID 为 `appgprj_6ae4b63d03548191a387f8126f4810f1`。通过 Sites 源码工作流同步、打包，保存版本并部署。该托管目录及短期凭证不提交到团队仓库；后续更新复用同一站点 ID，重新构建、检查后再发布。本机打包采用 Node 24 LTS：系统 Node 25 在托管打包准备脚本发生原生崩溃，Node 24 已确认该步骤成功。站点按用户要求设为公开访问，不要求评委登录。

验收记录（2026-10-30）：线上匿名 Chrome 验证通过，执行 `PANDAAI_QA_FIXTURES=0` 的完整示例流程、375px/桌面布局、刷新、延迟揭晓和 JSON 导出；JS、CSS、关卡 JSON 与本机构建产物一致。HTML 保留原始页面并由托管平台额外注入 Cloudflare 检查脚本。

国内手机网络实测：ARKimo-mo 已按“关闭 Wi-Fi 和代理、使用国内移动网络打开公开链接，完成开始 → 观望提交 → 揭晓 → 画像 → 导出”的验收请求确认“已在国内移动网络完整跑通”。运营商和手机浏览器型号未提供；该记录来源于用户实机确认，区别于桌面浏览器手机模拟。

来源：React、React DOM、Vite、官方 React 插件、TypeScript；开发测试使用 Vitest 和本机 Chrome/Edge 的 CDP；真实关卡来自 Panda Data，测试夹具来自本仓库模拟样例；新增 C 模块代码由 OpenAI Codex 协助生成。未复制外部游戏代码或引入外部图片。原有 `PandaAI_Skill_Card_Demo.html` 保留，仅供视觉参考。

集成状态与剩余交付事项见 [集成验收与缺口](../docs/integration-status.md)。旧站 2026-10-30 的手机验收仅适用于旧版，发布新版后需重新验证。

## K 线 Skill 卡牌 Demo

- 文件：[PandaAI_Skill_Card_Demo.html](PandaAI_Skill_Card_Demo.html)。
- 依赖与配置：原生 HTML、CSS、JavaScript，无第三方运行依赖，无需安装、构建或配置环境变量。
- 查看方式：下载该 HTML 文件，用现代浏览器直接打开即可；GitHub 文件页只展示源码。页面包含适配手机宽度的布局。
- 玩法：选择 Skill，使用技能或提交模拟买卖指令，推进 12 回合，查看游戏画像和推荐研究任务；结算页可导出本地行为 JSON。
- 数据：默认使用模拟 OHLCV 行情；也可通过右上角 CSV 按钮导入至少 36 行数据，字段为 `open,high,low,close,volume`，按输入顺序读取前 36 行。导入和导出均在浏览器本地处理。
- 未完成项：未接入 Panda Data API、真实财报、模型服务或官方生产推荐接口；“AI 研究员”为规则解释，画像和推荐仅为概念演示。当前为离线原型，导入 CSV 的完整数据驻留浏览器，正式历史行情题需由后端隔离未揭晓数据。
- 来源：HTML 为用户提供的已有 Demo，本次由 Codex 整理上传并补充说明，未改动原始 HTML。原 Demo 的第三方来源及生成工具尚未提供，待作者补充。
