# 生成记录（示例素材）

- 生成日期：2026-10-31
- 模型：`gpt-image-2.5`，OpenAI 兼容 Images API；密钥未写入仓库。
- 输出：`1024x1024` PNG，`medium`，每个素材 1 张构图母版。
- 后期：`pixelate.py` 缩为 64×64，映射至全局 32 色色板，单图最多 16 色；
  低频色合并。尚未人工逐像素修图，正式批量接入前需按清单验收。

| 素材 | 提示词摘要 | 状态 |
|---|---|---|
| `avatar-fund-neutral` | 基金经理，深色西装、蓝领带、空白工牌、短发、蓝紫办公室、平静 | 像素样张 |
| `avatar-crypto-neutral` | Web3 玩家，青色连帽衫、耳机、蓬松短发、夜色青色头像框、半眯眼 | 像素样张 |
| `avatar-stock-neutral` | 炒股达人，琥珀马甲、老花镜、中分稀疏发、保温杯、暖色窗格、平静 | 像素样张 |
| `npc-friend-neutral` | 中性穿搭朋友，短发、休闲夹克、抽象消息块手机、蓝紫点缀、友好 | 像素样张 |

完整提示词见 `docs/reigns-assets/01-event-card-characters.md` 与
`docs/reigns-assets/02-icons-and-endings.md`。此次只交付风格样张，未接入前端。
