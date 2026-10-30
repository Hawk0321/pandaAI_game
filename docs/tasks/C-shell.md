# 任务 C：流程与展示（项目骨架、整局串联、揭晓页、画像页、部署）

> 给负责人和 AI 读。开工前先读：`AGENTS.md`、`README.md`、`docs/protocol.md`（全文，你是串起所有模块的人）。

## 你做什么

搭前端项目骨架，把整局游戏串起来：首页 → 说明 → 4 关正式关卡（每关后揭晓页）→ 画像页 → 补充关卡 → 更新后的画像页。保存行为事件，部署出手机能打开的链接。

## 你负责的目录

- `frontend/` 下的项目配置（`package.json`、`vite.config.ts`、`index.html` 等）
- `frontend/src/shell/`（App、页面、事件日志、加载器）
- `frontend/src/main.tsx`、全局样式
- `frontend/README.md`（依赖、启动、部署方式）
- 不改 `src/play/`、`src/profile/` 里面的代码。

## 第一件事（开场 45 分钟内完成，其他人在等）

1. 用 Vite 建 React + TypeScript 项目，放在 `frontend/`。
2. 建好空目录 `src/play/`、`src/profile/`、`src/shared/`，各放一个占位 `index.ts`，导出协议里规定的函数名（先返回假数据），保证项目能跑。
3. 把 `data/samples/levels/` 复制到 `frontend/public/levels/`。
4. 推送并开 PR，在群里说一声。之后 B 和 D 在这个骨架上各写各的目录。

## 整局流程（按 `docs/protocol.md` 第 6 节）

- **加载器**：读 `/levels/index.json`、`/levels/Lxx.play.json`；`loadReveal` 只在 B 调用时才去请求 `Lxx.reveal.json`。
- **事件日志**：给 B 的 `emit` 补上 `seq`、`session_id`、`level_id`、`t_ms`、`at`，存在内存并同步到 `localStorage`（刷新不丢）。C 自己发 `session_start`、`reveal_view`、`profile_view`、`session_end`。
- **揭晓页**（每关结束后）：真实名称、日期区间、完整走势图（可见部分 + 后续部分，决定时刻画线）、你的结果 vs 3 个 AI 对手。强调"这关的关键线索是什么、你看了没有"（`key_clue_ids` 对照玩家翻过的线索）。
- **画像页**：把 `Profile` 画出来。
  - 人物卡：`persona` 的名字、emoji、一句话。
  - 能力和偏好**分成两栏**，每个维度显示判断、置信度（low/medium/high 用颜色区分）、展开后看证据和"还不确定什么"。
  - 证据里的 `event_seqs` 可以点开，显示对应那一关那一步的动作。
  - `needs_more` 不为空时，显示"还有一点看不准"，按钮进入补充关卡（关卡 id 来自 D 的 `pickNextLevel`）。
  - 第 2 次画像页显示 `changes`：哪些判断因为补充关卡变了。
  - 导出按钮：下载 Profile JSON。
- **首页和说明**：一句话说清楚玩什么，30 秒以内的玩法说明，开始按钮。

## 要做到的工作量

- 完整一局从首页到第 2 次画像页能顺畅跑通。
- 手机竖屏优先，所有页面在 375px 宽度下不横向滚动。
- 部署：选一个评审期间国内手机能稳定打开的静态托管（Vercel / Netlify / 腾讯云 COS / 阿里云 OSS 等，**要在国内手机网络实测**），在 `frontend/README.md` 写清部署步骤。
- 示例数据还在用时，页面角落显示"示例数据"标记。

## 必须遵守

- 揭晓数据只在 B 提交决定之后加载。
- 画像页上的结论全部来自 D 的 `Profile`，C 不自己编判断。
- 分享出去的内容不展示原始行为记录（比赛隐私要求），只展示人物卡和判断。

## 怎么自测

- 用示例数据跑完整一局；B 和 D 还没交付时用占位实现跑。
- 用 `data/samples/sample_profile.json` 直接渲染画像页，检查每个字段都展示到了。
- 手机上实际打开部署链接走一遍。
