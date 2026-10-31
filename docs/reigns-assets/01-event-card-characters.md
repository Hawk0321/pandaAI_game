# 事件卡人物：归并方案与立绘清单

> 规划文档，不含游戏代码，不含图片。尺寸、色板、描边、命名一律以 [00-style-bible.md](./00-style-bible.md) 为准，本文不修改它。
> 所有人物为原创虚构，不模仿现有游戏、品牌或真人。数据来源：`frontend/src/reigns/` 下 `cards.ts`、`adventures.ts`、`roleCards.ts`（当前共 81 张卡、56 种 speaker）。
> 全部为示例内容（is_sample），AI 生成部分需按 AGENTS.md 第 5 节在 PR 描述里披露。

## 0. 怎么用这份文档

给 AI 助手和美术同学：

- 先看第 1 节，知道哪个 speaker 对应哪个人物原型（下称“原型”）。
- 要出图：去第 2.3 节找原型 id，整段使用“提示词”；“负面提示词”用于人工筛选和局部重绘时的补充约束。每条提示词都是完整可用的（已含公共前缀），默认是 neutral 版；换表情时只替换提示词末尾 `Expression:` 后面的短语，短语表见第 3.2 节。
- 不要改色板、尺寸、描边、命名。要改，先改风格圣经。
- 先做第 4 节 P0 清单里的图，其余按优先级补。

给程序员：用第 1.2 节写 `speaker → characterId` 映射，用第 5.2 节写滑动时的表情规则，用第 6 节放文件和映射。

字段含义（分布在第 2 节的表格和代码块里）：

| 字段 | 所在 | 含义 |
|---|---|---|
| id | 2.1 | 原型的英文 id，也是代码里的 `characterId`，文件名的前半段（已含 `npc-` 前缀） |
| 中文名 | 2.1 | 给人看的名字；卡面上仍显示原始 speaker 文字，不显示这个名字 |
| 所属 | 2.1 | shared 通用；fund / crypto / stock 角色专属（造型按该角色气质） |
| 出现角色 | 2.1 | 实际会出现在哪些角色的牌局里（奇遇卡让部分专属原型跨角色出现） |
| 外观 | 2.1 | 年龄、性别、发型、服装；刻意多元，性别参考文案里的“他” |
| 标志性道具 | 2.1 | 一个；靠它加主色认出身份，不靠文字 |
| 主色 | 2.1 | 取自 32 色色板，给 hex；用在最显眼的服装或配饰上。不同原型的主色可以重复，同一张卡只会出现一个人物 |
| 性格 | 2.1 | 一句话，决定表情和反应风格 |
| 典型卡牌 | 2.1 | 最多 3 个卡牌 id |
| 表情 / 优先级 | 2.2 | 每个原型要画的表情，以及各自属于 P0 / P1 / P2 |
| 反应类型 | 2.2 | pusher 推动者 / guardian 劝阻者 / mirror 镜像型，规则见第 5.2 节 |
| 提示词 | 2.3 | 可直接复制到 AI 生图工具的英文提示词，已写入风格约束 |
| 负面提示词 | 2.3 | 配套的英文负面提示词 |

## 1. 人物归并方案

### 1.1 结果概览

- 56 种 speaker 归并成 **24 个 NPC 原型**，外加“自己”的 **3 个角色版本**，共 **27 个人物**。
- 24 个 NPC 里：三个角色通用 13 个，基金经理专属 4 个，Web3 专属 4 个，炒股专属 3 个。
- 归并依据：身份相近（同事、老同事、亏钱的同事）、功能相近（三种客服）、同属非人信息源（券商 App、协议文档）。
- 非人信息源不画真人，画两个像素小吉祥物：行情小助手（`npc-market-ticker`，基金和炒股用）和链上公告板（`npc-crypto-chain-feed`，Web3 用）。
- 通用原型三个角色共用同一套立绘，不做三套服装（服装变体见第 7 节待确认）。
- 奇遇卡由炒股和基金共享，所以“炒股专属”的营业部大妈、盯盘老哥、老股民也会出现在基金经理的牌局里。这由现有卡牌决定，本文不改。

<!--CONT-->

### 1.2 speaker → 人物原型对照表

给程序员：代码需提供映射函数 `function getSpeakerCharacter(speaker: string, role: RoleId): CharacterId`，下表即映射内容。"自己"看当前角色，返回 `self-fund` / `self-crypto` / `self-stock`。

| 人物原型 id | 归并的 speaker（原始文本） |
|---|---|
| `self-fund` / `self-crypto` / `self-stock` | 自己 |
| `npc-friend` | 朋友、老同学、恐慌的室友、短线朋友 |
| `npc-colleague` | 同事、老同事、亏钱的同事、同行 |
| `npc-chatmate` | 群友、股友群、社群、群里的大V |
| `npc-family` | 家人、亲友 |
| `npc-support` | 客服、平台客服、交易所客服 |
| `npc-media` | 财经记者、节目编导、网课讲师 |
| `npc-host` | 论坛版主、社区管理员、主办方 |
| `npc-newbie` | 新人、助理 |
| `npc-researcher` | 研究员 |
| `npc-mentor` | 导师、前辈 |
| `npc-stranger` | 神秘人、陌生私信 |
| `npc-market-ticker` | 券商 App、财经 App、匿名行情 |
| `npc-client-manager` | 渠道经理、券商客户经理 |
| `npc-fund-cio` | 投资总监、投委会、基金经理 |
| `npc-fund-sales-director` | 销售总监、销售 |
| `npc-fund-boss` | 老板 |
| `npc-fund-compliance` | 合规专员、风控专员 |
| `npc-crypto-anon-dev` | 匿名开发者 |
| `npc-crypto-kol` | 推特大 V |
| `npc-crypto-onchain-analyst` | 链上分析员、安全研究员 |
| `npc-crypto-chain-feed` | 协议文档、社区提案、推特热搜 |
| `npc-stock-auntie` | 营业部大妈 |
| `npc-stock-screen-watcher` | 盯盘老哥、盯盘群老哥 |
| `npc-stock-veteran` | 老股民、期货老手 |

## 2. 人物原型清单（含提示词）

### 2.1 基本信息表（所有原型，按类别）

#### A. "自己"（玩家内心独白）：3 个角色版本

不是真正的 NPC，是玩家的自我对话，共 15 张卡（`stop-loss`、`daily-review`、`losing-streak`、`big-win` 等），占卡池很大比重。

**做法**：**思考气泡风格**。画一个不透明像素思考气泡（硬边阶梯轮廓、淡色像素描边，不用模糊或半透明）里的玩家半身剪影或背影，三个角色各一个。穿各自典型服装但淡化细节，突出"自我反思"意味。色板用相应角色主题色加墨蓝底。

**理由**：

1. 这些卡都是"自己"说话，内心独白而不是外来刺激，需和其他 NPC 视觉上明显区分。
2. 剪影而不是完整立绘，让玩家容易投射自己，也避免三个角色共用同一张脸。
3. 气泡风格让卡面更轻盈，符合"自言自语"的场景感。

**服装与背景参考**：

- **self-fund**（基金经理）：西装、领带、工牌剪影（蓝紫色主题），背景冷色（会议室窗外的夜景剪影或 K 线图）。
- **self-crypto**（Web3 玩家）：连帽衫、耳机剪影（青色发光），背景暗紫夜晚（屏幕光或链上符号）。
- **self-stock**（炒股达人）：马甲、保温杯剪影（琥珀金色主题），背景暖色（盯盘屋窗帘缝透进日光或 K 线图）。

#### B. 通用 NPC（13 个）

| id | 中文名 | 所属 | 出现角色 | 外观 | 标志道具 | 主色（hex） | 性格 | 典型卡牌（至多 3 个）|
|---|---|---|---|---|---|---|---|---|
| npc-friend | 朋友 | shared | 全部 | 20–35 岁，中性穿搭，休闲夹克，短发或马尾 | 手机（屏幕有消息提示光） | #8fa0ff 蓝紫 | 热心但有时冲动 | inside-tip, lend-money, buy-the-dip |
| npc-colleague | 同事 | shared | 全部 | 25–40 岁，职场打扮，衬衫，黑框眼镜 | 笔记本电脑 | #b9b8b1 中性灰 | 谨慎现实 | chase-rally, auto-trading, peer-screenshot |
| npc-chatmate | 群友 | shared | 全部 | 20–40 岁，连帽衫或 T 恤，虚拟头像框 | 表情包气泡（像素装饰） | #7ee7f2 青色 | 爱喊单，从众 | group-call, crypto-dog-coin, stock-friends-pick |
| npc-family | 家人 | shared | 全部 | 45–60 岁，温暖装束，围巾或毛衣 | 保温杯（家的象征） | #eab98f 暖肤色 | 关心但不懂投资 | weekend-rest, family-fund, client-guarantee |
| npc-support | 客服 | shared | 全部 | 20–30 岁，职业装，简洁发型 | 耳麦（带小工号牌装饰） | #3fcf9f 绿色 | 礼貌中性 | add-leverage, fund-quarter-report, crypto-contract-leverage |
| npc-media | 媒体人 | shared | 全部 | 30–45 岁，西装或干练衬衫 | 话筒或录音笔 | #f2c261 琥珀金 | 自信，追热点 | tv-show, strategy-course, fund-star-manager |
| npc-host | 版主 / 主办方 | shared | 全部 | 25–35 岁，卫衣或创意 T 恤 | 活动胸牌（虚拟徽章） | #5b6bd0 深蓝 | 中立组织者 | post-review, mock-contest, crypto-airdrop |
| npc-newbie | 新人 / 助理 | shared | 全部 | 20–25 岁，青涩，背包或文件袋 | 实习工牌 | #f7d9b8 象牙浅色 | 紧张，求助 | mentor-newbie, bad-news |
| npc-researcher | 研究员 | shared | 全部 | 28–40 岁，宽松衬衫，稍乱的头发，眼镜 | 厚笔记本（手绘图表） | #36408a 深蓝紫 | 认真，钻研 | heavy-position, fund-research-trip |
| npc-mentor | 导师 / 前辈 | shared | 全部 | 40–55 岁，沉稳西装或马甲，花白短发 | 茶杯 | #272d42 墨蓝深色 | 老成持重 | manager-advice, senior-warning |
| npc-stranger | 可疑人物 | shared | 基金、Web3 | 30–45 岁，模糊脸部，戴帽或口罩，暗色风衣 | 信封（暗示利益输送） | #7d2f2f 暗红 | 诡秘，危险 | fund-rat-trading, crypto-wallet-phishing |
| npc-market-ticker | 行情小助手 | shared | 基金、炒股 | **像素吉祥物**：金色小方块机器人，屏幕显示简化 K 线，无五官 | 屏幕 | #f2c261 琥珀金 | 机械中性 | adv-L04-a, adv-L08-a, stock-ipo |
| npc-client-manager | 客户经理 | shared | 基金、炒股 | 30–40 岁，职业套装，略夸张的笑容 | 名片夹 | #c99a3d 深金色 | 热情推销 | fund-ranking, fund-hot-inflow, stock-margin |

#### C. 基金经理专属（4 个）

| id | 中文名 | 所属 | 出现角色 | 外观 | 标志道具 | 主色（hex） | 性格 | 典型卡牌 |
|---|---|---|---|---|---|---|---|---|
| npc-fund-cio | 投资总监 | fund | 基金、炒股 | 45–55 岁，深色西装，严肃表情，秃顶或短发 | 金属边眼镜 | #1d2336 墨蓝 | 威严，要业绩 | adv-L03-a, fund-style-drift, fund-ic-debate |
| npc-fund-sales-director | 销售总监 | fund | 基金 | 35–45 岁，亮色西装，红领带 | 平板电脑（销售数据） | #c24d45 红色 | 业绩驱动，催促 | fund-big-redeem, fund-roadshow |
| npc-fund-boss | 老板 | fund | 基金 | 50–60 岁，稳重西装，微驼背 | 公文包 | #10141f 极深墨蓝 | 施压但克制 | boss-pressure, fund-quarter-end |
| npc-fund-compliance | 合规专员 | fund | 基金 | 30–45 岁，黑框眼镜，抱文件夹 | 合规手册（小册子） | #8e8f9a 灰色 | 死板，坚持规则 | fund-manager-rumor, fund-benchmark |

#### D. Web3 玩家专属（4 个）

| id | 中文名 | 所属 | 出现角色 | 外观 | 标志道具 | 主色（hex） | 性格 | 典型卡牌 |
|---|---|---|---|---|---|---|---|---|
| npc-crypto-anon-dev | 匿名开发者 | crypto | Web3 | 25–35 岁，连帽衫把大半张脸遮住，只露下巴 | 笔记本电脑（贴满贴纸） | #3a4260 暗蓝灰 | 神秘，不可信 | crypto-rug-pull |
| npc-crypto-kol | 推特大 V | crypto | Web3 | 30–40 岁，夸张发型（染色），墨镜 | 手机（屏幕显示抽象社交信息流，无品牌标识） | #7a5a1f 深金棕色 | 自信张扬 | crypto-kol-call |
| npc-crypto-onchain-analyst | 链上分析员 | crypto | Web3 | 25–35 岁，休闲衬衫，眼镜，屏幕反光打脸 | 双屏显示器（虚拟） | #2a9a77 深绿 | 冷静专业 | crypto-smart-money, crypto-bridge-hack |
| npc-crypto-chain-feed | 链上公告板 | crypto | Web3 | **像素吉祥物**：青色立方体，表面浮动区块纹理，无五官 | 区块浮动特效 | #7ee7f2 青色 | 机械中性 | crypto-dex-liquidity, crypto-governance, crypto-narrative |

#### E. 炒股达人专属（3 个）

| id | 中文名 | 所属 | 出现角色 | 外观 | 标志道具 | 主色（hex） | 性格 | 典型卡牌 |
|---|---|---|---|---|---|---|---|---|
| npc-stock-auntie | 营业部大妈 | stock | 基金、炒股 | 50–60 岁，花围巾，保暖外套 | 老花镜 | #c98f65 暖橙肤色 | 热心八卦 | adv-L06-a |
| npc-stock-screen-watcher | 盯盘老哥 | stock | 基金、炒股 | 35–50 岁，背心或格子衬衫 | 保温杯（冒热气） | #7a5a1f 棕金色 | 盯盘狂，紧张 | adv-L01-a, stock-dragon-tiger |
| npc-stock-veteran | 老股民 | stock | 基金、炒股 | 55–70 岁，朴素衬衫，半秃或全白发 | 折叠老花镜 | #5b3a2a 深棕色 | 经验主义，固执 | adv-L02-a, adv-L07-a |

### 2.2 表情、反应类型与优先级

| id | 表情列表 | 反应类型 | P0（必须） | P1（重要） | P2（加分） |
|---|---|---|---|---|---|
| self-fund / self-crypto / self-stock | neutral, worried, happy | mirror | neutral, worried | happy | — |
| npc-friend | neutral, happy, worried | pusher | neutral, happy | worried | — |
| npc-colleague | neutral, worried, sly | guardian | neutral | worried, sly | — |
| npc-chatmate | neutral, happy, worried | pusher | neutral, happy | worried | — |
| npc-family | neutral, worried, happy | guardian | neutral, worried | happy | — |
| npc-support | neutral, happy | neutral | neutral | happy | — |
| npc-media | neutral, happy | pusher | neutral | happy | — |
| npc-host | neutral, happy | neutral | neutral | happy | — |
| npc-newbie | neutral, worried | neutral | neutral | worried | — |
| npc-researcher | neutral, worried | guardian | neutral, worried | — | — |
| npc-mentor | neutral, worried | guardian | neutral | worried | — |
| npc-stranger | neutral, sly | pusher | neutral, sly | — | — |
| npc-market-ticker | neutral | neutral | neutral | — | — |
| npc-client-manager | neutral, happy, sly | pusher | neutral, happy | sly | — |
| npc-fund-cio | neutral, angry | guardian | neutral, angry | — | — |
| npc-fund-sales-director | neutral, happy, angry | pusher | neutral, happy | angry | — |
| npc-fund-boss | neutral, angry | guardian | neutral | — | angry |
| npc-fund-compliance | neutral, angry | guardian | neutral | — | angry |
| npc-crypto-anon-dev | neutral, sly | pusher | neutral, sly | — | — |
| npc-crypto-kol | neutral, happy, sly | pusher | neutral | sly | happy |
| npc-crypto-onchain-analyst | neutral, worried | guardian | neutral | worried | — |
| npc-crypto-chain-feed | neutral | neutral | neutral | — | — |
| npc-stock-auntie | neutral, happy, worried | pusher | neutral, worried | happy | — |
| npc-stock-screen-watcher | neutral, worried | guardian | neutral, worried | — | — |
| npc-stock-veteran | neutral, happy | guardian | neutral, happy | — | — |

说明：

- **反应类型**决定滑动时表情切换（规则见第 5.2 节）：pusher（推你冒险）、guardian（劝你小心）、mirror（镜像玩家情绪）、neutral（无明显倾向）。
- **P0**（60 张以内）是游戏能完整玩的最小集，至少让每个原型有一张 neutral 可用。关键人物两个表情都放 P0（如可疑人物的 neutral + sly）。
- **P1** 补充核心人物情绪丰富度（出现次数多或对叙事重要的角色）。
- **P2** 锦上添花（angry 和 sly 这种只在某些特定卡牌里用，且不是角色核心特征时，放 P2）。

<!--CONT2-->

### 2.3 提示词（可直接复制）

**公共模板**（已写入所有提示词，不必手工拼接）：

```
Pixel art chibi bust portrait, trading card game character, [CHARACTER_DESCRIPTION], limited color palette (16 colors max), 1px dark outline (#0a0d15), crisp square pixels, no anti-aliasing, single flat background color, top-left lighting, no gradients, no transparency effects, no text, no logos, no watermarks, clean pixel art style. Expression: [EXPRESSION_PHRASE].
```

#### 2.3.1 "自己"三个版本

**self-fund（基金经理）**

```
Pixel art chibi bust portrait, silhouette of a fund manager inside an opaque pixel-art thought bubble with a crisp stepped pale outline, wearing dark suit with tie and ID badge (blue-purple theme), one simple office-window silhouette, limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background color (#1d2336), top-left lighting, no gradients, no transparency effects, no text, no logos, no watermarks. Expression: neutral reflection.
```

负面提示词：
```
realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text overlays, logos, watermarks, visible face details, multiple characters, complex background
```

**self-crypto（Web3 玩家）**

```
Pixel art chibi bust portrait, silhouette of a crypto trader inside an opaque pixel-art thought bubble with a crisp stepped pale outline, wearing hoodie and headphones (cyan theme), one simple screen silhouette, limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background color (#36408a), top-left lighting, no gradients, no transparency effects, no text, no logos, no watermarks. Expression: neutral reflection.
```

负面提示词：
```
realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text overlays, logos, watermarks, visible face details, multiple characters, complex background
```

**self-stock（炒股达人）**

```
Pixel art chibi bust portrait, silhouette of a stock trader inside an opaque pixel-art thought bubble with a crisp stepped pale outline, wearing vest and holding thermos (amber-gold theme), one simple curtain silhouette, limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background color (#c99a3d), top-left lighting, no gradients, no transparency effects, no text, no logos, no watermarks. Expression: neutral reflection.
```

负面提示词：
```
realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text overlays, logos, watermarks, visible face details, multiple characters, complex background
```

#### 2.3.2 通用 NPC（13 个）

**npc-friend**

```
Pixel art chibi bust portrait, young adult 20-35yo, casual jacket, short hair or ponytail, holding smartphone with notification light, blue-purple color (#8fa0ff), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-colleague**

```
Pixel art chibi bust portrait, office worker 25-40yo, business shirt, black-framed glasses, holding laptop, neutral gray color (#b9b8b1), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-chatmate**

```
Pixel art chibi bust portrait, young person 20-40yo, hoodie or t-shirt, virtual avatar frame, emoji speech bubble decoration, cyan color (#7ee7f2), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-family**

```
Pixel art chibi bust portrait, middle-aged or older 45-60yo, warm clothing with scarf or sweater, holding thermos, warm skin color (#eab98f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-support**

```
Pixel art chibi bust portrait, customer service agent 20-30yo, professional attire, wearing headset with ID badge decoration, green color (#3fcf9f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-media**

```
Pixel art chibi bust portrait, media professional 30-45yo, suit or sharp business shirt, holding microphone or voice recorder, amber-gold color (#f2c261), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-host**

```
Pixel art chibi bust portrait, event organizer 25-35yo, hoodie or creative t-shirt, event badge accessory, deep blue color (#5b6bd0), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-newbie**

```
Pixel art chibi bust portrait, young intern 20-25yo, nervous look, backpack or document folder, intern badge, ivory light color (#f7d9b8), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-researcher**

```
Pixel art chibi bust portrait, analyst 28-40yo, loose shirt, messy hair, glasses, holding thick notebook with hand-drawn charts, deep blue-purple color (#36408a), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-mentor**

```
Pixel art chibi bust portrait, senior advisor 40-55yo, calm suit or vest, graying short hair, holding teacup, dark blue-black color (#272d42), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-stranger**

```
Pixel art chibi bust portrait, suspicious figure 30-45yo, obscured face with hat or mask, dark trench coat, holding envelope (implying bribe), dark red color (#7d2f2f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-market-ticker**

```
Pixel art mascot, cute golden cube robot with screen displaying simplified candlestick chart, no facial features, amber-gold color (#f2c261), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks, humanoid face`

**npc-client-manager**

```
Pixel art chibi bust portrait, account manager 30-40yo, professional suit, exaggerated smile, holding business card folder, deep gold color (#c99a3d), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

#### 2.3.3 基金经理专属（4 个）

**npc-fund-cio**

```
Pixel art chibi bust portrait, chief investment officer 45-55yo, dark suit, stern expression, balding or short hair, metal-framed glasses, dark blue color (#1d2336), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-fund-sales-director**

```
Pixel art chibi bust portrait, sales director 35-45yo, bright suit with red tie, holding tablet showing sales data, red color (#c24d45), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-fund-boss**

```
Pixel art chibi bust portrait, senior manager 50-60yo, conservative suit, slightly hunched shoulders, holding briefcase, very dark blue-black color (#10141f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-fund-compliance**

```
Pixel art chibi bust portrait, compliance officer 30-45yo, black-framed glasses, holding folder, holding small compliance handbook, gray color (#8e8f9a), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

#### 2.3.4 Web3 专属（4 个）

**npc-crypto-anon-dev**

```
Pixel art chibi bust portrait, anonymous developer 25-35yo, hoodie covering most of face showing only chin, holding laptop covered with stickers, dark blue-gray color (#3a4260), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-crypto-kol**

```
Pixel art chibi bust portrait, crypto influencer 30-40yo, exaggerated dyed hairstyle, sunglasses, holding phone showing an abstract social feed made of simple blocks without brand marks, deep gold-brown color (#7a5a1f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-crypto-onchain-analyst**

```
Pixel art chibi bust portrait, blockchain analyst 25-35yo, casual shirt, glasses, screen glow reflecting on face, virtual dual monitor accessory, deep green color (#2a9a77), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-crypto-chain-feed**

```
Pixel art mascot, cute cyan cube with floating blockchain texture on surface, no facial features, cyan color (#7ee7f2), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks, humanoid face`

#### 2.3.5 炒股专属（3 个）

**npc-stock-auntie**

```
Pixel art chibi bust portrait, middle-aged woman 50-60yo, floral scarf, warm coat, holding reading glasses, warm orange skin color (#c98f65), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-stock-screen-watcher**

```
Pixel art chibi bust portrait, day trader 35-50yo, vest or plaid shirt, holding steaming thermos, brown-gold color (#7a5a1f), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

**npc-stock-veteran**

```
Pixel art chibi bust portrait, elderly trader 55-70yo, simple shirt, balding or white hair, holding folding reading glasses, deep brown color (#5b3a2a), limited color palette (16 colors max), 1px dark outline (#0a0d15), no anti-aliasing, single flat background, top-left lighting, no gradients, no text, no logos, no watermarks. Expression: neutral.
```

负面提示词：`realistic photo, 3D render, smooth gradients, anti-aliasing, more than 16 colors, text, logos, watermarks`

## 3. 生图流程与验收清单

### 3.1 建议的生图流程

1. **API 与密钥**：默认使用 GPT Image API，`model` 设为 `gpt-image-2.5`；密钥只从环境变量或密钥管理工具读取，不写入文档、提示词、代码或提交记录。生成正方形 PNG，保存原始返回图供追溯。
2. **风格定稿**：先用公共模板生成少量代表人物的 neutral 版，人工选定风格、构图和配色参考图；不要依赖随机种子或把 64×64 当作 API 输出尺寸。
3. **基础人物**：用完整提示词和已选参考图生成各人物 neutral 版。提示词写清主体、唯一标志道具、主色、硬边像素和无文字；先生成单色背景版，不直接依赖模型产出透明底或精确像素网格。
4. **表情变体**：以该人物验收通过的 neutral 图为参考进行编辑，只替换提示词末尾的 `Expression:` 部分（短语表见 3.2 节），保持五官、发型、服装、道具和构图不变；参考图不一致时先修基础图，不批量生成变体。
5. **批量顺序**：按第 4 节先做 P0（27 个 neutral + 15 个关键表情），再做 P1、P2；每张保留提示词、参考图、模型和生成日期记录。
6. **像素后处理**：逐张筛选后，再量化到全局色板且单张不超过 16 色，规范为 64×64 原图，并用邻近采样放大 5 倍至 320×320；不得用缩放或调色掩盖主体、表情和道具错误。
7. **验收与导出**：按 3.3 节验收，不合格则重生成或局部重绘。通过后分别导出透明背景 PNG（界面叠加）和单色背景 PNG（测试预览）；透明版本只处理背景，不引入半透明人物或气泡。
8. **命名与交付**：按第 6 节命名并分批交付，PR 披露实际使用的 AI 工具与模型。

### 3.2 表情短语对照表

提示词末尾 `Expression:` 后面只替换这一段：

| 表情名 | 英文短语（替换 `Expression:` 后的整段内容） |
|---|---|
| neutral | neutral |
| happy | cheerful smile, upbeat |
| worried | anxious frown, concerned look |
| angry | stern glare, furrowed brow |
| sly | sly smirk, cunning grin |

示例：`npc-friend` 的 happy 版提示词 = 把 neutral 版末尾的 `Expression: neutral.` 改成 `Expression: cheerful smile, upbeat.`

### 3.3 验收清单（每张图必须通过）

- [ ] 尺寸：原图 64×64 像素，导出放大 5 倍为 320×320（邻近采样，无抗锯齿）
- [ ] 色数：单张图最多 16 色，全局色板 32 色以内（风格圣经第 3 节）
- [ ] 描边：1 像素深色描边 `#0a0d15`，内部不加描边
- [ ] 光源：左上方向，阴影用同色系暗一级，不做渐变
- [ ] 背景：单色色块 + 最多 2 个简单装饰色块；透明背景版另存
- [ ] 格式：PNG 无损，最终转 WebP 后单张不超过 30KB
- [ ] 命名：小写英文 + 连字符，如 `npc-friend-happy.png`，见第 6 节
- [ ] 内容：无文字、无水印、无品牌 logo、无真人肖像
- [ ] 风格：像素画风（非平滑渲染），chibi 大头比例（头占画面约 70%）

## 4. 工作量统计与优先级清单

### 4.1 总量

按第 2.2 节的表情列表统计，共 **64 张图**（P0 / P1 / P2 互斥）。

分档：
- **P0（必须有，游戏能完整玩）**：**40 张**
- **P1（重要，核心人物情绪丰富度）**：**20 张**
- **P2（加分，锦上添花）**：**4 张候选（当前均归 P1，无独立占位）**

### 4.2 P0 清单（40 张，验收通过后游戏可完整运行）

| id | neutral | happy | worried | angry | sly | 小计 |
|---|---|---|---|---|---|---|
| self-fund | ✓ | | ✓ | | | 2 |
| self-crypto | ✓ | | ✓ | | | 2 |
| self-stock | ✓ | | ✓ | | | 2 |
| npc-friend | ✓ | ✓ | | | | 2 |
| npc-colleague | ✓ | | | | | 1 |
| npc-chatmate | ✓ | ✓ | | | | 2 |
| npc-family | ✓ | | ✓ | | | 2 |
| npc-support | ✓ | | | | | 1 |
| npc-media | ✓ | ✓ | | | | 2 |
| npc-host | ✓ | | | | | 1 |
| npc-newbie | ✓ | | | | | 1 |
| npc-researcher | ✓ | | ✓ | | | 2 |
| npc-mentor | ✓ | | | | | 1 |
| npc-stranger | ✓ | | | | ✓ | 2 |
| npc-market-ticker | ✓ | | | | | 1 |
| npc-client-manager | ✓ | ✓ | | | | 2 |
| npc-fund-cio | ✓ | | | ✓ | | 2 |
| npc-fund-sales-director | ✓ | ✓ | | | | 2 |
| npc-fund-boss | ✓ | | | | | 1 |
| npc-fund-compliance | ✓ | | | | | 1 |
| npc-crypto-anon-dev | ✓ | | | | ✓ | 2 |
| npc-crypto-kol | ✓ | | | | | 1 |
| npc-crypto-onchain-analyst | ✓ | | | | | 1 |
| npc-crypto-chain-feed | ✓ | | | | | 1 |
| npc-stock-auntie | ✓ | | ✓ | | | 2 |
| npc-stock-screen-watcher | ✓ | | ✓ | | | 2 |
| npc-stock-veteran | ✓ | ✓ | | | | 2 |
| **P0 合计** | 27 | 6 | 4 | 1 | 2 | **40 张** |

### 4.3 P1 清单（20 张，核心人物情绪补充）

| id | 表情 | 说明 |
|---|---|---|
| self-fund | happy | 内心独白的得意 |
| self-crypto | happy | 同上 |
| self-stock | happy | 同上 |
| npc-friend | worried | 朋友的担忧面 |
| npc-colleague | sly | 同事的狡黠（office politics） |
| npc-colleague | worried | 同事的谨慎提醒 |
| npc-chatmate | worried | 群友恐慌 |
| npc-family | happy | 家人高兴（不常见，故 P1） |
| npc-support | happy | 客服的职业笑容 |
| npc-host | happy | 主办方热情 |
| npc-newbie | worried | 新人的紧张 |
| npc-researcher | worried | 研究员的忧虑 |
| npc-mentor | worried | 前辈的劝诫 |
| npc-client-manager | sly | 客户经理的套路笑 |
| npc-fund-sales-director | angry | 销售总监发火 |
| npc-fund-boss | angry | 老板的压力面 |
| npc-fund-compliance | angry | 合规的严厉 |
| npc-crypto-kol | sly | KOL 的狡黠 |
| npc-crypto-onchain-analyst | worried | 链上分析员预警 |
| npc-stock-auntie | worried | 营业部大妈的八卦惊讶 |
| **P1 合计** | | **20 张** |

### 4.4 P2 候选（当前无独立占位）

现有 P0 / P1 明细已覆盖第 2.2 节全部 64 个表情组合，无独立 P2 项。原定的四个候选为 `npc-colleague` sly、`npc-client-manager` sly、`npc-fund-sales-director` angry、`npc-crypto-kol` sly，当前均归 P1；后续若降级须同步修改 2.2、4.3 和本节。两个吉祥物只画 neutral，不额外扩展无五官的复杂表情。

## 5. 事件卡版式与滑动反应

### 5.1 事件卡版式（ASCII 示意）

基于现有 340px 宽卡面（`min-height: 280px`），卡牌 `padding: 22px 20px`，内容区约 300px 宽：

```
┌─────────────────────────────────────────┐  ← 卡片边界 340px 宽
│  [左选项提示]           [右选项提示]    │  ← 顶部 14px 处，拖动时渐显（opacity 0→1）
│                                         │
│   ┌───────────────────────────────┐    │
│   │                               │    │  ← 人物区：320×320 或 240×240，居中
│   │        [人物立绘]             │    │     （若卡面高度不够，缩到 240，风格圣经第 6 节）
│   │                               │    │     背景已集成在立绘里（单色或简单装饰）
│   └───────────────────────────────┘    │
│                                         │
│   [speaker 名字]   ← 14px 金色文字     │  ← speaker 区：约 12px 下边距
│   [事件正文，18px，1–2 句话]           │  ← 正文区：line-height 1.6，最多约 4 行
│                                         │
│  （底部留白，或"后来……"提示）          │
└─────────────────────────────────────────┘
```

人物立绘占卡面上半部，speaker 和正文叠加在下方（或立绘下方留白区），左右选项提示（`reigns-hint`）浮动在卡片顶部两侧，拖动时根据方向渐显（`opacity: progress`）。

现有代码已实现滑动交互（`ReignsGame.tsx`），人物立绘作为背景或独立元素插入 `.reigns-card-body` 之前（或用CSS `::before` 伪元素）。

### 5.2 滑动时人物的反应规则

拖动卡牌时（`dx > HINT_MIN_PX`，即拖动超过 8px），人物表情切换逻辑：

**基本规则**：

- **neutral 反应类型的人物**（客服、版主、吉祥物）：始终显示 neutral，不切换。
- **pusher 反应类型**（推动者，鼓励冒险）：
  - 拖向左（通常是保守选项）→ worried（担心你太怂）
  - 拖向右（通常是激进选项）→ happy（高兴你敢做）
- **guardian 反应类型**（劝阻者，提醒风险）：
  - 拖向左（保守）→ happy（赞同你谨慎）
  - 拖向右（激进）→ worried（担心你冒险）
- **mirror 反应类型**（"自己"内心独白，镜像玩家情绪）：
  - 拖向左或右，看该选项是积极还是消极：
    - 若该侧选项的 `effects` 净影响偏正（如 capital +8）→ happy
    - 若偏负（如 capital -10, risk -8）→ worried
    - 中性或不确定 → 保持 neutral

**简化实现建议**（代码映射示例，不在本文实现）：

```typescript
function getSwipeExpression(
  character: CharacterId,
  side: 'left' | 'right',
  choice: Choice
): ExpressionId {
  const reactionType = CHARACTERS[character].reactionType;
  if (reactionType === 'neutral') return 'neutral';
  
  const netEffect = Object.values(choice.effects).reduce((a, b) => a + b, 0);
  
  if (reactionType === 'mirror') {
    return netEffect > 0 ? 'happy' : netEffect < 0 ? 'worried' : 'neutral';
  }
  
  // pusher: 鼓励激进（右）
  if (reactionType === 'pusher') {
    return side === 'right' ? 'happy' : 'worried';
  }
  
  // guardian: 鼓励保守（左）
  if (reactionType === 'guardian') {
    return side === 'left' ? 'happy' : 'worried';
  }
  
  return 'neutral';
}
```

**注意**：实际卡牌的"左 = 保守，右 = 激进"不是严格规律，部分卡牌反着来（如 `adv-L05-a`：左割肉、右逆势加仓），所以更精确的实现需要看 `choice.tags` 或 `effects` 净和。上述规则给出游戏性方向，具体逻辑交程序员决定。

如果某个人物缺少某个表情的图（如 P0 阶段只有 neutral + 一个表情），缺失的表情回退到 neutral（代码用 `?? 'neutral'`）。

## 6. 文件命名与目录结构

### 6.1 目录建议

```
frontend/src/reigns/assets/characters/
├── npc-friend-neutral.png
├── npc-friend-happy.png
├── npc-friend-worried.png
├── npc-colleague-neutral.png
├── npc-colleague-worried.png
├── npc-colleague-sly.png
├── self-fund-neutral.png
├── self-fund-worried.png
├── self-fund-happy.png
├── self-crypto-neutral.png
├── ...
└── (共 64 张 PNG，按 P0 / P1 / P2 分批放入)
```

### 6.2 命名规则

`<character-id>-<expression>.png`，全小写，连字符分隔。

- `<character-id>`：见第 2.1 节 id 列，如 `npc-friend`、`self-fund`。
- `<expression>`：neutral / happy / worried / angry / sly。

### 6.3 代码映射文件建议结构（不实现，只写说明）

程序员需要新增：

1. **类型定义**（`types.ts` 或新文件 `characters.ts`）：
   ```typescript
   export type CharacterId = 'self-fund' | 'self-crypto' | 'self-stock' | 'npc-friend' | ...;
   export type ExpressionId = 'neutral' | 'happy' | 'worried' | 'angry' | 'sly';
   export type ReactionType = 'neutral' | 'pusher' | 'guardian' | 'mirror';
   
   export interface CharacterDef {
     id: CharacterId;
     name: string;
     reactionType: ReactionType;
     expressions: readonly ExpressionId[];
   }
   ```

2. **speaker → characterId 映射**（见第 1.2 节表格）：
   ```typescript
   export function getSpeakerCharacter(speaker: string, role: RoleId): CharacterId {
     if (speaker === '自己') return `self-${role}` as CharacterId;
     // ... 其余映射见 1.2 节
   }
   ```

3. **图片路径生成**：
   ```typescript
   export function getCharacterImagePath(character: CharacterId, expression: ExpressionId): string {
     return `/src/reigns/assets/characters/${character}-${expression}.png`;
   }
   ```

4. **滑动表情逻辑**（见第 5.2 节规则）。

## 7. 待确认

给人工决定：

1. **生图工具**：默认使用 GPT Image API 的 `gpt-image-2.5`，实际替换工具或模型时须保留原有风格约束并更新生成记录。
2. **版权与披露**：人物设计、提示词和实际生成的图片按 AI 辅助创作处理；PR 按 AGENTS.md 第 5 节披露实际使用的工具与模型，不预先固定图片尚未使用的模型。
3. **服装变体**（P2 之后）：通用 NPC 是否要给三个角色各做一套服装变体（如 `npc-friend-fund-neutral.png`），还是三个角色共用同一套立绘？当前设计是共用（节约成本），若要做变体，工作量×3。
4. **表情动画**：卡牌滑动时表情切换，是否要做 CSS transition 或逐帧动画（如 neutral → happy 的中间帧），还是直接切图？当前设计是直接切图（简单实现）。
5. **回退图**：若某个人物某个表情的图还没做好，代码回退到 neutral；若 neutral 也没有（不应该发生），回退到 emoji（风格圣经第 6 节提到的 🏦🪙📈）还是占位图？
6. **批次交付**：P0 / P1 / P2 是否分三次 PR 提交，还是一次性全部交付？建议分批（P0 先合并，游戏可玩，P1 / P2 后续补）。

---

**文档完成**。人物原型总数 27 个（24 个 NPC + 3 个"自己"版本），共 64 张表情图，其中 P0 40 张、P1 20 张；四个 P2 候选当前归 P1，无独立 P2 占位。两个吉祥物只画 neutral。


