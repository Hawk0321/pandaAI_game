# 前端

## React + TypeScript 骨架（C / ARKimo-mo）

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

`public/levels/` 原样复制自 `data/samples/levels/`，目前只有 L01；`analyze` 返回固定 `sample_profile.json`。页面明确标记“示例数据”和占位流程，不能把示例判断视为用户本次测试结论。占位玩法先发 `decision`，再调用 `loadReveal()`；完整流程、日志、揭晓页和画像页由后续 shell PR 实现。

来源：React、React DOM、Vite、官方 React 插件、TypeScript；关卡和画像来自本仓库示例；骨架代码由 Codex 协助生成。原有 `PandaAI_Skill_Card_Demo.html` 保留，仅供视觉参考。

H5 页面代码（需支持手机访问）。确定技术栈后，在这里补充依赖、配置和启动方式。

## K 线 Skill 卡牌 Demo

- 文件：[PandaAI_Skill_Card_Demo.html](PandaAI_Skill_Card_Demo.html)。
- 依赖与配置：原生 HTML、CSS、JavaScript，无第三方运行依赖，无需安装、构建或配置环境变量。
- 查看方式：下载该 HTML 文件，用现代浏览器直接打开即可；GitHub 文件页只展示源码。页面包含适配手机宽度的布局。
- 玩法：选择 Skill，使用技能或提交模拟买卖指令，推进 12 回合，查看游戏画像和推荐研究任务；结算页可导出本地行为 JSON。
- 数据：默认使用模拟 OHLCV 行情；也可通过右上角 CSV 按钮导入至少 36 行数据，字段为 `open,high,low,close,volume`，按输入顺序读取前 36 行。导入和导出均在浏览器本地处理。
- 未完成项：未接入 Panda Data API、真实财报、模型服务或官方生产推荐接口；“AI 研究员”为规则解释，画像和推荐仅为概念演示。当前为离线原型，导入 CSV 的完整数据驻留浏览器，正式历史行情题需由后端隔离未揭晓数据。
- 来源：HTML 为用户提供的已有 Demo，本次由 Codex 整理上传并补充说明，未改动原始 HTML。原 Demo 的第三方来源及生成工具尚未提供，待作者补充。
