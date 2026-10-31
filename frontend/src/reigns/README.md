# 交易滑牌（Reigns 类）

手机竖屏优先的交易主题滑牌游戏：先选一个身份，再左右滑动做决定，管理四条数值，任意一条触底或爆满就结局。结局页展示玩家的交易人物卡（带动态插画），并引到 PandaAI 产品和 QuantSkills 技能包。卡牌内容为原创虚构示例（`is_sample: true`），不含真实行情；人物卡是趣味表达，不构成投资建议。

## 依赖与配置

- 复用 `frontend/` 已有依赖（React、Vitest），没有新增依赖。
- 不需要任何密钥或环境变量，前端不调用 Panda Data。
- 选角页使用 `assets/avatars/` 的三张像素头像与锁定占位；所有事件 speaker 已接入
  `assets/characters/` 的 neutral 人物图，“自己”使用对应角色的思考气泡剪影。
  头像加载失败时回退到原 emoji。
- 属性条按 low / normal / high 切换 `assets/icons/` 的像素图标，拖动提示使用四槽位
  不同形状的小图标；小图标由确定性像素绘制生成，不依赖 AI 生图。
- 2026-10-31 的四张样张由 `gpt-image-2.5` 生成，再离线量化为 64×64、单图最多 16 色。
  完整素材规划为 162 张基础图，另有 15 张可选换色；当前只接入已完成的四张，详见生成记录。
- 动态人物卡复用 `../shell/` 的 `PersonaArt`、`PERSONA_ARTWORKS` 和 `persona-card.css`（只 import，不修改，见下文）。
- 引流资源来自 `../recommend/catalog.ts` 的 `CATALOG`，人物卡来自 `../profile/persona.ts` 的 `PERSONA_CARDS`。

## 启动

在 `frontend/` 目录启动开发服务器（`package.json` 里的 `dev` 脚本），然后打开 `/src/reigns/demo.html`。电脑上用 ← → 键或拖动，手机上直接滑动。

```bash
npx vitest run src/reigns   # 单测
npx tsc --noEmit            # 类型检查
```

## 角色与四条属性

引擎里仍是四个固定槽位（`capital` / `risk` / `confidence` / `reputation`），语义对所有角色一致：钱、安全垫、定力、外界认可。不同角色只是叫法和含义不同（数据在 `roles.ts` 的 `ROLES`）。游戏里点数值条上的名字可展开一句话说明。

| 槽位 | 基金经理 | Web3 玩家 | 炒股达人 |
|---|---|---|---|
| `capital` 钱 | 业绩：基金净值和排名 | 钱包资产：钱包里所有资产折合的价值 | 账户资金：账户里的本金和浮盈 |
| `risk` 安全垫 | 回撤控制：回撤和仓位的安全垫 | 保证金健康：距离被清算有多远 | 仓位风控：止损纪律和仓位安全垫 |
| `confidence` 定力 | 投研定力：团队的信念和判断一致性 | 钻石手：拿得住的定力 | 心态：盘中的情绪稳定度 |
| `reputation` 外界认可 | 客户信任：持有人和销售渠道的信任 | 社区声量：推特和社群里别人怎么看你 | 股友口碑：股友群里别人对你的评价 |

选角页还有第四张灰色“待开发”卡片（`COMING_SOON_ROLE`），`aria-disabled="true"`，点不进游戏。

流程：选角（`RoleSelect`）→ 游戏中 → 结局页。结局页“再来一局”回到选角页，“同一角色再来一次”直接用同一角色重开。结局页还有折叠的“结局图鉴”，列出该角色全部结局（`getEndings(role)`），本局达成的显示标题，没达成的显示“？？？”，不剧透。

## 动态人物卡

`PersonaReveal.tsx` 用 `resolvePersona(state, cards)` 得到最终展示的人格，所有角色都展示。

**人格与结局的适配规则**（`personaRules.ts` + `engine.resolvePersona`）：
1. 按本局风格标签累计推断的人格（`inferPersona`），如果与结局兼容，就直接采用（source='tally'）。
2. 如果不兼容（例如标签推断是"冲锋蛮牛"，结局却是"清盘通知"），就在该结局的兼容人格表里用本局种子伪随机选一个（source='seeded'），权重偏向本局标签次数更多的人格。同一局永远得到同一结果。

**"为什么是你"文案与依据胶囊**（`personaCopy.ts`，`buildWhyLine` / `buildEvidenceChips`，死逻辑、不随机）：

| 情况 | 文案 | 胶囊 |
|---|---|---|
| tally，唯一最高且次数 >= 3 | “有 N 次选择偏X，占全部带风格倾向选择的 P%” | 次数、占比、主要线索 |
| tally，并列最高 | “好几种风格不相上下（各 N 次）”，不写占比 | 次数、并列最高 |
| tally，次数 1–2 或不是最高 | “选择比较分散，偏X的有 N 次”，不写占比 | 次数（最高时加主要线索） |
| tally，次数 0（标签全空） | “选择没有明显的偏向”，不写数字 | 无 |
| seeded，次数 > 0 | 讲结局与人格的关系，补一句“你有 N 次选择偏X”，不写占比 | 只有次数 |
| seeded，次数 0 | 只讲结局与人格的关系，不写 0 次、0% | 无 |

引流卡（`referral.ts`）用的也是同一个最终人格，所以卡片里引用的次数和人物卡一致。结局页数值摘要的“触底 / 爆满”只出现在真正到 0 / 100 的数值上；中途特殊结局和存活结局页面上不会出现。

全部文案不下定性结论、不给投资建议、不出现"买入/卖出/稳赚"；各角色用中性词，不出现"股友""营业部"等只属于某个场景的词。

插画来自 main 分支 shell 模块（#17）：9 张静态 webp，由 `shell/PersonaArt.tsx` 用 WebGL 着色器实时做呼吸、摇摆和光点，没有 gif 或视频。

- 通过 `PERSONA_ARTWORKS`（`shell/personaArtwork.ts`）按人物卡 id 找插画，主色 `accent` 用作卡片描边和强调色；找不到插画时回退到 emoji。
- `prefers-reduced-motion` 或 WebGL 不可用时，`PersonaArt` 自动显示静态图；卡片上另有“暂停动态 / 播放动态”按钮。
- 样式：引入了 `shell/persona-card.css`，它的选择器全部以 `persona-` 开头，不会影响 reigns 以外的页面；外层容器尺寸写在 `reigns.css`（`.reigns-persona-art`）。

## 目录说明

| 文件 | 作用 |
|---|---|
| `types.ts` | 共享契约（数值、卡牌、结局、引擎接口） |
| `roles.ts` | 三个角色及各自四条属性的名称与含义，`COMING_SOON_ROLE` |
| `engine.ts` | 纯函数引擎：`createGame` / `choose` / `previewEffects` / `inferPersona` |
| `cards.ts`、`adventures.ts`、`allCards.ts` | 日常卡、由真实关卡改写的奇遇卡、合并后的牌库 `ALL_CARDS` |
| `ReignsGame.tsx` | 状态机（选角 → 游戏 → 结局）、拖动/按钮/方向键、“后来……”一行、奇遇小标签 |
| `RoleSelect.tsx` | 选角页 |
| `PersonaReveal.tsx` | 动态交易人格卡 |
| `personaCopy.ts` | “为什么是你”文案与依据胶囊（`buildWhyLine` / `buildEvidenceChips`） |
| `EndingScreen.tsx` | 结局页：结局 → 本局摘要 → 人物卡 → 再来一局 / 同角色再来 → 引流卡 → 结局图鉴 |
| `referral.ts` | `buildReferrals()`：人物卡 + 结局 + 数值 + 风格标签 → 3 张引流卡 |
| `reigns.css` | 样式，类名统一 `reigns-` 前缀 |
| `demo.html` / `demo.tsx` | 独立试玩入口 |

## 引流规则（referral.ts）

每局固定 3 张，顺序为策略、工具、产品，三张指向不同资源：

1. 策略：人物卡对应的技能包（`recommend.ts` 的 `PERSONA_STRATEGY`）；蛮牛用止损技能包、刺猬用行为诊断兜底。
2. 工具：按结局补短板，映射表写在 `referral.ts` 的 `TOOL_BY_STAT` 上方注释。
3. 产品：默认 Qube；夜猫研究员、深海猎鲨给量化因子中心。

文案只引用本局事实（风格标签次数、结局和数值），不出现买卖建议。`buildReferrals` 的可选第五个参数 `role`（缺省取 `ending.role`）只改文案口吻（基金经理提到“持有人”，Web3 提到“链上”），资源映射和三张卡的结构不变。
