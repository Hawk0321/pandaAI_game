# 滑牌游戏美化 05：结局插图与存活段位徽标交付清单

> 给负责美工的同事：不用看代码，照本文逐张出图、命名、放进目录即可。
> 风格以 [00-style-bible.md](00-style-bible.md) 为准；每张结局图的详细场景和英文提示词在 [02-icons-and-endings.md](02-icons-and-endings.md) 第 4 节；AI 生图和像素化流程见 [04-generation-workflow.md](04-generation-workflow.md)。
> 本文与 02 文档不一致的地方（交付格式、进仓库的尺寸、存放位置），以本文为准。
> 所有素材是原创虚构的示例素材，不构成投资建议，不画真人、真实品牌、可读文字。

## 1. 这些图用在哪

玩家一局结束后进入结局页，**结局标题上方显示一张结局插图**；标题旁的“存活关数”会配一枚**段位徽标**，活得越久，徽标越华丽。
代码已做好自动接入：按本文的文件名把图放进对应目录就会显示，不需要改代码。缺哪张图，那个位置就不显示图片，页面退回纯文字，不影响游戏。所以可以分批交付，画好一批就放一批。

## 2. 规格

### 2.1 结局插图（38 张）

| 项 | 规定 |
|---|---|
| 像素稿（画的尺寸） | 128×96，满铺场景，不透明 |
| 交付进仓库的尺寸 | 384×288（像素稿用邻近采样整数放大 3 倍，不要抗锯齿） |
| 色数 | 单张最多 16 色，取自风格圣经第 3 节的 32 色色板 |
| 描边 / 光源 | 1px 墨蓝 `#0a0d15` 描边（不用纯黑），光从左上，阴影用同色系暗一级，无渐变、无半透明 |
| 构图 | 一个鲜明场景，主体居中偏下，上方约 1/4 留墙面或天空 |
| 文字 | 画面里不出现任何文字、数字、logo；公告、短信、弹窗用色块、感叹号形、波浪线代替 |
| 涨跌色 | 涨用红、跌用绿（全游戏统一）；“满屏绿色”表示大跌 |
| 格式 / 体积 | PNG，单张不超过 30KB（16 色图通常只有几 KB，超了多半是混进了抗锯齿或渐变） |
| 目录 | `frontend/src/reigns/assets/endings/`（目录还不存在，第一次交付时新建） |
| 文件名 | `ending-<id>.png`，`<id>` 见第 3 节清单，全小写，不加 `@3x` 之类后缀 |

5 个通用特殊结局（P2，`sp-inertia` 等）三个角色共用一张图，图里的小人穿白 T 恤、不带角色道具、底色中性墨蓝。可选再做角色换色版（只做色板置换，不重画）：`ending-<id>-<role>.png`，`<role>` 为 `fund`（基金经理，蓝紫）、`crypto`（Web3 玩家，青色）、`stock`（炒股达人，琥珀金）。例：`ending-sp-balanced-stock.png`。有换色版就用换色版，没有就用基础图。

### 2.2 不要放进仓库的东西

- AI 出的高清构图母版、128×96 像素稿、Aseprite 等工程文件**都不要放进 `assets/` 目录**。仓库里 `assets/_source/` 已经有 27MB 母版，再加会让仓库越来越大。
- 这些文件统一放网盘，链接填在这里：`网盘链接：（待填写）`。
- 仓库里只放第 3、4 节列出的成品 PNG。

## 3. 结局插图清单（38 张）

标题与代码 `frontend/src/reigns/endings.ts` 逐字一致（注意“KOL 的枷锁”“荐股大 V”里有空格）。“02 小节”一列是该图完整画面描述和英文提示词所在位置，提示词和负面提示词直接从 02 文档复制。

### 3.1 P0：普通结局 24 张（每个角色 8 张，数值触底或爆满时出现）

| 优先级 | 文件名 | 角色 | 标题 | 画面要点 | 02 小节 |
|---|---|---|---|---|---|
| P0 | `ending-fund-low-capital.png` | 基金经理 | 清盘通知 | 公告栏贴着红色大通知（色块 + 感叹号形），小人把工牌放进纸箱 | 4.1 |
| P0 | `ending-fund-high-capital.png` | 基金经理 | 规模失控 | 金币像潮水灌进办公室，小人抱着快撑破的保险箱 | 4.1 |
| P0 | `ending-fund-low-risk.png` | 基金经理 | 回撤红线 | 绿色净值曲线像滑梯滑穿一条红线，背后三部电话同时响 | 4.1 |
| P0 | `ending-fund-high-risk.png` | 基金经理 | 业绩跑输 | 全身裹满护具的小人在跑道起点不动，别人早跑远了 | 4.1 |
| P0 | `ending-fund-low-confidence.png` | 基金经理 | 投研散架 | 白板散成零件，6 个小人举不同颜色的牌子争吵 | 4.1 |
| P0 | `ending-fund-high-confidence.png` | 基金经理 | 固执己见 | 戴金色大耳罩抱胸站在白板前，窗外闪电正劈过来 | 4.1 |
| P0 | `ending-fund-low-reputation.png` | 基金经理 | 大额赎回 | 客户拖着小箱子排队出门，柜台后的罐子只剩一枚币 | 4.1 |
| P0 | `ending-fund-high-reputation.png` | 基金经理 | 期望过载 | 路演聚光灯下扛着比自己还高的奖杯塔，腿在发抖 | 4.1 |
| P0 | `ending-crypto-low-capital.png` | Web3 玩家 | 空钱包 | 夜里抱着冒灰烟的空钱包，屏幕飘出问号形气泡 | 4.2 |
| P0 | `ending-crypto-high-capital.png` | Web3 玩家 | 天选之子 | 站在金币山顶、头顶光环，把一袋生活费推向屏幕 | 4.2 |
| P0 | `ending-crypto-low-risk.png` | Web3 玩家 | 被清算 | 一根绿色插针刺破保证金罐，机械手拿走他的头像框 | 4.2 |
| P0 | `ending-crypto-high-risk.png` | Web3 玩家 | 空仓观众 | 看台上捧着白皮书，身后红色火箭载着别人升空 | 4.2 |
| P0 | `ending-crypto-low-confidence.png` | Web3 玩家 | 纸手 | 纸做的手被一根绿柱吓得发抖，币飞走、拖着红色上升尾迹 | 4.2 |
| P0 | `ending-crypto-high-confidence.png` | Web3 玩家 | 死多头 | 灰色墓地里抱着变成石头的钻石，举着钻石旗 | 4.2 |
| P0 | `ending-crypto-low-reputation.png` | Web3 玩家 | 反向指标 | 聊天窗全被红色禁止圈划掉，他的帖子变成指向反方向的大箭头 | 4.2 |
| P0 | `ending-crypto-high-reputation.png` | Web3 玩家 | KOL 的枷锁 | 聚光灯下的高脚椅，金色麦克风链 + 脚镣连着粉丝头像，嘴前一把小锁 | 4.2 |
| P0 | `ending-stock-low-capital.png` | 炒股达人 | 爆仓离场 | 关掉黑屏电脑，手机里绿色短信气泡堆成山，拧上保温杯 | 4.3 |
| P0 | `ending-stock-high-capital.png` | 炒股达人 | 提款机幻觉 | 电脑像提款机往外喷钞票，眼睛变金币，墙上的房子挂画滑向屏幕 | 4.3 |
| P0 | `ending-stock-low-risk.png` | 炒股达人 | 重仓失守 | 满屏绿色，一块巨大绿色方块砸穿止损虚线，小人呆住 | 4.3 |
| P0 | `ending-stock-high-risk.png` | 炒股达人 | 只看不买 | 十条红色止损线围成笼子，窗外下红包雨，他只能看 | 4.3 |
| P0 | `ending-stock-low-confidence.png` | 炒股达人 | 追涨杀跌 | 一手追红柱、一手扔绿柱，成交纸条缠住双脚 | 4.3 |
| P0 | `ending-stock-high-confidence.png` | 炒股达人 | 盲目自信 | 金墨镜跷着脚，把笔记本和止损旗扔进垃圾桶，身后绿色巨浪 | 4.3 |
| P0 | `ending-stock-low-reputation.png` | 炒股达人 | 口碑扫地 | 昏暗屋里，他的头像被划出群列表，保温杯不再冒热气 | 4.3 |
| P0 | `ending-stock-high-reputation.png` | 炒股达人 | 被捧上神坛 | 站在又窄又晃的金色神坛上，台下粉丝举灯牌，神坛一角在碎 | 4.3 |

同一角色、同一属性的触底 / 爆满两张（如“清盘通知”和“规模失控”）要成对出图、放在一起检查：触底偏灰、绿、暗红，爆满偏金、红、满溢，一眼能分开。

### 3.2 P1：角色专属隐藏结局 9 张

页面会给这些结局加“隐藏结局”金色边框，画面可以更戏剧化，最多 2–3 个主体。

| 优先级 | 文件名 | 角色 | 标题 | 画面要点 | 02 小节 |
|---|---|---|---|---|---|
| P1 | `ending-sp-fund-star.png` | 基金经理 | 明星基金经理的倒计时 | 颁奖台上举奖杯微笑，脚下地面裂开，露出快漏光的红沙沙漏 | 4.4 |
| P1 | `ending-sp-fund-unloved.png` | 基金经理 | 赢了业绩输了人心 | 分屏：左边举第一名奖杯，右边一排空座位和倒下的牌子 | 4.4 |
| P1 | `ending-sp-fund-chaser.png` | 基金经理 | 追热点的明星 | 西装一段段变色，追着彩色热气球跑，脚下没有路 | 4.4 |
| P1 | `ending-sp-crypto-allin.png` | Web3 玩家 | 全仓梭哈的幸存者 | 走钢丝过深渊，两手各抱一袋金币，身边游过一条锦鲤 | 4.4 |
| P1 | `ending-sp-crypto-moon.png` | Web3 玩家 | 登月成功 | 月球上插钻石旗，手机已黑屏，对着一排爱心气泡自拍 | 4.4 |
| P1 | `ending-sp-crypto-paper.png` | Web3 玩家 | 安全的纸手 | 抱着满满的保证金罐，长翅膀的币拖着红色尾迹飞走 | 4.4 |
| P1 | `ending-sp-stock-guru.png` | 炒股达人 | 荐股大 V | 直播座椅被粉丝光点围绕，身后屏幕闪红色警告，伸出一只举白牌的小手 | 4.4 |
| P1 | `ending-sp-stock-bagholder.png` | 炒股达人 | 套牢信徒 | 盘腿坐在绿色 K 线山形的小庙前合十，保温杯当供品 | 4.4 |
| P1 | `ending-sp-stock-hermit.png` | 炒股达人 | 空仓钉子户 | 推土机和围栏中间的一小块地，坐在藤椅上抱着保温杯 | 4.4 |

### 3.3 P2：通用特殊结局 5 张（三个角色共用，可选换色版）

| 优先级 | 文件名 | 角色 | 标题 | 画面要点 | 02 小节 |
|---|---|---|---|---|---|
| P2 | `ending-sp-inertia.png` | 通用 | 惯性思维 | 沿笔直轨道冲向前，轨道在悬崖处拐弯，身后 8 张同方向翻过的卡牌 | 4.5 |
| P2 | `ending-sp-obsessive.png` | 通用 | 偏执专家 | 又窄又深的赛道里握着一把巨大钥匙，四周全是同一款锁 | 4.5 |
| P2 | `ending-sp-adventurer.png` | 通用 | 行情亲历者 | 背着旅行包站在红山、绿谷、虚线桥前，每处都有他的脚印和徽章 | 4.5 |
| P2 | `ending-sp-balanced.png` | 通用 | 稳如磐石 | 静水中央的大石头上钓鱼，四个浮标排成一条水平线 | 4.5 |
| P2 | `ending-sp-survivor.png` | 通用 | 活到收盘 | 黄昏的交易大厅熄了屏，拎着公文包在门口回头挥手 | 4.5 |

合计：P0 24 + P1 9 + P2 5 = **38** 张（可选换色版另计，最多 15 张）。

## 4. 新增：存活关数段位徽标（6 张）

结局页会突出显示“这局活了多少关”，并按关数给一枚段位徽标。段位划分已定，不要改：

| 文件名 | 段位 | 关数 | 视觉（同一母题逐级升级） | 色数上限 |
|---|---|---|---|---|
| `badge-survival-tier-1.png` | 试水 | 1–9 | 一根刚划着的火柴，一小簇火苗，无底座无边框 | 6 |
| `badge-survival-tier-2.png` | 站稳脚跟 | 10–19 | 一支立稳的蜡烛，火苗变大，下面一个小烛台 | 8 |
| `badge-survival-tier-3.png` | 老练 | 20–29 | 一盏提灯，暖光外溢，套上铜色圆形徽章底 | 10 |
| `badge-survival-tier-4.png` | 穿越周期 | 30–39 | 浪头上的小灯塔，光束扫过，银色圆形徽章底 | 10 |
| `badge-survival-tier-5.png` | 加时幸存者 | 40–54 | 风暴里仍亮着的金色灯塔，旁边一道闪电，金色盾形徽章底 | 12 |
| `badge-survival-tier-6.png` | 市场传说 | 55+ | 金色桂冠托着一团永不熄灭的火焰，上方一顶小王冠和 4 个星点，金色盾 + 缎带 | 12 |

母题是“一直亮着的光”：活得越久，光越大、底座越华丽（无边框 → 铜 → 银 → 金 → 金 + 王冠）。不用植物生长当母题，是因为游戏里绿色代表下跌，一棵绿树容易被读成“跌”。

| 项 | 规定 |
|---|---|
| 像素稿 | 32×32，透明底，单个居中物体 |
| 交付进仓库的尺寸 | 96×96（邻近采样整数放大 3 倍） |
| 颜色 | 取自 32 色色板。铜 = `#c98f65 #8e5a3c`，银 = `#b9b8b1 #8e8f9a`，金 = `#f7d98f #f2c261 #c99a3d #7a5a1f`，火光 = `#f0766b #f2c261 #f7d98f` |
| 其他 | 1px `#0a0d15` 描边，光从左上，无文字、无数字（关数由页面文字显示），无半透明、无抗锯齿 |
| 辨识度 | 6 张缩到 32×32 并排看，靠**轮廓**也能分出高低（火柴 → 蜡烛 → 提灯 → 灯塔 → 风暴灯塔 → 王冠火焰），不只靠颜色 |
| 格式 / 目录 | PNG，单张不超过 30KB，放 `frontend/src/reigns/assets/ui/`（目录还不存在，新建） |

统一后缀（已写进每条提示词）：`32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers`

负面提示词（与每条一起粘贴）：

```
anti-aliasing, blur, gradient, soft shadow, semi-transparent, glow haze, 3d render, photo, realistic, text, letters, numbers, watermark, logo, real brand, background scene, multiple objects, pure black outline, more than 12 colors, dithering noise, ultra detailed
```

| 文件名 | 英文提示词 |
|---|---|
| `badge-survival-tier-1.png` | `a single freshly lit matchstick with a tiny warm flame, humble beginner feel, 6 colors max, ivory and amber with a small red flame tip, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |
| `badge-survival-tier-2.png` | `a short sturdy candle standing upright on a small amber holder, steady medium flame, grounded feel, 8 colors max, ivory wax and amber flame, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |
| `badge-survival-tier-3.png` | `a small hand lantern with warm light spilling out, set on a round copper medal base, seasoned veteran feel, 10 colors max, copper brown and amber light, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |
| `badge-survival-tier-4.png` | `a tiny lighthouse on a curling wave sending out a light beam, set on a round silver medal base, weathered many cycles feel, 10 colors max, silver gray with amber beam and blue-violet wave, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |
| `badge-survival-tier-5.png` | `a golden lighthouse still shining inside a small storm with one lightning bolt beside it, set on a golden shield badge, overtime survivor feel, 12 colors max, gold shield, amber beam, dark navy storm cloud, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |
| `badge-survival-tier-6.png` | `an eternal flame held by a golden laurel wreath, a small crown above it and four star sparkles, on a golden shield with a red ribbon at the bottom, legendary prestigious feel, 12 colors max, rich gold, warm red ribbon, ivory highlights, 32x32 pixel art badge icon, single centered object, transparent background, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text, no numbers` |

AI 很难直接出准 32×32，按 04 文档的流程：出大图挑构图 → 缩到 32×32 → 在像素编辑器里手修（量化到色板、补描边、清半透明）。徽标尺寸小，直接手画往往更快。

## 5. 交付顺序

1. **P0 结局 24 张**：按角色分三批，每批 8 张，同属性的触底 / 爆满成对出。每画完一批就交，玩家最常见的结局先有图。
2. **段位徽标 6 张**：结局页“存活关数”的视觉重点，6 张一起交，方便并排检查递进感。
3. **P1 隐藏结局 9 张**。
4. **P2 通用结局 5 张**，有余力再做换色版。

## 6. 验收清单（每张交付前自查）

| 项 | 结局插图 | 段位徽标 |
|---|---|---|
| 实际像素尺寸 | 384×288，且每 3×3 像素块同色（是 128×96 整数放大来的） | 96×96，且每 3×3 像素块同色（是 32×32 整数放大来的） |
| 背景 | 满铺、不透明 | 透明 |
| 色数 | ≤ 16 | 按第 4 节表格，≤ 6 / 8 / 10 / 10 / 12 / 12 |
| 文件名 | `ending-<id>.png`，`<id>` 与第 3 节逐字一致，全小写，无后缀 | `badge-survival-tier-1.png` … `tier-6.png` |
| 目录 | `frontend/src/reigns/assets/endings/` | `frontend/src/reigns/assets/ui/` |
| 无文字 | 无字、无数字、无 logo、无真人 | 同左 |
| 无抗锯齿 | 无渐变、无半透明、无模糊边 | 同左（透明底只允许完全透明或完全不透明） |
| 体积 | ≤ 30KB | ≤ 30KB |
| 并排检查 | 同一角色 8 张色调统一；成对的触底 / 爆满一眼可分 | 6 张放一排，从低到高越来越华丽，缩到 32×32 仍能靠轮廓分清 |
| 不进仓库 | 母版、128×96 像素稿、工程文件放网盘 | 同左 |

## 7. 来源披露

- 用 AI 生图的，提交 PR 时在描述里写明：模型名称、生成日期、用的是 02 文档还是本文的提示词、做了哪些后处理（色板量化、手工修像素）。这是 AGENTS.md 第 5 节的要求。
- 同时在 `frontend/src/reigns/assets/generation-log.md` 末尾追加一节，逐张登记素材名、提示词摘要和状态（参照文件里已有的写法）。
- 纯手绘的也写一句“手绘，工具 xxx”。所有素材都按原创虚构的示例素材标注。
