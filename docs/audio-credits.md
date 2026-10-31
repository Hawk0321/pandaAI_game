# 音频素材致谢

本项目使用的所有音频素材均为 CC0（公共领域）许可，可用于商业和参赛作品并再分发。以下列出所有素材作者和来源。

## 音效（SFX）

**Juhani Junkala** — The Essential Retro Video Game Sound Effects Collection  
- 许可: CC0 Public Domain  
- 来源: https://opengameart.org/content/512-sound-effects-8-bit-style  
- 作者主页: https://www.youtube.com/watch?v=dbACpSy9FWY  
- 联系: juhani.junkala@musician.org  
- 使用素材: 8 个 P0 音效（卡牌操作、按钮、警告、最终撞击）

## 背景音乐（BGM）

所有 BGM 来自 OpenGameArt.org，作者如下：

### Zane Little Music
- 许可: CC0
- 来源: https://opengameart.org/users/zane-little-music
- 使用曲目: **Flowerbed Fields** (选角页 BGM)

### congusbongus
- 许可: CC0
- 来源: https://opengameart.org/users/congusbongus
- 使用曲目:
  - **Midnight Drive** (Web3 玩家游戏中 BGM)
  - **Lasso Lady** (炒股达人紧张层 BGM)

### Scribe (Daniel Stephens)
- 许可: CC0
- 来源: https://opengameart.org/users/scribe
- 使用曲目: **Summer Park** (炒股达人游戏中 BGM)

### gmason
- 许可: CC0
- 来源: https://opengameart.org/users/gmason
- 使用曲目: **Tense Future Loop** (Web3 玩家紧张层 BGM)

### HydroGene
- 许可: CC0
- 来源: https://opengameart.org/users/hydrogene
- 使用曲目: **8-bit Truth** (结局页 BGM)

### Never Sleep
- 许可: CC-BY 3.0 / CC-BY 4.0 / CC0 (作者三选一，本项目选择 CC0)
- 来源: https://opengameart.org/content/eyeless-retrowave
- 使用曲目: **Eyeless (Retrowave)** (基金经理游戏中 BGM)

### bertsz
- 许可: CC0
- 来源: https://opengameart.org/content/heavy-heist
- 使用曲目: **Heavy Heist** (基金经理紧张层 BGM)

---

## 关于 CC0

以上所有素材采用 **CC0 1.0 Universal (CC0 1.0) Public Domain Dedication**，作者放弃版权，任何人可以自由使用、修改、分发，用于任何目的（包括商业用途），无需许可或署名。

虽然 CC0 不要求署名，但我们仍在此列出所有作者姓名，以表感谢。

详见 CC0 法律文本: https://creativecommons.org/publicdomain/zero/1.0/

---

## 文件清单

### 音效（`public/audio/sfx/`，OGG + MP3 回退）
- `sfx-card-grab` 拿起卡牌 · `sfx-card-left` / `sfx-card-right` 左右滑确认 · `sfx-card-enter` 新卡进入
- `sfx-stat-danger` 属性进入危险区 · `sfx-final-low` / `sfx-final-high` 触底 / 爆满的最终撞击
- `sfx-btn-click` 按钮 · `sfx-role-confirm` 选角确认 · `sfx-restart` 再来一局
- `sfx-secret-unlock` 隐藏结局 · `sfx-persona-flip` 人格卡翻出

### BGM（`public/audio/`，OGG Opus）
| 文件 | 曲目 | 作者 | 许可 |
|---|---|---|---|
| `bgm-select` | Flowerbed Fields | Zane Little Music | CC0 |
| `bgm-play-fund-safe` | Eyeless (Retrowave) | Never Sleep | CC0（作者三选一：CC-BY 3.0 / 4.0 / CC0，本项目选 CC0） |
| `bgm-play-fund-tense` | Heavy Heist | bertsz | CC0 |
| `bgm-play-crypto-safe` | Midnight Drive | congusbongus | CC0 |
| `bgm-play-crypto-tense` | Tense Future Loop | gmason | CC0 |
| `bgm-play-stock-safe` | Summer Park (8bit tune) | Scribe | CC0 |
| `bgm-play-stock-tense` | Lasso Lady | congusbongus | CC0 |
| `bgm-ending-idle` | 8-bit Truth | HydroGene | CC0 |

许可于 2026-10-31 逐首读取 OpenGameArt 来源页的 license 字段核实。处理：统一响度（BGM 约 -16 LUFS，结局页 -18 LUFS）、
转码为 Opus、个别曲目压缩以满足单曲 ≤ 1.5MB；未改动旋律。

---

*最后更新: 2026-10-31*
