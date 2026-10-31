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

### 动态交易人格卡（2026-10-31）

画像页新增九种动物人格插画、揭卡/翻面、图鉴预览和人物卡图片下载，包括「死扛刺猬」。九个 id 和名称以 #16 的 `frontend/src/profile/persona.ts` 为准（读取 `nate/recommend` 上的 `PERSONA_CARDS`，对应 #16 提交 `2f69246aff774c63c684d87626b046021358b6f5`）。既有图鉴编号保持稳定，刺猬为 09。角色名称、tagline、能力数值及卡背概览均读取 D 的 Profile；图鉴只是插画预览，不修改本局画像、不新增稀有度或人物等级。未知人物名保留原值并使用明确标记的通用插画。保存 PNG 只接收 `Profile.persona` 和插画，不包含会话 ID、原始事件、证据列表或私密行为记录；原 Profile JSON 导出继续保留。按用户要求，本轮不 rebase，也不提前修改或搬入 #16 的判定规则；等待用户通知后再集成上游，所以刺猬目前可在图鉴中预览，实际抽到哪个角色仍取决于当前 D 模块。

原始插画保存在 `src/shell/assets/persona-{bull,owl,shark,turtle,crab,dolphin,fox,sloth,hedgehog}.webp`，每张 1024×1024、约 225–304 KB，共约 2.4 MB。网页卡片和图鉴预览使用 640×640 的 `-card.webp` 移动版本（每张不超过 64,000 字节，9 张共 559,770 字节）；图鉴列表另用 200×200 的 `-thumb.webp` 缩略图（9 张共 111,378 字节），按需懒加载。可见人物卡、用户点开的预览和保存按钮请求使用高优先级，避免后台图片占用交互带宽。原始插画保留在仓库，不必在每次预览时下载。9 张原创插画由 OpenAI 内置 image_gen 生成，统一使用深翡翠绿、古铜光和手绘桌游风格；素材仅做尺寸与 WebP 编码优化，没有引入外部角色 IP、付费图库或新运行依赖。刺猬原图 266,494 字节，移动版 63,992 字节、缩略图 11,894 字节。图片文字由页面/Canvas 绘制，避免生成图片中的错字。

`PersonaArt.tsx` 使用浏览器 WebGL 在同一张轻量插画上实时绘制：按九个角色的位置分别设置身体呼吸、头部轻摆、尾巴/披风/钳子等局部位移和环境微光，画面外缘保留固定安全带。动画没有额外视频或动图下载，也不调用外部 AI 服务。最多播放当前可见的一张：翻背、打开图鉴、离屏、切到后台时停帧；图鉴只播放选中的预览。提供共用暂停/播放按钮，系统 `prefers-reduced-motion` 关闭角色动画及开卡/翻面过渡；首次 GPU 初始化也遵守这个设置。绘制上限约 24 fps、640px、设备像素比 1.5。WebGL 不支持、资源分配失败或上下文丢失时显示原静态插画。PNG 导出始终使用原静态素材。

<details>
<summary>生成提示词与素材记录</summary>

下列七个角色使用 `shared_prompt + prompt_suffix`，猫头鹰使用独立 prompt。工具为内置 image_gen，未使用 API/CLI fallback。

```json
{
  "tool": "built-in image_gen",
  "shared_prompt": "Use case: stylized-concept. Asset type: one square character illustration for a collectible trading-personality card in a mobile financial-learning game. Original anthropomorphic animal adventurer. Hand-painted premium board-game illustration with textured gouache and finely brushed details, charming, expressive and adventurous, strong appealing silhouette, polished fantasy game concept art, not corporate clip art. Square 1024 x 1024 composition, one central character fills 75% of the frame with room around the head and feet/fins. Rich deep emerald and near-black teal atmospheric backdrop, warm copper-gold light, restrained mint highlights, tactile fabric and brass details, dramatic soft lighting. No writing, letters, numbers, logos, watermarks, UI, card border, money symbols or performance claims. No existing copyrighted characters. Opaque background. ",
  "roles": [
    {
      "asset": "src/shell/assets/persona-bull.webp",
      "prompt_suffix": "A spirited copper-brown bull with large rounded horns, wearing a tailored dark-teal adventurer coat and a flowing burnt-orange scarf, charging forward across a stone bridge with confident energy. Wind catches the scarf; small blank parchment charts fly behind, abstract emerald mountain skyline. It is bold and charming rather than angry or violent. No weapons. This is the Charging Bull."
    },
    {
      "asset": "src/shell/assets/persona-shark.webp",
      "prompt_suffix": "An agile blue-gray anthropomorphic shark explorer, in an elegant deep-teal captain's waistcoat with brass details, swimming with a small brass magnifying lens studying an unlabeled translucent research chart in deep emerald water. Soft underwater light rays and a mysterious reef behind. Intelligent and focused, not frightening, no open toothy mouth. This is the Deep Sea Research Hunter."
    },
    {
      "asset": "src/shell/assets/persona-turtle.webp",
      "prompt_suffix": "A thoughtful old green tortoise adventurer with kind wise eyes, a beautifully textured protective shell and a teal travelling cloak, carefully holding a brass compass and a small closed ledger. Standing securely on a mossy stone in a tranquil emerald forest, warm lantern light. Charming and resolute. No numeric compass labels. This is the Steady Tortoise."
    },
    {
      "asset": "src/shell/assets/persona-crab.webp",
      "prompt_suffix": "A lively coral-orange crab adventurer with expressive eyes and a dark-teal explorer scarf, moving sideways across a tide pool against a flowing emerald current. One claw holds a small unlabeled brass compass, the other raised playfully. Painterly splashes and rounded tide rocks, copper sunset glow. Original charming fantasy game character. This is the Contrarian Crab."
    },
    {
      "asset": "src/shell/assets/persona-dolphin.webp",
      "prompt_suffix": "A joyful silver-blue dolphin adventurer with a flowing teal-and-copper neck scarf, surfing along the crest of a luminous emerald ocean wave. Dynamic upward curved body, clever friendly eyes, arcs of spray and distant sunset glow. No surfboard, no clothing covering the dolphin's body, fins anatomically recognizable. This is the Trend Surfer Dolphin."
    },
    {
      "asset": "src/shell/assets/persona-fox.webp",
      "prompt_suffix": "A clever red-orange fox adventurer with a white chest and rich fluffy tail, wearing a finely detailed dark-teal waistcoat with brass clasps, holding three small blank strategy cards and choosing between two winding emerald forest paths. Warm copper lantern glow, composed and adaptable expression. This is the Flexible Fox. No playing-card symbols or writing."
    },
    {
      "asset": "src/shell/assets/persona-sloth.webp",
      "prompt_suffix": "A relaxed but attentive brown sloth observer with gentle expressive eyes, wearing a small teal explorer cape and brass-trimmed round spectacles. Resting comfortably on a sturdy emerald rainforest branch while studying the distance through small brass binoculars, a closed blank field notebook nearby. Peaceful mist and warm lantern-like firefly light, deliberate and perceptive rather than sleepy. This is the Patient Sloth Observer."
    }
  ],
  "owl": {
    "asset": "src/shell/assets/persona-owl.webp",
    "prompt": "Use case: stylized-concept. Asset type: square character illustration for a collectible trading-personality card in a mobile financial-learning game. Create one original anthropomorphic owl researcher, full character visible, expressive intelligent eyes, small round spectacles, a dark teal explorer waistcoat, studying a few unlabeled paper charts under a warm brass desk lamp. A tiny crescent moon and atmospheric observatory shapes behind it. Hand-painted premium board-game illustration, textured gouache and finely brushed details, charming and adventurous, strong appealing silhouette, polished game concept art rather than corporate clip art. Portrait-like square composition 1024 x 1024, central character fills 75% of the frame with room around ears and feet. Rich deep emerald and near-black teal backdrop, warm copper-gold highlights and restrained mint glow. Soft dramatic cinematic light. This is the Night Owl Researcher personality. NO writing, letters, numbers, logos, watermarks, UI, card border, monetary symbols, or performance claims. No existing copyrighted characters. Opaque background."
  },
  "hedgehog_prompt": "Create a square full-bleed fantasy storybook game illustration of a cute anthropomorphic hedgehog adventurer, the Stubborn Hedgehog trading-personality. Centered full body with a round readable silhouette, face around 40 percent height, occupying central 65 percent of frame. The hedgehog curls protectively around a battered round shield and a small leather pouch, spines raised, determined brows, gently gritted teeth, brave and comically unwilling to let go. No injury. Dark teal travel cloak and worn tan leather belt. A magical forest refuge, mossy rocks, amber lantern light, curled leaves. Exquisite hand-painted premium board-game concept art, finely brushed fur and quills, rich deep emerald shadows, antique copper and warm golden highlights, palette copper tan #C9A36B with deep brown #33291B. Warm expressive character, detailed painted materials, soft dramatic lighting, adventurous and charming. Match a cohesive collection of painted emerald-and-gold animal adventurer cards. Not flat clip art, not photorealistic. No text, numbers, logos, watermarks, UI, card border, charts, humans or fox tail. Square 1:1, opaque background.",
  "optimization": "PNG originals retained in Codex generated_images; project originals resized to 1024px WebP quality 84. Mobile cards are 640px, quality selected to stay <=64000 bytes (hedgehog q44); thumbnails 200px. Bundled Sharp used only for resize/encoding. No semantic content edits."
}
```

</details>

### 自动验证

```sh
npm test
npm run build
# 另一个终端先运行 npm run dev，然后：
npm run test:browser
```

44 项单元测试覆盖 B 交易计算、C 的日志/存储/揭晓隔离、D 的证据/校准/置信度/补关与三组模拟玩家。浏览器脚本需要本机 Chrome/Edge（可用 `BROWSER_EXECUTABLE` 指定路径），使用独立临时配置，不接管日常浏览器。真实十关题库验收覆盖研究型、重仓型、全观望三条主线路径、真实画像、可用补关、第二轮画像、证据关联、JSON 导出、刷新和 375px/桌面布局；独立请求夹具保留新局索引更新、第二轮协议与存储归档失败验证。不会改写生产关卡或画像模块。

`PANDAAI_QA_URL` 可指定预览地址；静态生产站点设置 `PANDAAI_QA_FIXTURES=0`，只验证真实数据流程，跳过 Vite 源模块拦截夹具。桌面手机模拟不替代国内手机网络实测。

2026-10-31 插画卡验收：44 项单元测试和生产构建通过；本机完整回归及 Sites v4 匿名浏览器真实三条路径全部通过。新增检查覆盖八张插画及图鉴、鼠标/Enter/Space 翻面、焦点恢复、减少动态、375px/桌面布局、900×1320 PNG 下载及 Canvas 实际绘制文本隐私；图鉴预览不会改动 Profile 或日志。线上验收未注入额外优先级、未使用测试夹具、未放宽原 15 秒图片加载断言。

2026-10-31 动态卡本机验收：九张图鉴均用 WebGL `readPixels` 比较实际帧，确认角色中心像素变化而画面外缘固定；暂停、翻背、离屏、模态切换、系统减少动态时停帧，预览恢复和受控上下文丢失后的静态回退通过。真实三条路线、补关、第二轮、PNG/JSON 隐私、375px/桌面和独立夹具完整回归通过。`PANDAAI_QA_CAPTURE_MOTION=1` 可附录 36 张刺猬预览画布 PNG 与时序，用于制作 3 秒动态预览，产物只存本地验收目录，不入团队仓库。

Sites v5 匿名生产专项：九张图均返回 HTTP 200，最长加载 12.264 秒，保持原 15 秒门槛；九张实际像素动画、边缘固定、停帧条件、上下文丢失回退、图鉴及 PNG 隐私检查通过。完整生产回归在 research 路线刷新画像后的补关阶段报 `Timed out: supplement`；该次未持久化补关 JSON 请求，无法认定请求失败或点击竞态。单 research 诊断又在刷新导航等待报 `Timed out: page load completed`，未复现原补关失败；未据猜测修改产品或放宽门槛。**v5 完整三路线生产回归尚未全部通过**，不把动画专项通过表述成整局生产验收通过。

### 静态部署

当前公开演示：[寻找你的交易人格](https://pandaai-trading-persona-arkimo.chirpy-oasis-3049.chatgpt.site)。Sites v5 已于 2026-10-31 发布，允许免登录访问，包含已合并的十关题库、真实 B/D 模块及九张动态插画人物卡、独立图鉴缩略图与轻量移动插画。动态卡构建对应团队提交 `15c7c1aad8fc1daa3b23ee4a368aa3135ce4c077`，本次前端代码基于 `ARKimo-mo/persona-cards` 分支；尚未 rebase 集成 #16 的新判定规则。当前题库仍是 4 主关 + 6 补关，每局不会全部打完。

部署只需要 `npm ci && npm run build` 生成的 `dist/`；将目录内容放到静态托管根目录即可。Vite 使用相对资源路径，不需要服务端路由或 Panda Data 凭证。

本次使用 Sites 托管：在隔离部署目录复制已验证的前端 `dist/` 到新的静态发布目录，以 `.openai/hosting.json` 指定静态目录（v4 为 `dist/client`，v5 为 `.output/public`），保留旧版发布文件；站点 ID 为 `appgprj_6ae4b63d03548191a387f8126f4810f1`。通过 Sites 源码工作流同步、打包，保存版本并部署。打包工具会将声明的静态目录规范化，不将旧构建混入新站。该托管目录及短期凭证不提交到团队仓库；后续更新复用同一站点 ID，重新构建、检查后再发布。本机打包采用 Node 24 LTS：系统 Node 25 在托管打包准备脚本发生原生崩溃，Node 24 已确认该步骤成功。站点按用户要求设为公开访问，不要求评委登录。

验收记录（2026-10-30）：线上匿名 Chrome 验证通过，执行 `PANDAAI_QA_FIXTURES=0` 的完整示例流程、375px/桌面布局、刷新、延迟揭晓和 JSON 导出；JS、CSS、关卡 JSON 与本机构建产物一致。HTML 保留原始页面并由托管平台额外注入 Cloudflare 检查脚本。

国内手机网络实测：ARKimo-mo 已按“关闭 Wi-Fi 和代理、使用国内移动网络打开公开链接，完成开始 → 观望提交 → 揭晓 → 画像 → 导出”的验收请求确认“已在国内移动网络完整跑通”。运营商和手机浏览器型号未提供；该记录来源于用户实机确认，区别于桌面浏览器手机模拟。

来源：React、React DOM、Vite、官方 React 插件、TypeScript；开发测试使用 Vitest 和本机 Chrome/Edge 的 CDP；真实关卡来自 Panda Data，测试夹具来自本仓库模拟样例；新增 C 模块代码由 OpenAI Codex 协助生成。人格插画由内置 image_gen 生成，提示词见上节。未复制外部游戏代码。原有 `PandaAI_Skill_Card_Demo.html` 保留，仅供视觉参考。

集成状态与剩余交付事项见 [集成验收与缺口](../docs/integration-status.md)（该文档的“尚未发布”记录早于本次更新）。旧站 2026-10-30 的国内手机实测仅适用于旧版，本次不将该结果当作 v5 动态卡的实机验收。

## K 线 Skill 卡牌 Demo

- 文件：[PandaAI_Skill_Card_Demo.html](PandaAI_Skill_Card_Demo.html)。
- 依赖与配置：原生 HTML、CSS、JavaScript，无第三方运行依赖，无需安装、构建或配置环境变量。
- 查看方式：下载该 HTML 文件，用现代浏览器直接打开即可；GitHub 文件页只展示源码。页面包含适配手机宽度的布局。
- 玩法：选择 Skill，使用技能或提交模拟买卖指令，推进 12 回合，查看游戏画像和推荐研究任务；结算页可导出本地行为 JSON。
- 数据：默认使用模拟 OHLCV 行情；也可通过右上角 CSV 按钮导入至少 36 行数据，字段为 `open,high,low,close,volume`，按输入顺序读取前 36 行。导入和导出均在浏览器本地处理。
- 未完成项：未接入 Panda Data API、真实财报、模型服务或官方生产推荐接口；“AI 研究员”为规则解释，画像和推荐仅为概念演示。当前为离线原型，导入 CSV 的完整数据驻留浏览器，正式历史行情题需由后端隔离未揭晓数据。
- 来源：HTML 为用户提供的已有 Demo，本次由 Codex 整理上传并补充说明，未改动原始 HTML。原 Demo 的第三方来源及生成工具尚未提供，待作者补充。
