# AI 开工指令（每人复制自己那段）

> 用法：把自己那一段**整段**复制给 Codex / Claude Code，只把【你的名字】换成自己的英文名或拼音。
> 前提：你已被 nate 加为仓库协作者并接受了邀请。

---

## A 关卡数据（张家诚 / jczhang1105）

```text
你是本项目“关卡数据”模块的开发者。项目是 PandaAI 苏客松参赛作品：一款手机 H5 游戏，玩家看隐去名称的真实历史 K 线做交易判断，我们从行为里读出交易画像。

【准备】
1. 仓库：https://github.com/Hawk0321/pandaAI_game 。没有就 git clone，有就 git checkout main && git pull origin main。
2. 按顺序完整阅读：AGENTS.md、docs/plan.md、docs/protocol.md、docs/tasks/A-levels.md、docs/pandaai-resources.md。之后所有工作以这些文件为准，有冲突以 docs/protocol.md 为准。
3. 新建分支：git checkout -b 【你的名字】/levels

【范围】
只能改：backend/levels/、frontend/public/levels/、docs/panda-data.md。其他文件一律不动。

【按这个顺序做，每完成一步就提交一次】
第 1 步：在 backend/levels/ 建 Python 项目（requirements.txt、README.md）。凭证只从环境变量 PANDA_DATA_USERNAME、PANDA_DATA_PASSWORD 读取。如果我还没设置这两个变量，先用模拟数据跑通全流程，输出标 is_sample: true。
第 2 步：写一条命令 python backend/levels/build.py，生成 2 关，格式严格符合 docs/protocol.md 第 2 节（对照 data/samples/levels/ 的示例）。写自检脚本 backend/levels/check.py，确认 play 文件里没有 t>0 的数据、没有真实名称/日期/scenario。
第 3 步：推送分支并开 PR（标题“关卡数据：首批 2 关”），告诉我 PR 链接。这一步要尽快，别人在等真数据。
第 4 步：扩展到 8–10 关、6 种行情、每关 4–6 张线索卡、3 个 AI 对手、补充关卡池（pool 和 probes），细节见 docs/tasks/A-levels.md。
第 5 步：写 docs/panda-data.md（接口、字段、复权、时间口径、每关真实标的和区间）。再开一个 PR。

【规则】
- 不提交任何密钥、.env、虚拟环境目录、大文件。
- 不改协议格式。觉得协议需要改，停下来告诉我原因，由我去找 nate。
- 不直接推 main，不强制推送。
- 每个 PR 描述写：改了什么、怎么运行、还没做完什么、用了哪些第三方库。
- 遇到报错（没权限、冲突、Panda Data 登录失败），停下来把错误原文告诉我，不要自己绕过。
```

---

## B 对局玩法

```text
你是本项目“对局玩法”模块的开发者。项目是 PandaAI 苏客松参赛作品：一款手机 H5 游戏，玩家看隐去名称的真实历史 K 线做交易判断，我们从行为里读出交易画像。你负责一关之内的全部交互，以及记录玩家每个动作的行为事件。

【准备】
1. 仓库：https://github.com/Hawk0321/pandaAI_game 。没有就 git clone，有就 git checkout main && git pull origin main。
2. 按顺序完整阅读：AGENTS.md、docs/plan.md、docs/protocol.md、docs/tasks/B-play.md。之后所有工作以这些文件为准，有冲突以 docs/protocol.md 为准。可以参考 frontend/PandaAI_Skill_Card_Demo.html 的卡牌视觉，但玩法按 B-play.md 做。
3. 新建分支：git checkout -b 【你的名字】/play

【范围】
只能改：frontend/src/play/。需要装依赖（如 lightweight-charts）时可以改 frontend/package.json，但只加依赖，不改其他配置。其他文件一律不动。

【按这个顺序做，每完成一步就提交一次】
第 0 步：检查 main 上有没有 frontend/package.json（项目骨架由 C 搭建）。如果还没有，先在 frontend/src/play/ 写不依赖框架的纯 TypeScript 逻辑（模拟成交、仓位和盈亏计算、事件 data 的构造），等骨架合并后 git pull origin main 再继续。
第 1 步：在骨架里实现 PlayLevel 组件，props 严格按 docs/protocol.md 第 5 节。用 data/samples/levels/L01.play.json 和 L01.reveal.json 开发，emit 先打印到控制台。
第 2 步：做完一关的完整流程：看盘 → 翻线索（研究点不够翻全部）→ 下决定（方向/仓位/信心/止损）→ 提交后才调用 loadReveal() → 持有三步（持有/加仓/减仓/平仓，止损自动触发）→ onDone。每个动作发协议规定的事件，data 字段一个不少。
第 3 步：推送分支并开 PR（标题“对局玩法：一关完整流程”），告诉我 PR 链接。
第 4 步：打磨：手机竖屏单手操作、翻牌动画、K 线逐根揭晓动画、决定时刻竖线、补充关卡标识、40–60 秒能玩完一关。再开一个 PR。

【自测】
用三种玩法各玩一遍（全翻线索轻仓、不翻线索重仓、观望），把控制台里的事件和 data/samples/sample_events.json 对照，结构必须一致。

【规则】
- 提交 decision 之前绝不能调用 loadReveal()，也不能用任何方式提前拿到后续数据。
- 页面上不显示真实名称和日期。
- 不改协议格式。觉得协议需要改，停下来告诉我原因，由我去找 nate。
- 不直接推 main，不强制推送，不提交 node_modules 和构建产物。
- 每个 PR 描述写：改了什么、怎么运行、还没做完什么、用了哪些第三方库。
- 遇到报错或冲突，停下来把错误原文告诉我，不要自己绕过。
```

---

## C 流程与展示

```text
你是本项目“流程与展示”模块的开发者。项目是 PandaAI 苏客松参赛作品：一款手机 H5 游戏，玩家看隐去名称的真实历史 K 线做交易判断，我们从行为里读出交易画像。你负责搭前端项目骨架、把整局游戏串起来、做揭晓页和画像页、部署上线。其他人要在你的骨架上开发，所以第 1 步最急。

【准备】
1. 仓库：https://github.com/Hawk0321/pandaAI_game 。没有就 git clone，有就 git checkout main && git pull origin main。
2. 按顺序完整阅读：AGENTS.md、docs/plan.md、docs/protocol.md（全文）、docs/tasks/C-shell.md。之后所有工作以这些文件为准，有冲突以 docs/protocol.md 为准。
3. 新建分支：git checkout -b 【你的名字】/skeleton

【范围】
只能改：frontend/ 下的项目配置文件、frontend/src/shell/、frontend/src/main.tsx、全局样式、frontend/README.md。第 1 步可以在 src/play/、src/profile/、src/shared/ 里各建一个占位文件，之后这三个目录不再动。

【按这个顺序做，每完成一步就提交一次】
第 1 步（45 分钟内）：在 frontend/ 用 Vite 建 React + TypeScript 项目。建 src/shared/protocol.ts（内容照抄 docs/protocol.md 第 2–5 节的类型）、src/play/index.ts（导出占位 PlayLevel，点按钮就调 onDone）、src/profile/index.ts（导出占位 analyze 返回 data/samples/sample_profile.json 的内容、pickNextLevel 返回 null）。把 data/samples/levels/ 复制到 frontend/public/levels/。npm run dev 能打开。推送并开 PR（标题“前端骨架”），马上告诉我 PR 链接。
第 2 步：新建分支 【你的名字】/shell。做加载器（loadReveal 只在被调用时才请求 reveal 文件）、事件日志（给 emit 补 seq/session_id/level_id/t_ms/at，存内存并同步 localStorage）、首页和 30 秒说明、按 docs/protocol.md 第 6 节串起整局。
第 3 步：揭晓页：真实名称、日期、完整走势（决定时刻画线）、你的结果 vs 3 个 AI 对手、本关关键线索你看了没有。
第 4 步：画像页：人物卡；能力和偏好分两栏；每个维度显示判断、置信度（颜色区分）、可展开证据和不确定项；needs_more 时进入补充关卡；第 2 次画像页显示 changes；导出 Profile JSON。先用 data/samples/sample_profile.json 渲染。推送并开 PR。
第 5 步：部署成手机可访问的静态网站，在国内手机网络实测能打开，把部署步骤写进 frontend/README.md。用示例数据时页面角落显示“示例数据”。

【规则】
- 揭晓数据只在玩家提交决定之后加载。
- 画像页的结论全部来自 analyze() 返回的 Profile，不自己编判断。
- 分享内容不展示原始行为记录。
- 不改协议格式。觉得协议需要改，停下来告诉我原因，由我去找 nate。
- 不直接推 main，不强制推送，不提交 node_modules、dist、.env。
- 每个 PR 描述写：改了什么、怎么运行、还没做完什么、用了哪些第三方库。
- 遇到报错或冲突，停下来把错误原文告诉我，不要自己绕过。
```

---

## D 证据与画像（nate）

```text
你是本项目“证据与画像”模块的开发者，同时帮我维护协议和合并队友的 PR。项目是 PandaAI 苏客松参赛作品：一款手机 H5 游戏，玩家看隐去名称的真实历史 K 线做交易判断，我们从行为里读出交易画像。

【准备】
1. 仓库：https://github.com/Hawk0321/pandaAI_game ，git checkout main && git pull origin main。
2. 按顺序完整阅读：AGENTS.md、README.md、docs/plan.md、docs/protocol.md、docs/tasks/D-profile.md。
3. 新建分支：git checkout -b nate/profile

【范围】
frontend/src/profile/、frontend/src/shared/protocol.ts、docs/profile.md；可选 backend/narrate/（接大模型时）。

【按这个顺序做，每完成一步就提交一次】
第 1 步：C 的骨架 PR 合并后，核对 src/shared/protocol.ts 与 docs/protocol.md 完全一致。
第 2 步：证据层（纯规则）：events + levels → EvidenceItem[]，覆盖 6 个维度，每条证据带 event_seqs。用 vitest 写单元测试。
第 3 步：判断层：EvidenceItem[] → Dimension[]，置信度按证据条数和一致性定，有反向证据标 conflict。persona 按维度组合映射 6–8 种趣味名字。实现 analyze()，round 2 时根据 previous 输出 changes。
第 4 步：pickNextLevel()：选置信度最低或有冲突的能力维度，从 index.pool 找 probes 匹配且没玩过的关卡；不需要时返回 null。
第 5 步：3 组模拟玩家（谨慎研究型、冲动重仓型、只看不做型）的事件放 data/samples/，测试里确认三者画像明显不同；改其中一组的关键选择，画像合理变化。
第 6 步：写 docs/profile.md，用评委能看懂的话说明每个维度的规则、阈值和依据。开 PR。
（可选）第 7 步：大模型润色 judgement/uncertain/summary，只能引用已有证据；API Key 放后端环境变量；调用失败回退规则版，method 如实填写。

【规则】
- 能力和偏好分开；收益不作为能力的唯一标准；每个判断至少一条证据。
- 证据不足就给 low 并写清还不确定什么。
- 不提交密钥，不直接推 main。
```
