# 滑牌游戏美化规划 02：属性图标、角色头像与结局插图

> 规划文档，不含代码、不含成图。风格、规格、色板一律以 [00-style-bible.md](00-style-bible.md) 为准，本文只在其上叠加，不改它。
> 属性名、结局标题与 id 全部从 `frontend/src/reigns/roles.ts`、`endings.ts` 读取。代码改名时，以代码为准并回来同步本文。
> 所有素材原创虚构。画面里不出现可读文字、真实品牌、真人。需要“公告”“短信”之类，用色块、符号、涂鸦线条代替文字。

## 0. 怎么用这份文档

| 你是谁 | 先看哪里 |
|---|---|
| 美术 / 画像素的同学 | 第 1 节通用规则，然后按第 2、3、4、6 节清单逐张画，最后对第 8 节验收清单 |
| 用 AI 生图的同学 | 每条英文提示词都能单独复制。每节开头有一条对应的“负面提示词”，两条一起粘贴 |
| 前端同学 | 第 1.1 节（现状）、第 5 节版式、第 8 节命名与映射结构 |
| 项目负责人 | 第 7 节工作量与优先级、第 9 节待确认 |

AI 生图画不出严格的像素网格，尤其是 16×16。推荐流程：

1. 用提示词出大图（512×512 或 768×576），只挑构图和配色。
2. 缩到目标原图尺寸（邻近采样），在像素编辑器（Aseprite、Piskel 等）里手工修：量化到风格圣经色板、补 1px 描边 #0a0d15、清掉半透明与抗锯齿。
3. 16×16 图标建议直接手画，用“视觉描述”做依据，提示词只当参考。
4. 修完对第 8 节验收清单。

提示词约定：英文、逗号分隔，前半句是主体与状态，后半句是风格约束。**每条提示词自带风格约束，可单独使用**，不用再拼接别的段落。

## 1. 通用规则

### 1.1 现状（从代码读到的）

| 位置 | 现在怎么显示 | 美化后 |
|---|---|---|
| 属性条（`ReignsGame.tsx`） | 文字按钮（属性名）+ 8px 金色圆点槽 + 8px 高圆角条。数值 <=20 或 >=80 时条变红（代码里的变量叫 `low`，两头都算） | 属性名左侧加 32×32 图标，条本身用 CSS 做像素化 |
| 影响提示 | 拖动卡牌时，受影响的那项下方亮一个 8px 金色发光圆点。只提示“会影响哪项”，不显示数字和方向 | 圆点换成像素版，规则不变 |
| 选角页（`RoleSelect.tsx`） | 36px emoji（`ROLES[id].emoji`），待开发角色用 🔒 | 换 64×64 头像，emoji 保留作加载失败回退 |
| 结局页（`EndingScreen.tsx`） | kicker（角色名 · 结局，special 时带金色“隐藏结局”胶囊）+ 标题 + 描述 | 标题上方加结局插图 |
| 结局图鉴 | 未达成显示“？？？”+“未达成”，special 带“隐藏”小标签 | 未达成项加剪影占位图 |
| 页头角色小标 | `{emoji} {name}` 胶囊 | 需要一个 16×16 小头像（见 6.6） |

### 1.2 本文新增的约束（在风格圣经之上）

| 项 | 规定 |
|---|---|
| 属性图标色数 | 每个状态最多 6 色（含 #0a0d15 描边），远低于圣经的“单张最多 16 色”，否则 16×16 会糊 |
| 状态阈值 | normal = 21–79，low = 数值 <= 20，high = 数值 >= 80。与代码里“条变红”的判断（`value <= 20 \|\| value >= 80`）和 `ENDING_THRESHOLDS.low / high` 一致 |
| 两头都是坏事 | 本游戏数值到 0 和到 100 都会结束。图标必须让玩家一眼看出“太低”和“太高”是两种不同的危险 |
| low 的统一语言 | 变小、变空、变灰、出现裂缝。主警示色用红 `#c24d45` / `#7d2f2f`，主体降为灰 `#8e8f9a` / `#b9b8b1` |
| high 的统一语言 | 变大、变满、溢出轮廓、发光过头。主警示色用金 `#f7d98f` / `#f2c261`，加 2–4 个星点像素，轮廓比 normal 多出 1px |
| 不能只靠颜色 | low 和 high 在**轮廓**上也要不同（缩小/破损 vs 膨胀/溢出），色弱玩家才分得清 |
| 禁止元素 | 图里不画数字、文字、正负号、箭头加减（避免剧透“具体数值和方向”）。结局图里需要“公告”“短信”时用色块和符号代替文字 |
| 结局图基调 | 触底和爆满画面要有对比，但保持荒诞幽默，不渲染血腥、自残或真实金融惨状。爆仓、清算画成“夸张的小剧场” |
| 三个角色的配色 | 基金经理 = 蓝紫 `#36408a #5b6bd0 #8fa0ff`；Web3 = 青 `#3bb8c6 #7ee7f2`；炒股达人 = 琥珀金 `#c99a3d #f2c261 #f7d98f`。图标和头像的底色、道具主色按此走 |
| 来源标注 | 用 AI 生图出的素材，要在 PR 描述里注明工具和日期（AGENTS.md 第 5 节）。素材是示例内容，README 里写明 |

通用负面提示词（图标）：

| 状态 | 负面提示词（直接复制，和对应状态的提示词一起粘贴） |
|---|---|
| normal | `anti-aliasing, blur, gradient, soft shadow, semi-transparent, glow blur, 3d render, photo, realistic, text, letters, numbers, plus minus sign, watermark, logo, brand, real person, pure black outline, more than 6 colors, dithering noise, thick outline, background scene, multiple icons, grid sheet, cracks, red tint, overflowing glow` |
| low | `anti-aliasing, blur, gradient, soft shadow, semi-transparent, 3d render, photo, realistic, text, letters, numbers, plus minus sign, watermark, logo, brand, real person, pure black outline, more than 6 colors, dithering noise, thick outline, background scene, multiple icons, grid sheet, gold glow, sparkles, swollen, oversized, bright cheerful colors` |
| high | `anti-aliasing, blur, gradient, soft shadow, semi-transparent, 3d render, photo, realistic, text, letters, numbers, plus minus sign, watermark, logo, brand, real person, pure black outline, more than 6 colors, dithering noise, thick outline, background scene, multiple icons, grid sheet, cracks, gray, faded, shrunken, empty, red tint` |

涨跌颜色（全游戏统一，与风格圣经“红=涨、绿=跌”一致，也和文案里的“满屏绿色”吻合）：**K 线 / 曲线的涨用红，跌用绿**。“危险”不靠红绿区分，而是用裂缝、缺角、暗红 `#7d2f2f` 的警示符号（叉、感叹号形的色块）。所以 low 状态里的红是“警示色”，不是“上涨色”；画下跌的线时线本身用绿，旁边加暗红裂缝。

## 2. 属性图标：4 个槽位 × 3 个角色 × 3 个状态 = 36 张，外加 4 个影响提示

槽位（`StatKey`）对所有角色语义一致，所以图标的 id 用“角色-槽位”，状态放在文件名末尾。

| 槽位 StatKey | 语义 | 基金经理 `fund` | Web3 `crypto` | 炒股达人 `stock` |
|---|---|---|---|---|
| `capital` 钱 | 主资产 / 业绩 | 业绩 | 钱包资产 | 账户资金 |
| `risk` 安全垫 | 抗风险能力 | 回撤控制 | 保证金健康 | 仓位风控 |
| `confidence` 定力 | 心态 / 信念 | 投研定力 | 钻石手 | 心态 |
| `reputation` 外界认可 | 别人怎么看你 | 客户信任 | 社区声量 | 股友口碑 |

画法总则：16×16 画布，主体占 12×12 左右，四周留 2px 透明边距（放大后不贴边）；左上受光，右下用同色暗一级；描边 #0a0d15 1px。
**文件名** = `icon-<role>-<slot>-<state>.png`，例如 `icon-fund-capital-low.png`。下面每个 id 对应 3 个文件。

### 2.1 基金经理（蓝紫系：#36408a #5b6bd0 #8fa0ff，点缀象牙 #f1ece0）

#### `icon-fund-capital` 业绩
含义：基金净值和排名。隐喻：小折线图。

| 状态 | 视觉描述（16×16） | 英文提示词 |
|---|---|---|
| normal | 蓝紫圆角小图表框（#36408a 底、#5b6bd0 框），里面一条 5 个折点的红色上扬折线（#f0766b，涨用红），右下一个象牙色小点。共 5 色 | `16x16 pixel art icon of a tiny line chart in a rounded frame, red line trending upward, blue-violet frame, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 框变灰（#8e8f9a），折线变绿色下滑（#3fcf9f），框右上角有一道暗红裂缝（#c24d45，2px 斜线），框整体比 normal 低 1px（“塌了”） | `16x16 pixel art icon of a tiny line chart in a gray cracked frame, green line sloping downward, small dark red crack in the corner, sad dull mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 红色折线冲出图表框顶端，框被撑大 1px、边框变金（#f2c261），折线末端带一颗金色星点（#f7d98f）和 2 个小十字闪光，像“冲得太高” | `16x16 pixel art icon of a tiny line chart whose red line shoots out through the top of a swollen golden frame, gold sparkles, overheated euphoric mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-fund-risk` 回撤控制
含义：回撤和仓位的安全垫。隐喻：盾牌。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 蓝紫盾牌（#5b6bd0 主体、#8fa0ff 左上高光、#36408a 右下暗面），盾面中间一条象牙色横杠。5 色 | `16x16 pixel art icon of a small blue-violet shield with a single horizontal ivory bar, calm and sturdy, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 盾牌变灰，正中一道贯穿的暗红裂缝，左下缺一个角（缺口 2×2 透明），盾面比 normal 矮 1px | `16x16 pixel art icon of a gray shield split by a dark red crack with a chipped corner, broken defense, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 盾牌被一圈金色锁链（#c99a3d / #f2c261）缠住，中间挂一把小金锁，盾牌轮廓比 normal 厚 1px，显得又重又死板 | `16x16 pixel art icon of a heavy blue-violet shield wrapped in golden chains with a small gold padlock, overprotective and stiff, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-fund-confidence` 投研定力
含义：团队的信念和判断一致性。隐喻：罗盘。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 蓝紫圆形罗盘，象牙色指针一红一象牙（北针红 #f0766b），指向正上方 | `16x16 pixel art icon of a small round compass with a steady needle pointing up, blue-violet case, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 罗盘灰色，指针断成两截、分别歪向两个方向，周围 3 个灰色小点表示“晃动”，外壳一边缺口 | `16x16 pixel art icon of a gray compass with a broken needle split in two pointing different ways, scattered dots, confused mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 罗盘外壳变金、膨胀 1px，指针被一颗金色大铆钉钉死在正上方，罗盘两侧各一块金色挡板（像马眼罩），表示“听不进别的方向” | `16x16 pixel art icon of a swollen golden compass with the needle pinned rigid by a big rivet and blinders on both sides, stubborn mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-fund-reputation` 客户信任
含义：持有人和销售渠道的信任。隐喻：带心形的奖章。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 蓝紫圆形奖章，中间一颗红心（#f0766b），下挂两条缎带（#5b6bd0） | `16x16 pixel art icon of a round blue-violet medal with a small red heart in the center and two ribbon tails, warm trust, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 奖章变灰，红心变成暗红且裂开，一条缎带断掉（只剩短短一截），奖章略微歪斜（整体左倾 1px） | `16x16 pixel art icon of a gray medal with a cracked dark red heart and a snapped ribbon, lost trust, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 奖章巨大、金色（#f2c261 / #f7d98f），外圈一圈金色射线（像聚光灯），缎带被撑得绷直，周围 3 个星点；表示“期望过载” | `16x16 pixel art icon of an oversized golden medal with a heart and radiating spotlight rays, strained ribbons, stars around, overhyped fame, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

### 2.2 Web3 玩家（青色系：#3bb8c6 #7ee7f2，点缀墨蓝 #1d2336、蓝紫 #5b6bd0）

#### `icon-crypto-capital` 钱包资产
含义：钱包里所有资产折合的价值。隐喻：带光的代币钱包。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 青色（#3bb8c6）小钱包，袋口露出一枚金色圆形代币（#f2c261，中间一条竖线表示币面），钱包左上一点浅青高光（#7ee7f2）。5 色 | `16x16 pixel art icon of a cyan crypto wallet with a gold token peeking out of the top, soft cyan highlight, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 钱包灰色、袋口敞开且瘪下去，里面空空（深色），旁边只掉出一枚暗淡的小币（#8e8f9a）和 1 个暗红小叉 | `16x16 pixel art icon of a gray empty wallet with its flap hanging open, one dull coin rolling away, dark red small cross, bankrupt mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 钱包鼓胀溢出，3 枚金币从袋口冒出，钱包轮廓比 normal 宽 1px，外圈金光（用 #f7d98f 的 1px 点状光环，不用渐变），4 个星点 | `16x16 pixel art icon of a bulging cyan wallet overflowing with gold coins and a golden aura ring made of single pixels, sparkles, euphoric greed, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-crypto-risk` 保证金健康
含义：距离被清算有多远。隐喻：装着青色液体的玻璃罐（保证金罐）。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 玻璃罐（#b9b8b1 罐壁），液面在约 60% 处，液体青色（#3bb8c6 + #7ee7f2 液面线），罐口一个小盖子 | `16x16 pixel art icon of a small glass jar filled about 60 percent with cyan liquid, tiny lid, calm, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 罐中液体只剩底部一层，变成暗红（#c24d45），罐壁一道裂缝，罐底漏出 2 滴红点；整体罐子变灰 | `16x16 pixel art icon of a gray cracked glass jar almost empty with a thin layer of dark red liquid leaking drops, danger of liquidation, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 罐子满到顶，罐口被一个金色封条/金色盖子封死（#c99a3d），罐壁撑大 1px，液体满格但一动不动，表示“太保守、钱闲置”；周围无星点（和别的 high 区分，画面更“沉闷”）| `16x16 pixel art icon of a glass jar completely full of cyan liquid sealed shut with a heavy golden lid and seal strap, oversaturated and stagnant, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

> 注：该槽位 high 的含义是“仓位轻、保证金过剩”，所以画“满得发闷”而不是“发光”。验收时确认它和 low 一眼能分开。

#### `icon-crypto-confidence` 钻石手
含义：拿得住的定力。隐喻：钻石。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 青色钻石（#7ee7f2 左上面、#3bb8c6 右侧面、#36408a 下尖），两侧各一个小十字闪光 | `16x16 pixel art icon of a cyan diamond gem with two tiny sparkle crosses, steady and bright, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 钻石换成一团皱巴巴的灰色纸团（#b9b8b1 / #8e8f9a），旁边 3 条抖动线，表示“纸手” | `16x16 pixel art icon of a crumpled gray paper ball with three shake lines, weak trembling hands, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 钻石变大变金（#f2c261），立在一块小灰色墓碑形底座上（#8e8f9a），钻石和底座之间一圈金色固定环，闪光过多（4 个）；表示“死多头，归零也不卖” | `16x16 pixel art icon of an oversized golden diamond fixed on top of a small gray tombstone-shaped pedestal, too many sparkles, stubborn hold-forever mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-crypto-reputation` 社区声量
含义：推特和社群里别人怎么看你。隐喻：对话气泡。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 青色圆角对话气泡（#3bb8c6，左上高光 #7ee7f2），里面三个象牙色点，左下一个小尖角 | `16x16 pixel art icon of a cyan speech bubble with three ivory dots inside, friendly chat, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 气泡灰色并碎成两半，右上角一个红色“禁止”圆圈（#c24d45，圆环加斜杠），里面的点消失 | `16x16 pixel art icon of a gray speech bubble broken in two with a small red prohibition circle sign, blocked and muted, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 气泡巨大金色，周围挤着 3 个小气泡，大气泡里是一把小锁而不是点（不敢说真话），边框撑大 1px，星点 2 个 | `16x16 pixel art icon of an oversized golden speech bubble surrounded by tiny bubbles with a small padlock inside, famous but silenced, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

### 2.3 炒股达人（琥珀金系：#c99a3d #f2c261 #f7d98f，点缀象牙 #f1ece0、暖棕 #8e5a3c）

#### `icon-stock-capital` 账户资金
含义：账户里的本金和浮盈。隐喻：钞票堆。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 一摞 3 层钞票（#3fcf9f 与 #2a9a77 交替的条形，中间系一条琥珀色腰封 #f2c261），左上一点高光。注：钞票用绿色是为了与红涨绿跌的“行情色”区分，这里表示“钱” | `16x16 pixel art icon of a small neat stack of banknotes tied with an amber band, green notes, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 只剩 1 张皱巴巴的灰色钞票，下面一个空的托盘/桌面线；旁边飘走 2 张小钞票，一个暗红小叉 | `16x16 pixel art icon of a single crumpled gray banknote on an empty tray with two notes flying away and a dark red cross, broke mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 钞票堆高耸到 5 层，顶部歪斜快倒，堆顶金色（#f7d98f）发光，2 张钞票飞出，4 个星点；表示“把市场当提款机” | `16x16 pixel art icon of a towering leaning stack of banknotes with golden glow on top, notes flying off, sparkles, greedy overconfident mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-stock-risk` 仓位风控
含义：止损纪律和仓位安全垫。隐喻：安全帽。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 琥珀色安全帽（#f2c261 主体、#f7d98f 高光、#c99a3d 暗面），帽檐下一条深色缝，帽顶一道中线 | `16x16 pixel art icon of a small amber safety helmet with a center ridge, reliable, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 安全帽灰色，被砸出凹陷和暗红裂纹，帽檐一侧碎掉，帽子歪倒（旋转感用阶梯像素表现） | `16x16 pixel art icon of a dented gray safety helmet with dark red cracks and a broken brim lying tilted, failed protection, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 安全帽外面又套了一层金色加固带和泡沫垫，体积比 normal 大一圈，帽檐压得很低几乎盖住下方，表示“防得太多，什么都不敢买” | `16x16 pixel art icon of an over-padded golden safety helmet with extra straps and thick padding pulled low, too cautious, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-stock-confidence` 心态
含义：盘中的情绪稳定度。隐喻：保温杯（风格圣经里炒股达人的标志道具）。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 琥珀色保温杯（#f2c261 杯身、#c99a3d 暗面、#b9b8b1 杯盖），杯口两缕细细的象牙色热气 | `16x16 pixel art icon of an amber thermos cup with gentle steam, calm composed mood, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 杯子灰色倾倒，杯盖弹开，水洒成一摊（灰蓝 #8fa0ff 的 3 个像素块），杯口冒出的是歪歪扭扭的暗红波浪线（情绪失控） | `16x16 pixel art icon of a gray tipped-over thermos cup with popped lid and spilled water, jagged dark red wavy lines, panicked mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 杯子金色、变大，杯盖上顶着一顶小金皇冠，热气膨胀成一团大云，4 个星点；表示“盲目自信” | `16x16 pixel art icon of an oversized golden thermos cup wearing a tiny crown with a puffed steam cloud and sparkles, arrogant overconfident mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

#### `icon-stock-reputation` 股友口碑
含义：股友群里别人对你的评价。隐喻：点赞拇指。

| 状态 | 视觉描述 | 英文提示词 |
|---|---|---|
| normal | 琥珀色拇指向上（肤色 #f7d98f / #eab98f 加暖棕暗面），拳头部分简化为一个圆角方块 | `16x16 pixel art icon of a thumbs-up hand in warm amber and skin tones, friendly approval, 6 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |
| low | 拇指向下，整体变灰，旁边一个暗红小叉（“被移出群聊”） | `16x16 pixel art icon of a gray thumbs-down hand with a small dark red cross, rejected by the group, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |
| high | 巨大的金色拇指站在一个小台座上（神坛），身后一圈金色射线，台座偏窄、有点晃，3 个星点；表示“被捧上神坛，说错一句就摔” | `16x16 pixel art icon of a giant golden thumbs-up on a small narrow pedestal with radiating rays, wobbly worshipped idol mood, 6 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, single centered object` |

### 2.4 “影响提示”小图标（4 个）

现有规则：拖动卡牌超过 8px 时，**受影响的那项**下方亮一个 8px 圆点；只提示“会影响哪项”，**不显示数字、不显示涨跌方向、不区分影响大小**。像素版严格沿用：

- 只用金色系（#f2c261 主体、#f7d98f 高光、#7a5a1f 暗面），**不用红/绿**（红绿会暗示涨跌方向）。
- 4 个槽位各一个形状，色盲 / 屏幕阅读辅助之外多一层冗余：圆、方、菱、三角。形状只与槽位有关，与角色无关（三个角色共用）。
- 画布 **8×8**（例外于圣经的 16×16，因为它本来就是 8px 的点；导出 2×=16×16、3×=24×24）。每个 2 帧（闪烁：frame-a 亮、frame-b 暗一级），减少动态效果时只用 frame-a。

| id | 槽位 | 形状 | 视觉描述（8×8） | 英文提示词 |
|---|---|---|---|---|
| `hint-capital` | 钱 | 圆 | 金色圆点，左上 1px 高光，右下 1px 暗面 | `8x8 pixel art marker, a small round golden dot with one highlight pixel, 3 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, centered` |
| `hint-risk` | 安全垫 | 方 | 金色小方块，左上高光，四角各缺 1px 呈圆角感 | `8x8 pixel art marker, a small square golden gem with chamfered corners and one highlight pixel, 3 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, centered` |
| `hint-confidence` | 定力 | 菱 | 金色菱形，上尖下尖，中心 1px 高光 | `8x8 pixel art marker, a small golden diamond shape with a center highlight pixel, 3 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, centered` |
| `hint-reputation` | 外界认可 | 三角 | 金色向上小三角，底边 5px，高光在左 | `8x8 pixel art marker, a small upward golden triangle with one highlight pixel on the left, 3 colors max, flat shading, 1px dark navy outline, no anti-aliasing, no gradient, transparent background, centered` |

文件名：`hint-<slot>-a.png`、`hint-<slot>-b.png`（共 8 个文件，计作 4 个素材、8 帧）。

## 3. 角色头像（选角页）

替换 `RoleSelect` 里的 36px emoji。原图 **64×64**，导出 5× = 320×320；选角卡里实际显示约 72–96px 方块（2× 或 1.5× 取整放大，邻近采样，`image-rendering: pixelated`）。emoji（🏦🪙📈🔒）保留，作图片加载失败的回退。

统一画法沿用风格圣经第 4 节：只画头和肩，头占约 70%，大眼睛，微 3/4 侧，单色背景块 + 最多 2 个装饰色块。同一角色的三个表情**只改眉、眼、嘴和 1–2 个小装饰**（汗滴、闪光），脸型、发型、服饰、背景不变，方便做表情切换。

表情的用途（建议）：neutral = 默认；happy = 鼠标悬停 / 键盘聚焦；worried = 可选，用于选角页的“待开发”之外的错误回退，也可以在属性接近危险时用在页头小头像上（见 6.6，需要的话再做）。

| 角色 | 主题色 | 背景 | 标志道具 | 发型 / 外形建议 | 表情差异 |
|---|---|---|---|---|---|
| 基金经理 `fund` | 蓝紫 #5b6bd0 | #36408a 单色，右上 2 格浅色窗格（写字楼窗） | 深色西装 + 蓝领带 + 工牌 | 整齐的短发，细框方脸，克制 | neutral：嘴角平；happy：嘴角微扬、眼睛弯；worried：眉头皱、1 滴汗、领带被拉松 |
| Web3 玩家 `crypto` | 青 #3bb8c6 | #1d2336 夜色 + 2 个青色霓虹块 | 连帽衫 + 耳机 + 头像框（身后一个方形青色边框） | 蓬松短发露出耳机，夸张大眼 | neutral：半眯眼；happy：星星眼、露齿笑；worried：瞳孔缩小、眼白变大、2 滴汗 |
| 炒股达人 `stock` | 琥珀金 #f2c261 | #7a5a1f 暖色块 + 1 个窗格 | 马甲 + 老花镜 + 保温杯（肩旁露一角） | 稀疏中分，圆脸，市井感 | neutral：眼镜后平眼；happy：眯眼笑、镜片一点高光；worried：眉八字、眼镜滑到鼻尖、1 滴汗 |

文件名：`avatar-<role>-<expr>.png`，例如 `avatar-fund-neutral.png`。共 9 张。

**通用负面提示词（头像）**，每次与下列任一提示词一起粘贴：

```
anti-aliasing, blur, gradient, soft shadow, semi-transparent, 3d render, photo, realistic, full body, hands, text, letters, numbers, watermark, logo, real brand, celebrity, real person, pure black outline, more than 16 colors, dithering noise, busy background, multiple characters
```

| id | 英文提示词 |
|---|---|
| `avatar-fund-neutral` | `64x64 pixel art chibi bust portrait of a fund manager, big round head about 70 percent of the frame, big simple eyes, calm neutral expression, dark suit, blue tie, small id badge, short neat hair, flat blue-violet office background with two small window panes, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-fund-happy` | `64x64 pixel art chibi bust portrait of a fund manager, big round head about 70 percent of the frame, big simple eyes curved in a satisfied smile, dark suit, blue tie, small id badge, short neat hair, flat blue-violet office background with two small window panes, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-fund-worried` | `64x64 pixel art chibi bust portrait of a fund manager, big round head about 70 percent of the frame, big eyes with furrowed brows, one sweat drop, loosened blue tie, dark suit, small id badge, flat blue-violet office background with two small window panes, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-crypto-neutral` | `64x64 pixel art chibi bust portrait of a crypto trader, big round head about 70 percent of the frame, half-lidded big eyes, relaxed neutral mouth, cyan hoodie, headphones, fluffy short hair, square cyan avatar frame behind, dark navy night background with two neon cyan blocks, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-crypto-happy` | `64x64 pixel art chibi bust portrait of a crypto trader, big round head about 70 percent of the frame, star-shaped sparkling eyes, wide toothy grin, cyan hoodie, headphones, fluffy short hair, square cyan avatar frame behind, dark navy night background with two neon cyan blocks, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-crypto-worried` | `64x64 pixel art chibi bust portrait of a crypto trader, big round head about 70 percent of the frame, tiny pupils in huge white eyes, two sweat drops, wobbly mouth, cyan hoodie, headphones slightly crooked, square cyan avatar frame behind, dark navy night background with two neon cyan blocks, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-stock-neutral` | `64x64 pixel art chibi bust portrait of a veteran retail stock trader, big round head about 70 percent of the frame, calm eyes behind reading glasses, neutral mouth, amber vest over a shirt, thin hair parted in the middle, corner of a thermos cup beside the shoulder, warm amber-brown background with one window pane, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-stock-happy` | `64x64 pixel art chibi bust portrait of a veteran retail stock trader, big round head about 70 percent of the frame, squinting happy eyes behind reading glasses with a tiny lens glint, broad smile, amber vest, thin parted hair, corner of a thermos cup beside the shoulder, warm amber-brown background with one window pane, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |
| `avatar-stock-worried` | `64x64 pixel art chibi bust portrait of a veteran retail stock trader, big round head about 70 percent of the frame, worried slanted eyebrows, reading glasses slipped down the nose, one sweat drop, amber vest, thin parted hair, corner of a thermos cup beside the shoulder, warm amber-brown background with one window pane, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, original character` |

### 3.1 第四个角色“待开发”占位图

对应 `COMING_SOON_ROLE`（名字“更多身份”，文案“待开发”）。1 张，64×64。

| id | 视觉描述 | 英文提示词 |
|---|---|---|
| `avatar-locked` | 灰色（#3a4260 / #272d42 两级墨蓝灰）人物剪影，头肩轮廓和另外三个头像同尺寸同位置；剪影前方居中一把象牙灰（#b9b8b1 / #8e8f9a）小挂锁（约 14×16 像素）；背景 #161b2a。整体低饱和，和选角页灰色卡片一致 | `64x64 pixel art chibi bust silhouette in dark blue-gray, same head and shoulder shape as other portraits, a small gray padlock centered in front, locked placeholder, muted dim palette, 8 colors max, 1px dark navy outline, flat shading, no anti-aliasing, no gradient, no text, no face details, original design` |

负面提示词：`anti-aliasing, blur, gradient, 3d render, photo, text, letters, bright colors, face details, watermark, logo, real person`。

## 4. 结局插图：38 张

规格：原图 **128×96**，导出 3× = 384×288，邻近采样。每张**一个鲜明场景**，主体居中偏下，上方留 1/4 做天空 / 墙面（版式见第 5 节）。可以出现小人，但按圣经“大头人”画法（头占身体一半以上），不画真人、不画真实品牌。**画面里不出现可读文字**，公告、短信、弹窗一律用色块、感叹号形图案、波浪线代替。

数量核对（与 `endings.ts` 一致）：普通 8 × 3 角色 = 24；专属特殊 3 × 3 角色 = 9；通用特殊 5（`sp-` 开头，三角色同 id、同标题）= 5；共 **38**。

**标题全部取自 `endings.ts`，与代码逐字一致**（含“KOL 的枷锁”中的空格）。

**结局插图通用负面提示词**（与每条提示词一起粘贴）：

```
anti-aliasing, blur, gradient, soft shadow, semi-transparent, 3d render, photo, realistic, text, letters, numbers, watermark, logo, real brand, celebrity, real person, pure black outline, more than 16 colors, dithering noise, gore, blood, violence, self harm, ultra detailed, tiny clutter
```

**提示词里的统一后缀**（已写进每一条，复制时无需另外拼）：`128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text`。

涨跌色提醒：K 线 / 曲线的涨用红 `#f0766b`，跌用绿 `#3fcf9f`（与全游戏一致，见 1.2 节末）。“屏幕一片绿色”= 大跌。

### 4.1 P0：基金经理 8 个普通结局（蓝紫系，场景：写字楼 / 会议室 / 官网）

文件名统一为 `ending-<id>.png`。

| id | 标题 | 触发 | 画面描述（一句话场景） | 主色 | 情绪 | 英文提示词 |
|---|---|---|---|---|---|---|
| `fund-low-capital` | 清盘通知 | 业绩触底 | 公告栏上贴着一张红色大通知（只画红色色块 + 一个大感叹号形），小人把工牌放进纸箱，纸箱里还有一盆小绿植 | 蓝紫 #36408a + 红 #c24d45 | 崩溃（带一点苦笑） | `chibi fund manager packing an id badge into a cardboard box beside a notice board with a big red notice sheet and an exclamation mark shape, a tiny potted plant in the box, dim blue-violet office wall, sad resigned mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-high-capital` | 规模失控 | 业绩爆满 | 资金如潮水涌入：一条金色钱浪从画面右侧灌进办公室，淹到小人的腰，小人抱着一只快撑破的保险箱，天花板上的吊灯在摇 | 金 #f2c261 + 蓝紫 | 荒诞（得意又慌） | `a huge wave of gold coins flooding into a blue-violet office like a tide, chibi fund manager waist-deep clutching a bulging safe about to burst, swinging ceiling lamp, absurd overwhelmed mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-low-risk` | 回撤红线 | 回撤控制触底 | 一条绿色（下跌）的净值曲线像滑梯，一路滑穿画面中的一条红色横线，小人坐在滑梯尽头，背后桌上 3 部红色电话同时响（用声波线表示） | 绿 #2a9a77 + 红 #c24d45 | 荒诞（慌） | `a long green downward curve shaped like a playground slide breaking through a bright red horizontal line, chibi fund manager sliding down wide-eyed, three red telephones ringing with sound wave lines on a desk behind, blue-violet office, panicked comic mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-high-risk` | 业绩跑输 | 回撤控制爆满 | 赛道上，一群小人的跑步队伍远在前方，只有一个穿西装的小人被全身的安全气囊和护具裹成球，原地没动，终点线旁的排名牌（只画色块）他在最底 | 蓝紫 + 灰 #b9b8b1 | 无奈（略带荒诞） | `a running track where a pack of runners is far ahead, a chibi fund manager in a suit padded with bubble wrap and safety gear stands still at the start, finish line in the distance, a ranking board of color blocks with his block at the very bottom, gray-blue sky, deadpan mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-low-confidence` | 投研散架 | 投研定力触底 | 会议桌上，一块白板被拆成散落的零件（箭头、方块散落一地），6 个小人各自举着不同的牌子（不同颜色色块）互相争吵，桌子正中一个问号形图案 | 蓝紫 + 多种杂色（红、青、金各 1） | 崩溃（混乱） | `a chaotic meeting room, a whiteboard falling apart into scattered shapes and arrows on the floor, six chibi analysts each raising a different colored sign and arguing, a big question mark shape above the table, messy mood, blue-violet palette with small red cyan gold accents, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-high-confidence` | 固执己见 | 投研定力爆满 | 小人站在一块写满图形的白板前双手抱胸，耳朵上戴着一副大号金色耳罩（听不见反对意见），窗外一道巨大的闪电 / 浪头正劈向白板 | 金 #c99a3d + 蓝紫 | 得意（马上翻车） | `a chibi fund manager standing arms crossed in front of a whiteboard full of diagrams wearing huge golden earmuffs, a giant lightning bolt and storm wave outside the window about to hit the board, smug yet doomed mood, blue-violet office, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-low-reputation` | 大额赎回 | 客户信任触底 | 门口排着长队的小人，每人手里拖着一只小箱子往外走（箭头朝外）；柜台后的小人望着空了的“存款罐”（罐子里只剩一枚币） | 蓝紫 + 灰 | 失落 | `a long queue of chibi clients dragging small suitcases out through a door, a lone fund manager behind the counter staring at a nearly empty glass jar with one coin left, cold gray-blue lobby, lonely mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `fund-high-reputation` | 期望过载 | 客户信任爆满 | 路演舞台，聚光灯把小人打得很亮，台下坐满举着灯牌（色块）的观众；小人背上扛着一座比他还高的金色奖杯塔，腿在发抖 | 金 #f2c261 + 蓝紫 | 荒诞（压力山大） | `a roadshow stage with a spotlight on a chibi fund manager balancing a tower of golden trophies taller than himself, trembling legs, a packed audience holding glowing color-block signs, absurd pressure mood, blue-violet and gold palette, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |

### 4.2 P0：Web3 玩家 8 个普通结局（青色系，场景：夜晚 / 屏幕光 / 链上）

| id | 标题 | 触发 | 画面描述 | 主色 | 情绪 | 英文提示词 |
|---|---|---|---|---|---|---|
| `crypto-low-capital` | 空钱包 | 钱包资产触底 | 夜里，小人抱着一只张着口的空钱包，钱包里往外飘着一缕灰烟；群聊气泡（只画 3 个小气泡）从屏幕飘出，最大的气泡里是一颗问号形图案 | 灰 #8e8f9a + 青 | 失落（空） | `a chibi crypto player at night hugging an open empty wallet with a wisp of gray smoke, a glowing screen behind with three chat bubbles and a question mark shape, dark navy room with faint cyan light, hollow lonely mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-high-capital` | 天选之子 | 钱包资产爆满 | 小人站在金币堆成的小山上，头顶一圈金光环，双手高举；山脚有一只被他当作赌注推出去的金色生活费信封（画成一只小钱袋，旁边一个“梭哈”的推出手势） | 金 + 青 | 得意（要出事） | `a chibi crypto player standing on a hill of gold coins with a golden halo above his head arms raised triumphantly, pushing a small money pouch toward a glowing neon cyan screen at the foot of the hill, hubris mood, dark navy night background, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-low-risk` | 被清算 | 保证金健康触底 | 一根又尖又长的“插针”形 K 线（绿色，从屏幕上方刺下来）扎破了小人的保证金罐，罐里青色液体流光；一只机械手（系统）把小人的头像框从桌上拿走，小人张大嘴发呆 | 绿 + 青 + 暗红 | 崩溃（被秒了） | `a very long sharp green candle spike stabbing down through a screen and puncturing a glass margin jar, cyan liquid draining, a robotic hand removing a chibi crypto player's avatar frame while he stares open-mouthed, dark navy neon room, dazed mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-high-risk` | 空仓观众 | 保证金健康爆满 | 体育场看台：小人坐在观众席，手里拿着一本厚厚的白皮书，眼前的赛场上一枚火箭（涨幅）窜上天，别的小人都在火箭上；他的保证金罐满满当当放在脚边没动 | 青 + 红（火箭） | 无奈（看戏） | `a chibi crypto player sitting in a stadium stand reading a thick whitepaper while a red rocket launches up behind him, other chibi players riding the rocket, his full cyan margin jar untouched at his feet, spectator mood, dark navy night sky with cyan light, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-low-confidence` | 纸手 | 钻石手触底 | 小人的双手是两张纸折成的手套，被一根绿色小柱子（一根绿 K 线）吓得发抖，手里的币被抖飞，飞出去的币背后拖着红色上升尾迹 | 灰白 + 绿 + 红尾迹 | 荒诞（后悔） | `a chibi crypto player with hands made of folded paper trembling at a small green candle, coins flying out of his hands trailing red upward streaks, dark navy night room, regretful comic mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-high-confidence` | 死多头 | 钻石手爆满 | 币价归零的灰色墓地，小人抱着一颗发光的钻石（钻石已经变成暗淡的石头）站在一块小墓碑前，举着一面飘扬的旗子（色块旗，上面画一颗钻石标记） | 灰 + 金（旗） | 荒诞（悲壮） | `a chibi crypto player standing in a gray graveyard hugging a dull stone that used to be a diamond, holding a waving flag with a diamond emblem in front of a tiny tombstone, stubborn heroic yet absurd mood, dark navy sky with a pale moon, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-low-reputation` | 反向指标 | 社区声量触底 | 一排聊天窗，所有气泡都被一个红色禁止圈划掉；小人的一条推文变成一枚指向相反方向的巨大箭头（红箭头向上、绿箭头向下，互为反向）；旁边另一个小人对着箭头做空的手势 | 青 + 红绿对向箭头 | 荒诞 | `a row of chat windows each crossed out by a red prohibition circle, a chibi crypto player's post turned into a giant arrow pointing the opposite way of the market, another chibi player pointing at it grinning, dark navy neon room, ironic mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `crypto-high-reputation` | KOL 的枷锁 | 社区声量爆满 | 小人坐在聚光灯下的高脚椅上，脖子上挂着巨大的金色麦克风链条，脚踝上一副金色脚镣连着一排粉丝头像框；手里的话筒前飘着一把小锁（不敢说真话） | 金 + 青 | 荒诞（被困） | `a chibi crypto influencer on a tall stool under a spotlight with a golden microphone chain around his neck and golden shackles on his ankle linked to a row of fan avatar frames, a small padlock floating in front of his mouth, dark navy night stage with cyan glow, trapped fame mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |

### 4.3 P0：炒股达人 8 个普通结局（琥珀金系，场景：营业部 / 盯盘屋 / 暖色）

| id | 标题 | 触发 | 画面描述 | 主色 | 情绪 | 英文提示词 |
|---|---|---|---|---|---|---|
| `stock-low-capital` | 爆仓离场 | 账户资金触底 | 夜晚小屋，小人关掉电脑，屏幕一片暗；手机亮着，屏幕上一串绿色气泡（短信）堆成一座小山；小人正拿着报纸的招聘版（只画方块栏），把保温杯盖上 | 暖褐 #8e5a3c + 绿 | 崩溃转平静（认命） | `a chibi veteran stock trader switching off a dark computer in a small amber-brown room, a phone showing a pile of green message bubbles, a newspaper with plain block columns on the desk, screwing the lid onto a thermos cup, resigned mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-high-capital` | 提款机幻觉 | 账户资金爆满 | 小人对着一台“股票机”像对着自动提款机，红色钞票从屏幕里喷出，他眼睛变成金色圆币形（圆形 + 竖线，不画 $ 或文字）；背后墙上一栋小房子的挂画，被推向屏幕 | 金 + 红钞 | 得意（要出事） | `a chibi veteran stock trader in front of a computer that spits out stacks of banknotes like an ATM, his eyes shaped like golden coins, a framed picture of a small house on the wall behind him sliding toward the screen, greedy hubris mood, warm amber background, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-low-risk` | 重仓失守 | 仓位风控触底 | 屏幕整面绿色，一个巨大的绿色“跌停”板块砸穿一条细细的止损虚线，小人整个人被压在绿色板块边缘，脸呆滞地看着满屏绿 | 绿 + 暖褐 | 崩溃（发呆） | `a wall-sized green screen with one giant green block smashing through a thin dashed stop-loss line, a chibi veteran stock trader frozen and staring blankly, thermos cup tipping, warm brown monitoring room, shocked mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-high-risk` | 只看不买 | 仓位风控爆满 | 小人在屏幕前画了十条红色止损线，把自己围在里面（像牢笼）；屏幕外别人在抢红包，红包雨落在窗外，他只能看着；账户柱子（一根平平的线）一动不动 | 暖褐 + 红（红包） | 无奈（略荒诞） | `a chibi veteran stock trader surrounded by ten thin red stop-loss lines forming a cage around his desk, red envelopes raining outside the window while he only watches, a flat unmoving line on his screen, warm amber room, deadpan envious mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-low-confidence` | 追涨杀跌 | 心态触底 | 小人的身体被画成一条疯狂的心电图：左手追着一根红柱往上跑，右手又把一根绿柱往下扔，成交记录（一卷长纸条）从屏幕拖到地上，缠住他的脚 | 红 + 绿 + 暖褐 | 崩溃（混乱） | `a chibi veteran stock trader frantically chasing a red rising bar with one hand and throwing away a green falling bar with the other, a long paper trade receipt trailing from the screen and tangling his feet, zigzag heartbeat lines in the air, warm amber room, frantic mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-high-confidence` | 盲目自信 | 心态爆满 | 小人戴着金色墨镜、跷着腿，把“复盘笔记本”和“止损旗”丢进垃圾桶；身后窗外是一个巨大的绿色浪头，他背对着没看见 | 金 + 绿浪 | 得意（马上翻车） | `a chibi veteran stock trader wearing golden sunglasses with feet on the desk tossing a notebook and a small stop-loss flag into a trash bin, a giant green wave rising outside the window behind him unnoticed, smug doomed mood, warm amber room, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-low-reputation` | 口碑扫地 | 股友口碑触底 | 屏幕上一个小群聊头像列表，小人的头像被一只手轻轻划出去，屏幕上只剩他一人的光；他背靠椅子，对着空屏幕发呆，保温杯里的热气已经没了 | 暖褐 + 灰 | 失落 | `a chibi veteran stock trader alone in a dim room, his avatar frame being gently slid out of a group chat list on the screen, a thermos cup with no steam, lonely quiet mood, warm brown and gray palette, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `stock-high-reputation` | 被捧上神坛 | 股友口碑爆满 | 小人站在一座高高的金色神坛上，下方一大群举着灯牌的股友仰望；神坛窄而摇晃，一个角正在碎；他手里拿着话筒，脸上是僵硬的笑 | 金 + 暖褐 | 荒诞（骑虎难下） | `a chibi veteran stock trader standing stiffly on a tall narrow golden pedestal with a corner crumbling, a crowd of fans below holding glowing signs, microphone in hand and a forced smile, warm amber background, wobbly precarious mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |

### 4.4 P1：9 个角色专属特殊结局（隐藏结局）

这些结局的 `special: true`，页面上会带“隐藏结局”徽标和特殊边框（第 5 节）。画面应比普通结局更“戏剧化”，信息量略多，可以用 2 个角色小人。id 在代码里由 `special(role, slug, …)` 生成，形如 `sp-fund-star`。

| id | 标题 | 角色 | 触发 | 画面描述 | 主色 | 情绪 | 英文提示词 |
|---|---|---|---|---|---|---|---|
| `sp-fund-star` | 明星基金经理的倒计时 | 基金经理 | 业绩高、信任高、回撤控制低 | 聚光灯下的颁奖台，小人举着奖杯微笑；台下地面开裂，奖杯底座下露出一只滴答作响的倒计时沙漏（红色沙），沙漏快漏光 | 金 + 蓝紫 + 红沙 | 得意（暗藏危机） | `a chibi fund manager on an award podium holding a golden trophy and smiling, spotlight above, the floor below cracking to reveal a big hourglass with red sand almost run out, gold and blue-violet palette, tense triumphant mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-fund-unloved` | 赢了业绩输了人心 | 基金经理 | 业绩高、信任低 | 左边：小人拿着第一名的奖杯站在漂亮的红色曲线前；右边：一排空座位和一个被撤下的“推荐”牌子（用倒下的色块牌表示）；中间一道裂缝把画面一分为二 | 蓝紫 + 金 + 灰 | 失落（孤独的赢家） | `split scene, left a chibi fund manager holding a first-place trophy before a rising red curve, right a row of empty chairs and a fallen sign board, a crack down the middle, blue-violet and gold on the left and gray on the right, lonely winner mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-fund-chaser` | 追热点的明星 | 基金经理 | 投研定力低、信任高 | 小人被粉丝簇拥着，却追着一群彩色热气球（热点）跑，手上抓着一根线，脚下没有路；他的西装每过一格换一个颜色（风格漂移） | 蓝紫 + 多色气球 | 荒诞 | `a chibi fund manager in a suit changing colors in segments, chasing a cluster of colorful hot air balloons while fans cheer behind him, no road under his feet, drifting identity mood, blue-violet dominant with small bright accents, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-crypto-allin` | 全仓梭哈的幸存者 | Web3 | 钱包高、保证金低 | 小人站在细细的一根绳子（保证金）上，脚下是万丈深渊，他两手各抱一大袋金币，嘴里叼着一朵小花；旁边一只锦鲤在空中游过 | 青 + 金 | 荒诞（侥幸） | `a chibi crypto player walking on a very thin tightrope over a deep dark gap, carrying two huge bags of gold coins and a flower in his mouth, a golden koi fish swimming through the air beside him, dark navy and cyan, lucky absurd mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-crypto-moon` | 登月成功 | Web3 | 钱包高、钻石手高 | 月球表面，小人插着一面钻石旗，一只手机屏幕黑了（关掉 App），他对着一排小头像（前任）发自拍（画成一排小气泡，每个气泡里一个爱心）；地球在背景 | 青 + 金 + 墨蓝 | 得意（潇洒） | `a chibi crypto player in a space helmet on the moon planting a diamond flag, turned off phone in hand, taking a selfie with a row of small chat bubbles with hearts, earth in the dark navy sky, triumphant smug mood, cyan and gold, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-crypto-paper` | 安全的纸手 | Web3 | 钻石手低、保证金高 | 小人抱着一罐满满的青色保证金，手里却攥着一枚想卖的币，旁边一排大大小小的币（百倍币）长着翅膀飞走，每一枚的尾巴都是红色上升线 | 青 + 红尾 | 荒诞（后悔） | `a chibi crypto player hugging a full cyan margin jar with trembling paper hands, a flock of winged coins flying away each trailing a red rising streak, dark navy night sky, comic regretful mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-stock-guru` | 荐股大 V | 炒股达人 | 口碑高、心态高、仓位风控低 | 小人坐在直播间的座椅上，面前粉丝光点如繁星；他的身后账户屏幕在冒出一个红色警告图案，一只小手举着“救命”牌（空白色块牌）从屏幕后伸出来 | 金 + 红 + 暖褐 | 荒诞（外强中干） | `a chibi veteran stock trader sitting like a livestream guru surrounded by fan sparkles, behind him the account monitor flashing a red warning shape with a tiny hand holding a blank sign reaching out of the screen, warm amber room, absurd bluff mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-stock-bagholder` | 套牢信徒 | 炒股达人 | 账户资金低、心态高 | 小人盘腿坐在一座小庙（绿色K线山）前，双手合十，保温杯放在供桌上；身后墙上挂着“长期持有”的牌匾（用空白金牌匾表示），旁边是一块写着不了字的小墓碑 | 绿 + 金 + 暖褐 | 荒诞（虔诚） | `a chibi veteran stock trader sitting cross-legged in prayer before a tiny shrine shaped like a green mountain chart, thermos cup as an offering, a blank golden plaque on the wall and a small tombstone beside, warm amber room, devout absurd mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-stock-hermit` | 空仓钉子户 | 炒股达人 | 仓位风控高、口碑低 | 一座大楼被拆得只剩一小块地，小人坐在地块中央的藤椅上，周围是围栏和推土机（别人涨势）；他手里抱着保温杯，面无表情看着；地块上有一盏小灯 | 暖褐 + 灰 + 金 | 平静（倔强） | `a chibi veteran stock trader sitting in a rattan chair on a tiny plot of land untouched among bulldozers and fences, holding a thermos cup calmly, a small lamp beside him, warm amber and gray, stubborn calm mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |

### 4.5 P2：5 个通用特殊结局（三个角色共用 id 与标题）

代码里 `role: 'all'`，三个角色只是描述换了说法。画一张**通用图**，里面的小人不带角色标志道具（穿白 T 恤的“交易员”，用象牙 / 灰色），底色是中性墨蓝；每个角色可选再做一版换色（色板置换，不重画）：基金经理 = 蓝紫，Web3 = 青，炒股达人 = 琥珀金。
`kind`：`inertia` 为 `special`（中途触发），其余四个为 `survive`（走满 40 回合）。

文件名：基础图 `ending-sp-<key>.png`；换色版 `ending-sp-<key>-<role>.png`（没有换色版时，前端回退到基础图）。

| id | 标题 | 触发 | 画面描述 | 基础主色 | 情绪 | 英文提示词 |
|---|---|---|---|---|---|---|
| `sp-inertia` | 惯性思维 | 连续 8 次同方向滑动 | 小人推着一辆自行车沿着笔直的轨道冲向前，前方轨道在悬崖处向右拐弯，他的影子却一直往前；背后是一长串整齐的脚印和 8 张同方向翻过去的卡牌 | 墨蓝 + 灰蓝 | 荒诞（毫无察觉） | `a chibi trader in a white t-shirt rushing straight ahead on a rail track while the track curves away sharply at a cliff edge, a long line of identical footprints and eight cards flipped in the same direction behind him, neutral dark navy and gray-blue palette, oblivious comic mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-obsessive` | 偏执专家 | 走满回合 + 同一风格占比高 | 小人站在一条很窄但很深的赛道上，手里握着一把巨大的万能钥匙（磨得发亮），身旁满是同一款锁的复制品；赛道左右是模糊的宽阔空地，他没注意 | 墨蓝 + 金 | 得意（专精但窄） | `a chibi trader standing in a very narrow deep lane holding one oversized polished key, surrounded by dozens of identical locks, wide empty land blurred on both sides unnoticed, dark navy and gold, proud narrow-focus mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-adventurer` | 行情亲历者 | 走满回合 + 奇遇卡选择 8 次以上 | 小人背着旅行包，站在一排排“经历”过的路牌式色块（大涨的红山、急跌的绿谷、假突破的虚线桥）前，每个场景里留着他的脚印和一枚徽章；手里拿着一本鼓鼓的旅行笔记 | 墨蓝 + 红 + 绿 | 得意（见过世面） | `a chibi trader with a travel backpack standing before a panorama of memorable terrain: a red mountain, a green valley, and a dotted fake bridge, badges and footprints in each scene, holding a thick travel diary, dark navy sky, worldly proud mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-balanced` | 稳如磐石 | 走满回合 + 四条数值都在 35–65 | 一块圆润的大石头稳稳立在水面中央，四条细线从石头的四个方向拉直到四个浮标，四个浮标都在同一水平线上；小人坐在石头上钓鱼，一动不动 | 墨蓝 + 青灰 + 象牙 | 平静 | `a chibi trader sitting calmly on a big smooth rock in the middle of still water, four thin lines going to four floats lined up evenly, soft ripples, dark navy and teal-gray with ivory, serene balanced mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |
| `sp-survivor` | 活到收盘 | 走满回合的兜底结局 | 黄昏的交易大厅，大屏幕熄灭，灯一盏盏关掉；小人拎着公文包走到门口，回头挥手，窗外是橙色的夕阳；地上有一道长长的影子 | 暖橙 #f2c261 + 墨蓝 | 平静（劫后余生） | `a chibi trader in a white t-shirt carrying a briefcase waving goodbye at the doorway of an empty trading hall at dusk, screens turned off, orange sunset through the window casting a long shadow, calm relieved mood, 128x96 pixel art illustration, chibi big-head characters, 16 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, no text` |

### 4.6 画面难表达的结局（给美术的提醒）

| id / 标题 | 难点 | 建议 |
|---|---|---|
| `fund-high-risk` 业绩跑输 | “管得太死导致跑输”是抽象因果，没有现成视觉 | 用“穿满护具的人在跑道起点不动”的隐喻，宁可让画面有点傻 |
| `fund-low-confidence` 投研散架 | 内部分歧很难看出是“定力低”而不是普通开会 | 白板散架 + 每人举不同颜色牌子，色彩要明显杂乱 |
| `crypto-high-risk` 空仓观众 | 没发生事件，是“缺席” | 看台 + 火箭，对比要靠构图（小人小、火箭大） |
| `crypto-low-reputation` 反向指标 | 概念本身很绕 | 用“相反方向的箭头”表达，不要想画推文 |
| `stock-low-reputation` 口碑扫地 | 被“悄悄移出群聊”没有动作 | 画头像被划出群列表，色调冷 |
| `sp-fund-unloved`、`sp-fund-chaser` | 两个状态并存，画面容易拥挤 | 分屏 / 色彩分区，主体不超过 3 个 |
| `sp-balanced`、`sp-inertia`（通用图） | 要同时兼容三个角色的描述 | 小人不带角色道具，只表达氛围 |
| 所有“触底 / 爆满”成对结局 | 一个槽位的 low 和 high 在同一个角色里必须一眼可分 | 参考表格里“主色”：low 偏灰 / 绿 / 暗红，high 偏金 / 红 / 满溢；同槽位成对出图，放一起检查 |

## 5. 结局页版式与图鉴素材

### 5.1 结局页（插图在标题上方）

现有结构：kicker → 标题 → 描述。美化后在 kicker 下面、标题上方插入结局插图。插图放大后 384×288，在 480px 宽的页面里居中，窄屏（<384px）按容器宽度等比缩小，但缩放比例必须是整数倍或使用 `image-rendering: pixelated`，避免糊。

```
普通结局                                  隐藏结局（special）
┌────────────────────────────────┐        ┌════════════════════════════════┐
│   基金经理 · 结局              │        ║ ◆  基金经理 · [隐藏结局]    ◆ ║
│ ┌────────────────────────────┐ │        ║ ┌────────────────────────────┐ ║
│ │                            │ │        ║ │ ✦                       ✦  │ ║
│ │   结局插图 384×288         │ │        ║ │   结局插图 384×288         │ ║
│ │   (128×96 的 3 倍)         │ │        ║ │   四角有像素角花           │ ║
│ │                            │ │        ║ │ ✦                       ✦  │ ║
│ └────────────────────────────┘ │        ║ └────────────────────────────┘ ║
│         清盘通知               │        ║        明星基金经理的倒计时    ║
│  净值一路下滑，跌破清盘线……   │        ║  业绩亮眼，客户追捧，回撤……   ║
└────────────────────────────────┘        └════════════════════════════════┘
          细边框（现有 CSS）                 双线像素边框 + 角花 + 星点
```

要点：

- 插图下沿与标题之间留 12px（沿用现有 `gap: 12px`）。
- 插图外加 1 个 CSS 像素边框（2px 墨蓝 #0a0d15 + 1px #3a4260），不需要画进图里。
- 插图的 `alt`：用标题加一句话，例如“清盘通知的结局插图”。插画本身没有文字，信息不会丢。
- 图片加载失败：隐藏图片区域，页面退回现在的纯文字版（不留空白）。
- 隐藏结局的“特殊边框 / 徽标”素材见 5.2。

### 5.2 隐藏结局的边框与徽标（P1）

| id | 用途 | 尺寸（原图） | 状态 | 视觉描述 | 英文提示词 |
|---|---|---|---|---|---|
| `frame-hidden-corner` | 隐藏结局插图四角的“角花”，一张图旋转 / 翻转得到四个角 | 16×16 | 1 张（代码里 CSS 翻转用四次） | 琥珀金（#f7d98f / #f2c261 / #c99a3d）直角 L 形角，内侧一颗小星点 | `16x16 pixel art ornamental corner bracket in amber gold with a tiny star, L-shaped, 5 colors max, 1px dark navy outline, flat shading, no anti-aliasing, no gradient, transparent background` |
| `frame-hidden-edge` | 隐藏结局边框的边线重复单元（横向平铺） | 16×4 | 1 张 | 琥珀金双线像素条，中间每 8px 一个小菱形 | `16x4 pixel art repeating border strip in amber gold, double line with small diamond every 8 pixels, 4 colors max, flat shading, no anti-aliasing, no gradient, transparent background, seamless tile horizontally` |
| `badge-hidden` | 替换 kicker 里的“隐藏结局”文字胶囊旁的小徽标（文字仍保留，徽标放在文字左侧） | 16×16（导出 32×32） | 1 张 | 金色圆形“封蜡章”，中间一颗小星，下缘两小段缎带 | `16x16 pixel art icon of a golden wax seal badge with a small star in the middle, 5 colors max, flat shading, 1px dark navy outline, light from top-left, no anti-aliasing, no gradient, transparent background, single centered object` |

注：边框与角花只给 special 结局；普通结局保持现有 CSS 边框，不画。

### 5.3 结局图鉴：未达成占位图（P0）

图鉴（`reigns-codex`）现有逻辑：当前结局显示标题，其余项显示“？？？”和“未达成”，不剧透。像素化后：

| id | 用途 | 尺寸 | 视觉描述 | 英文提示词 |
|---|---|---|---|---|
| `ending-unknown` | 图鉴中未达成项的缩略图，**1 张通用**（三角色共用，37 项都用同一张） | 128×96 原图；图鉴缩略显示约 64×48（半尺寸，邻近采样），也可直接用 CSS 缩 | 墨蓝灰（#272d42 / #1d2336 两级）的人物剪影 + 居中大问号形图案（象牙灰 #8e8f9a）；背景 #161b2a；不画细节，不画文字 | `128x96 pixel art placeholder, a dark blue-gray silhouette of a chibi person with a big question mark shape in the center, muted dim palette, 6 colors max, 1px dark navy outline, flat shading, no anti-aliasing, no gradient, no text, mystery mood` |

对应的两种状态：

| 状态 | 图鉴行显示 |
|---|---|
| 未达成 | `ending-unknown` 缩略图 + “？？？” + “未达成”（隐藏结局仍显示“隐藏”小标签，不暴露标题） |
| 本局达成 | 该结局的缩略图（直接缩放 `ending-<id>`）+ 标题 + “本局达成” |

负面提示词：`anti-aliasing, blur, gradient, text, letters, bright colors, face details, watermark, logo, real person, 3d render, photo`。

## 6. 其他界面小素材

能用 CSS 做的就不画，省下来的时间给结局图。

| # | 素材 | 做法 | 尺寸 / 状态 | 说明与提示词 |
|---|---|---|---|---|
| 6.1 | 数值条的边框与填充 | **CSS 实现，不画图**。现有条是 8px 高圆角条 + 金色填充，危险时变红（`value <= 20 \|\| value >= 80`） | CSS：把圆角改成直角，2px 描边 #0a0d15 + 1px #3a4260，填充用 `repeating-linear-gradient` 做每 4px 一格的像素段；中点（50）加一条 1px 刻度线，让玩家看出“中间最安全” | 两头都危险：条的两端各加一个 4px 的红色刻度（0 端和 100 端），不改变现有规则。无需提示词 |
| 6.2 | “奇遇”标签的像素徽标（P1） | 画图，叠在卡面顶部居中，取代现有金色胶囊的边框（文字“奇遇”保留为真实文字，保证可访问性） | 48×16 原图（导出 96×32），1 个状态 | 琥珀金像素胶囊底，两端各一颗小星；底板留空放文字。`48x16 pixel art label plate in amber gold with a small star at each end, empty middle for text, 5 colors max, 1px dark navy outline, flat shading, no anti-aliasing, no gradient, transparent background, no text` |
| 6.3 | 回合计数装饰（P2） | 画图，放在页头“第 N 回合”文字旁；`MAX_TURNS = 40`，所以有“前期 / 后期”两个状态 | 16×16，2 个状态：`turn-deco-early`（第 1–30 回合）、`turn-deco-late`（第 31–40 回合，只给出“快到头了”的感觉，不显示剩余数字） | early：象牙色沙漏，上半满沙。late：同一沙漏，上半只剩一点，下半堆起小沙丘，沙色换成琥珀金。`16x16 pixel art icon of a small ivory hourglass with the upper half full of amber sand, 5 colors max, 1px dark navy outline, flat shading, no anti-aliasing, no gradient, transparent background, single centered object`（late 版把 “upper half full” 换成 “upper half almost empty, small sand pile below”） |
| 6.4 | “再来一局” / “同一角色再来一次”的像素边框 | **CSS 实现，不画图**。现有按钮是圆角 10px：主按钮金色渐变，次按钮透明描边 | CSS：改直角 + 阶梯状边框（用 `box-shadow` 叠 2px 方块模拟像素角）；hover 时亮度 +6%（现有）；focus 保留现有 2px 金色 outline，不要去掉 | 无需提示词。注意触控区高度仍 >= 46px，现有可访问性不能退步 |
| 6.5 | 影响提示点（已在 2.4） | 画图，4 个 | 8×8，每个 2 帧 | 见 2.4 |
| 6.6 | 页头角色小头像（P2） | 画图，把 `{emoji} {name}` 胶囊里的 emoji 换成 16×16 小头像，3 张（每个角色 1 张，neutral） | 16×16，导出 32×32；1 个状态 | 从对应的 64×64 头像缩画：保留“主色 + 标志道具”（基金经理 = 蓝领带，Web3 = 耳机，炒股达人 = 眼镜），不画五官细节。`16x16 pixel art mini head icon of a <fund manager with a blue tie / crypto player with headphones and cyan hoodie / veteran stock trader with round glasses and amber vest>, big head, simple dots for eyes, 6 colors max, 1px dark navy outline, flat shading, light from top-left, no anti-aliasing, no gradient, transparent background`（把尖括号里的三选一填进去） |

负面提示词（本节所有画图项）：`anti-aliasing, blur, gradient, soft shadow, semi-transparent, 3d render, photo, realistic, text, letters, numbers, watermark, logo, real person, pure black outline, dithering noise, thick outline`。

## 7. 工作量统计与优先级

### 7.1 总张数

| 类别 | 计算 | 张数 |
|---|---|---|
| 属性图标 | 4 槽位 × 3 角色 × 3 状态 | **36** |
| 影响提示小图标 | 4 个（每个 2 帧 = 8 个文件） | **4** |
| 角色头像 | 3 角色 × 3 表情 + 1 个“待开发”占位 | **10** |
| 结局插图 | 24 普通 + 9 专属特殊 + 5 通用特殊 | **38** |
| 其他 | 图鉴未达成占位 1 + 隐藏边框 / 角花 / 徽标 3 + 奇遇徽标 1 + 回合装饰 2 + 页头小头像 3 | **10** |
| **合计（基础）** |  | **98** |
| 可选 | 5 张通用结局 × 3 角色换色版 | +15 |

CSS 即可、不用画的：数值条边框与填充（6.1）、按钮像素边框（6.4）、结局页版式（第 5 节）。

### 7.2 优先级

| 档位 | 内容 | 张数 | 说明 |
|---|---|---|---|
| **P0** | 属性图标 36（normal / low / high）| 36 | 两头都是坏结局，low / high 两个警示态是玩法信息，不能省 |
|  | 影响提示 4 | 4 | 替换现有圆点 |
|  | 头像 neutral 3 + 待开发占位 1 | 4 | 选角页必须有；happy / worried 放 P1 |
|  | 24 个普通结局插图 | 24 | 能完整玩的最小集：每个角色每种结束方式都有图 |
|  | 图鉴未达成占位（`ending-unknown`） | 1 | 1 张通用 |
|  | **P0 小计** |  | **69** |
| **P1** | 9 个专属特殊结局 | 9 |  |
|  | 头像 happy / worried | 6 |  |
|  | 隐藏结局边框 / 角花 / 徽标 | 3 | 5.2 |
|  | 奇遇徽标 | 1 | 6.2 |
|  | **P1 小计** |  | **19** |
| **P2** | 5 个通用特殊结局基础图 | 5 | 缺图时前端回退为纯文字版，不影响通关 |
|  | 页头小头像 | 3 | 6.6 |
|  | 回合装饰 | 2 | 6.3 |
|  | **P2 小计** |  | **10** |
| 可选 | 通用结局换色版 | 15 | 用色板置换，不重画，单张几分钟 |
| **合计** |  |  | **69 + 19 + 10 = 98** |

P0 内部建议的出图顺序（先能看，再精致）：

1. P0-a：12 个 normal 图标 + 4 个影响提示 + 4 个头像（共 20）。属性条和选角页先换上。
2. P0-b：24 个 low / high 图标（共 24）。
3. P0-c：24 个普通结局 + 1 张未达成占位（共 25）。三个角色各一批，每批同时出成对的 low / high，方便对比。

提醒：`sp-survivor`（活到收盘）是走满 40 回合时的兜底结局，实际最容易遇到。它在 P2，建议一旦有余力就提前，否则玩得最久的玩家反而没有插图。见第 9 节。

## 8. 文件命名与目录建议

### 8.1 目录

```
frontend/src/reigns/assets/
├── icons/       属性图标 36 张 + 影响提示 8 帧 + 回合装饰 2 + 页头小头像 3
├── avatars/     角色头像 10 张
├── endings/     结局插图 38 张（+ 可选换色版 15）+ ending-unknown
└── ui/          隐藏结局边框 / 角花 / 徽标 3 + 奇遇徽标 1（风格圣经之外的界面小件，放这里不混进上面三个目录）
```

`ui/` 是本文新增的第四个目录，如不想增加目录，可把这 4 张放进 `icons/`，见第 9 节待确认。素材放仓库的 `frontend/` 下，符合 AGENTS.md 的目录分工；单张超过 30KB 要重新压缩，超过 10MB 不得提交。

### 8.2 命名规则

全部小写英文 + 连字符，与风格圣经的“小写英文 + 连字符 + 编号”一致。原图（1×）与导出图（放大）分文件夹或加后缀，避免同名混淆。

| 类别 | 命名 | 例子 |
|---|---|---|
| 属性图标 | `icon-<role>-<slot>-<state>.png` | `icon-crypto-risk-high.png` |
| 影响提示 | `hint-<slot>-<a\|b>.png` | `hint-capital-a.png` |
| 头像 | `avatar-<role>-<expr>.png`；占位 `avatar-locked.png` | `avatar-stock-worried.png` |
| 普通结局 | `ending-<id>.png`，`<id>` 就是代码里的 `Ending.id` | `ending-fund-low-capital.png` |
| 专属特殊结局 | `ending-<id>.png`，`<id>` 以 `sp-<role>-` 开头 | `ending-sp-crypto-moon.png` |
| 通用特殊结局 | `ending-sp-<key>.png`；换色 `ending-sp-<key>-<role>.png` | `ending-sp-balanced-stock.png` |
| 图鉴占位 | `ending-unknown.png` | |
| 页头小头像 | `icon-<role>-mini.png` | `icon-fund-mini.png` |
| 回合装饰 | `turn-deco-<early\|late>.png` | |
| 导出放大版 | 同名加后缀 `@2x`、`@3x`、`@5x`，最终接入时转 WebP | `icon-fund-capital-low@3x.webp` |

`<role>`：`fund` / `crypto` / `stock`。`<slot>`：`capital` / `risk` / `confidence` / `reputation`（等于代码里的 `StatKey`）。`<state>`：`normal` / `low` / `high`。`<expr>`：`neutral` / `happy` / `worried`。

注意：通用特殊结局代码里只有一个 id（如 `sp-inertia`），不分角色。文件名的角色后缀是素材层面的换色，不是新结局。

### 8.3 代码里需要的映射（只写结构，不写实现）

| 映射 | 键 → 值 | 用在哪里 | 回退 |
|---|---|---|---|
| 属性图标 | `(role, StatKey, state)` → 图标文件 | 属性条（`ReignsGame`）、结局页数字摘要 | 无图标时只显示文字（现状） |
| 状态判定 | 数值 → `normal / low / high`，阈值与现有的“变红”一致：`<= 20` 为 low，`>= 80` 为 high，否则 normal；建议复用 `ENDING_THRESHOLDS.low / high` 的数值，不要在界面里再写一遍 | 属性条 | |
| 影响提示 | `StatKey` → 提示图标（2 帧） | `previewEffects` 返回的键 | 现有 CSS 圆点 |
| 头像 | `(RoleId, expression)` → 头像文件；`'locked'` → 占位图 | `RoleSelect` | `ROLES[id].emoji` / `COMING_SOON_ROLE.emoji` |
| 结局插图 | `Ending.id` → 图片文件 | `EndingScreen`、图鉴 | 无图则不显示图片区域 |
| 通用结局换色 | `(Ending.id, RoleId)` → 换色图；缺省回退基础图 | `EndingScreen` | 基础图，再无则无图 |
| 图鉴 | 未达成 → `ending-unknown`；达成 → 该结局图缩略 | 图鉴列表 | 现有“？？？” |
| 预加载 | 进入结局页前，只加载本局 `Ending.id` 对应一张；图鉴缩略图用同一张，不额外请求其他 37 张（防剧透，也省流量） | | |

图片 `alt`：装饰性图标（旁边已有文字名）`alt=""`；结局插图 `alt` 用标题；影响提示点保持现有 `aria-hidden`。

### 8.4 验收清单

每张素材交付前，自己对一遍：

| 项 | 属性图标 | 影响提示 | 头像 | 结局插图 | 边框 / 徽标 / 其他 |
|---|---|---|---|---|---|
| 原图尺寸 | 16×16 | 8×8 | 64×64 | 128×96 | 按第 5、6 节 |
| 放大后 | 32×32 与 48×48 | 16×16 | 320×320 | 384×288 | 整数倍 |
| 单张色数 | <= 6 | <= 3 | <= 16 | <= 16 | <= 6 |
| 描边 | 1px #0a0d15，无纯黑，无内部描边 | 同左 | 同左 | 同左 | 同左 |
| 光源 | 左上，阴影同色系暗一级 | | 同左 | 同左 | |
| 抗锯齿 / 渐变 / 半透明 | 全部没有 | | | | |
| 背景 | 透明 PNG | 透明 PNG | 单色块 + 最多 2 个装饰块，另导出一份透明背景 | 满铺场景 | 透明 |
| 文字、数字、真实 logo、真人 | 没有 | | | 没有（公告、短信都用色块） | |
| 状态完整 | 每个 id 有 normal / low / high 三张；low 与 high 的**轮廓**也不同 | 4 个都有 a / b 两帧 | 每角色 3 个表情，脸型与服饰不变 | 38 张齐全，标题与 `endings.ts` 一致 | |
| 命名 | 符合 8.2 | | | `<id>` 与代码 `Ending.id` 逐字一致 | |
| 体积 | 转 WebP 后 <= 30KB | | | | |
| 缩到 32×32 实拍 | 仍能认出隐喻 | | | | |
| 看起来 | 把 12 个图标放一排，同一角色风格一致，三个角色色相可区分 | | 三个头像放一排，看得出是同一个画风 | 同一角色 8 张放一排，色调统一 | |
| 来源 | PR 描述里注明工具与日期（AGENTS.md 第 5 节）；标注示例素材 | | | | |

## 9. 待确认（需要人工决定）

| # | 问题 | 倾向 |
|---|---|---|
| 1 | 涨跌色是否按风格圣经的“红涨绿跌”？图标里钞票用绿、K 线涨用红，可能让部分玩家混淆 | 沿用圣经；钞票改为金色纸币也可以，需要美术看效果 |
| 2 | `crypto-risk` 的 high 画成“满得发闷的罐子”是否被理解为“好事”？这个槽位的 high 含义是“仓位太轻” | 画面里加金色封条，并在 `highHint` 的提示里对照看；需要用 3–5 个玩家测一下 |
| 3 | 图标 low / high 的触发线用 `<= 20 / >= 80` 还是只在接近极端时（如 <= 10 / >= 90）才变 | 先与现有“变红”一致（20 / 80），测试后再调 |
| 4 | `sp-survivor`（活到收盘）、`sp-balanced` 是否提前到 P1？它们是走满 40 回合的主要结局 | 建议至少把 `sp-survivor` 提到 P1 |
| 5 | 通用结局 5 张是否需要三个角色的换色版（+15） | 先做基础图，看反馈 |
| 6 | 头像的 happy / worried 在界面里怎么用？目前选角页只用 neutral | 悬停 / 聚焦用 happy；worried 可用在页头（属性接近危险时）。若不打算用，P1 的 6 张可以砍 |
| 7 | `ui/` 新目录是否接受，还是并入 `icons/` | 倾向并入 `icons/`，少一个目录 |
| 8 | 谁来出图：美术手画，还是 AI 生图 + 人工修像素？AI 生图的素材要在 PR 描述里披露工具与日期 | 需要负责人决定 |
| 9 | 结局图里有“爆仓”“清算”“墓碑”等题材，是否需要再软化（比如把墓碑换成路牌）？当前原则是荒诞幽默、不写实 | 先按现稿，评审时再看 |
| 10 | 结局图尺寸 384×288 在窄屏（<384px）上等比缩小后是否仍清晰；是否改为 256×192（2×）作为窄屏备选 | 建议同时导出 2× 版 |
| 11 | 属性图标放在属性名的左边还是上方？当前一行 4 列（每列约 70–100px 宽），图标 32×32 + 名称较紧凑 | 放上方、居中，名称在图标下 |
| 12 | 本文标题以 `endings.ts` 当前文案为准；若策划改标题，文件名不变（用 id），只需改本文标题列 | 沿用 id 命名 |

