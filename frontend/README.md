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

模块入口：B 替换 `src/play/index.ts` 的 `PlayLevel`；D 替换 `src/profile/index.ts` 的 `analyze` / `pickNextLevel`，并维护 `src/shared/protocol.ts`。C 在骨架 PR 后不再改这三个目录。类型和 props 遵守 `docs/protocol.md`，此阶段不增加协议字段。

`public/levels/` 原样复制自 `data/samples/levels/`，目前只有 L01；`analyze` 返回固定 `sample_profile.json`。页面明确标记“示例数据”和占位流程，不能把示例判断视为用户本次测试结论。占位玩法先发 `decision`，再调用 `loadReveal()`。C 按 `index.main` 的实际关卡顺序串联，不复制示例来冒充四关；A/B/D 的正式模块接入后沿用相同接口。

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

15 项单元测试覆盖事件时间/序号恢复、存储失败、揭晓延迟和缓存、路径与数据隔离、固定样例识别。浏览器脚本需要本机 Chrome/Edge（可用 `BROWSER_EXECUTABLE` 指定路径），使用独立临时浏览器配置，不接管日常浏览器。脚本以真实示例检查手机 375px 展示、揭晓请求顺序、刷新、画像证据和导出；通过明确的测试请求夹具验证四关主线、补充关卡和第二轮画像、新局索引更新和归档失败，不改写生产关卡或画像模块。浏览器手机模拟不能替代国内手机网络实测。

`PANDAAI_QA_URL` 可指定其他预览地址；验证静态生产站点时设置 `PANDAAI_QA_FIXTURES=0`，仅跑真实示例路径，不执行只适用于 Vite 源模块的拦截夹具。

### 静态部署

当前公开演示：[寻找你的交易人格](https://pandaai-trading-persona-arkimo.chirpy-oasis-3049.chatgpt.site)。Sites v1 已于 2026-10-30 发布，允许免登录访问。部署包含 C 的流程与展示，当前 A/B/D 仍使用仓库提供的示例/占位模块。

部署只需要 `npm ci && npm run build` 生成的 `dist/`；将目录内容放到静态托管根目录即可。Vite 使用相对资源路径，不需要服务端路由或 Panda Data 凭证。

本次使用 Sites 托管：在隔离部署目录复制已验证的 `dist/`，以 `.openai/hosting.json` 指定静态目录 `dist`；站点 ID 为 `appgprj_6ae4b63d03548191a387f8126f4810f1`。通过 Sites 源码工作流同步、打包，保存版本并部署。该托管目录及短期凭证不提交到团队仓库；后续更新复用同一站点 ID，重新构建、检查后再发布。本机打包采用 Node 24 LTS：系统 Node 25 在托管打包准备脚本发生原生崩溃，Node 24 已确认该步骤成功。站点按用户要求设为公开访问，不要求评委登录。

验收记录（2026-10-30）：线上匿名 Chrome 验证通过，执行 `PANDAAI_QA_FIXTURES=0` 的完整示例流程、375px/桌面布局、刷新、延迟揭晓和 JSON 导出；JS、CSS、关卡 JSON 与本机构建产物一致。HTML 保留原始页面并由托管平台额外注入 Cloudflare 检查脚本。

国内手机网络实测：ARKimo-mo 已按“关闭 Wi-Fi 和代理、使用国内移动网络打开公开链接，完成开始 → 观望提交 → 揭晓 → 画像 → 导出”的验收请求确认“已在国内移动网络完整跑通”。运营商和手机浏览器型号未提供；该记录来源于用户实机确认，区别于桌面浏览器手机模拟。

来源：React、React DOM、Vite、官方 React 插件、TypeScript；开发测试使用 Vitest 和本机 Chrome/Edge 的 CDP；关卡和画像来自本仓库示例；新增 C 模块代码由 OpenAI Codex 协助生成。未复制外部游戏代码或引入外部图片。原有 `PandaAI_Skill_Card_Demo.html` 保留，仅供视觉参考。

当前代码完成 C 的骨架、流程与展示。A 的真实关卡、B 的完整交互和 D 的真实分析规则由各模块负责；目前示例没有可用的新补充关卡，页面会保留不确定项并说明该限制。

## K 线 Skill 卡牌 Demo

- 文件：[PandaAI_Skill_Card_Demo.html](PandaAI_Skill_Card_Demo.html)。
- 依赖与配置：原生 HTML、CSS、JavaScript，无第三方运行依赖，无需安装、构建或配置环境变量。
- 查看方式：下载该 HTML 文件，用现代浏览器直接打开即可；GitHub 文件页只展示源码。页面包含适配手机宽度的布局。
- 玩法：选择 Skill，使用技能或提交模拟买卖指令，推进 12 回合，查看游戏画像和推荐研究任务；结算页可导出本地行为 JSON。
- 数据：默认使用模拟 OHLCV 行情；也可通过右上角 CSV 按钮导入至少 36 行数据，字段为 `open,high,low,close,volume`，按输入顺序读取前 36 行。导入和导出均在浏览器本地处理。
- 未完成项：未接入 Panda Data API、真实财报、模型服务或官方生产推荐接口；“AI 研究员”为规则解释，画像和推荐仅为概念演示。当前为离线原型，导入 CSV 的完整数据驻留浏览器，正式历史行情题需由后端隔离未揭晓数据。
- 来源：HTML 为用户提供的已有 Demo，本次由 Codex 整理上传并补充说明，未改动原始 HTML。原 Demo 的第三方来源及生成工具尚未提供，待作者补充。
