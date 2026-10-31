# 滑牌游戏音乐与音效规划（BGM / Stinger / SFX / 接入规则）

> 这是规划文档，不是实现：不含音频文件，也不含代码。风格以 [00-style-bible.md](./00-style-bible.md) 为准（像素大头人、有限色板、原创虚构），音乐用芯片音乐（chiptune）与之呼应。
> 对象读者：做音频的同学、用 AI 作曲/音效工具的人（Suno、Udio、ElevenLabs Sound Effects、sfxr/jsfxr 等），以及负责接入代码的 AI 助手。
> 写文档时仓库里没有任何音频代码；界面状态与触发点都是读 `frontend/src/reigns/` 下的 `ReignsGame.tsx`、`RoleSelect.tsx`、`EndingScreen.tsx`、`PersonaReveal.tsx`、`roles.ts`、`endings.ts`、`types.ts` 得到的。

## 1. 怎么用这份文档

### 1.1 术语

| 术语 | 含义 | 本项目里的例子 |
|---|---|---|
| BGM | 循环背景乐，可无缝循环，几十秒一圈 | 选角页音乐、三个角色的游戏中音乐 |
| Stinger | 几秒的短乐句，播一次，不循环，通常压低 BGM 再播 | 奇遇卡出现、结局揭晓、人格卡揭晓 |
| SFX | 音效，0.05–1.5 秒的短声，对应一个操作或反馈 | 卡牌拿起、左右滑确认、点按钮 |
| Ambience | 环境音，长时间铺底的非旋律声音 | 本期不做独立素材，用 `bgm-ending-idle` 里的低强度循环承担 |
| Layer（层） | 与某首 BGM 同速同调同长度、可叠加的声部 | 每个角色的 `tension`（紧张）层 |

### 1.2 怎么读

- 做音频的人：先读第 2 节（硬性约束），再按第 3、4 节的表逐条做，每条的提示词可以直接复制；做完对照第 7.3 节验收。
- 接入代码的 AI：读第 5 节（规则与接口）和第 3.4 节（紧张层），素材清单里的 `id` 就是代码里的 key。
- 排期的人：看第 6 节（优先级与数量）和第 8 节（待确认）。

### 1.3 写提示词的统一规矩

- 提示词一律英文，整段复制即可；每条都带风格、BPM、调性、乐器、时长、是否可循环、`no vocals`。
- 提示词里不要出现任何游戏名、作曲家名、乐队名、品牌名（风格圣经要求原创，不得模仿现有作品）。
- 用 Suno 时：“Style” 栏放提示词，“Exclude styles” 栏放负面提示词，选 Instrumental。用 Udio 时：把提示词放进 prompt，没有负面栏就把负面词改写成 `no ...` 接在后面。用 ElevenLabs：音效提示词直接粘贴，时长在界面里手动设。
- AI 工具给不出精确的 BPM 和小节数，所以出稿后一律在音频编辑器里（Audacity、Reaper 等）按第 2.3 节整理。

## 2. 总体音乐方向与技术约束

### 2.1 音乐方向

- 底子：8-bit / 16-bit 复古芯片音乐（chiptune），按 NES 的四通道思路写：2 个方波（Pulse，主旋律与琶音）+ 1 个三角波（Triangle，低音）+ 1 个噪声（Noise，镲和军鼓）；鼓点用“三角波下扫 + 噪声”做底鼓。选角页和结局页可加少量延迟/混响，带一点 16-bit 的层次。
- 气质：与“像素大头人”一样，圆润、有手作感、不写实；但交易场景要有一点紧张感：用持续的低音踏板（A 或 E）、密集的 16 分音符、小二度上行来做，不用写实乐器、人声或大场面管弦。
- 三个角色靠音色与节奏型区分，不靠换速度换调性：基金经理 = 克制、办公室、冷色合成；Web3 = 夜间、电子、略迷幻；炒股达人 = 市井、轻快、带烟火气。
- 所有素材原创，提示词里不写任何游戏名、作曲家、乐队、品牌。

### 2.2 统一速度与调性（让曲目能无缝过渡）

| 项 | 规定 | 理由 |
|---|---|---|
| 基准速度 | 所有 BGM、Stinger 统一 **100 BPM**，4/4 拍 | 全部曲目共用同一个节拍网格，切曲、叠层都不会错拍。1 拍 = 0.6 秒，1 小节 = 2.4 秒 |
| 调性 | 选角页与炒股达人用 **C 大调**，基金经理与 Web3 用 **A 小调**；紧张层统一 A 小调 | A 小调与 C 大调是关系大小调，用的是同一组音（全是白键），互相交叉淡入不冲突 |
| 音高约束 | 旋律只用自然音阶（无升降号）；Stinger 与音效里的有音高声音只用 **A 小调五声音阶：A C D E G** | 五声音阶同时属于 A 小调和 C 大调，叠在任何 BGM 上都不会不和谐 |
| 例外 | 紧张层可用 G#、Bb 做不超过 1 拍的经过音，且只出现在紧张层 | 紧张感来源于这点“不对劲”，别的素材不要用 |
| 循环长度 | 游戏中 BGM 与紧张层 = **16 小节 = 38.400 秒**；选角页同样 16 小节；结局页低强度循环 = **8 小节 = 19.200 秒** | 长度是整数小节，且 44.1 kHz 下恰好是整数采样（16 小节 = 1,693,440 采样），便于无缝循环；16 小节也让内存占用小（解码后约 13.5 MB/首） |
| 小节长度参考 | 1 小节 2.4 s，2 小节 4.8 s，4 小节 9.6 s | 做 Stinger 时长时直接对齐 |

### 2.3 格式、响度、循环点

| 项 | 规定 |
|---|---|
| 母带（不提交仓库） | 44.1 kHz，16 bit，WAV；BGM 立体声（需兼容单声道播放，不能抵消），SFX 单声道 |
| 提交格式 | **OGG Vorbis（约 q4 / 128 kbps）为主 + MP3（CBR 128 kbps）回退**，同名不同后缀 |
| 体积上限 | BGM 单曲 ≤ 1.5 MB（16 小节 128 kbps 约 0.6 MB，紧张层 96 kbps 约 0.45 MB）；SFX ≤ 50 KB；Stinger ≤ 150 KB（≤ 6 秒）；人格短动机按 SFX 算，≤ 50 KB |
| 响度（用 LUFS 表测） | BGM 积分响度 **-16 LUFS**；Stinger **-14 LUFS**；SFX **-12 LUFS**；点击、悬停、拖动刻度这类高频小声音再低 6 dB。真峰值（true peak）一律 ≤ -1 dBTP；不足 1 秒的音效 LUFS 表读数不稳，以峰值 -3 dBFS 为准再微调 |
| 声音干净 | 不要有直流偏移、爆音；开头静音 ≤ 10 ms；SFX 尾部在 ≤ 20 ms 内自然衰减到零 |
| 循环点 | 母带必须在 DAW 里按“循环渲染”导出：混响和延迟的尾巴要折回到开头，首尾采样值接近 0；总长必须刚好是第 2.2 节的采样数（±0 采样）。验收时把循环连放 3 遍，听不出接缝和节拍跳动 |
| 叠层 | 紧张层与对应安全层同长度、同起点、同速度，可以同时开始播放后只调音量 |
| AI 出稿后的处理 | AI 作曲工具给不出精确 BPM 与小节数：一律先出 60 秒以上的草稿，在 Audacity / Reaper 等软件里拉到 100.000 BPM、对齐下拍、切出 16 小节、做循环渲染，再按本节导出。对不齐的紧张层，改用 BeepBox 之类的网页芯片编曲工具手写（节拍天然精确），许可见第 7.2 节 |

## 3. 音乐清单（BGM 与 Stinger）

### 3.1 界面状态与音乐的对应（读代码得到）

| 状态 | 代码依据 | 音乐 |
|---|---|---|
| 选角页 | `game === null`，渲染 `RoleSelect`（三个角色 + 灰色“待开发”卡） | `bgm-select` |
| 游戏中 | `game` 非空且 `game.ending === null`，渲染卡牌与四条数值条 | `bgm-play-<角色>-safe`，进入危险区叠加 `bgm-play-<角色>-tense` |
| 奇遇卡出现 | `card.adventure` 有值（卡面显示“奇遇”小标签） | `stg-adventure` |
| 结局页 | `game.ending` 非空，渲染 `EndingScreen` | 先 `sfx-final-*` / `stg-ending-*`，再 `bgm-ending-idle` |
| 人格卡揭晓 | 结局页内的 `PersonaReveal`（页内一块，没有单独页面） | `stg-persona-reveal` |
| 引流卡 | 结局页内的 `reigns-refs` 区块 | 不单独配乐，沿用 `bgm-ending-idle` |

结局类型与 `Ending.kind` 的对应（见 `endings.ts`）：

| `kind` | 含义 | 例子 | 用哪段 stinger |
|---|---|---|---|
| `low` | 某条数值触底（到 0） | 清盘通知、空钱包、爆仓离场 | `stg-ending-low` |
| `high` | 某条数值爆满（到 100） | 规模失控、天选之子、被捧上神坛 | `stg-ending-high` |
| `special` | 角色专属中途特殊结局 + 通用“惯性思维” | 明星基金经理的倒计时、登月成功、套牢信徒 | `stg-ending-special` |
| `survive` | 走满 `MAX_TURNS`（40）回合的结局 | 活到收盘、稳如磐石、偏执专家、行情亲历者 | `stg-ending-calm` |

注意：`special: true` 的结局包含 `special` 和 `survive` 两类（界面都会显示“隐藏结局”徽章）。选 stinger 看 `kind`，不看 `special`；`sfx-secret-unlock` 的触发条件见 3.5 节与 4.1 节。

### 3.2 BGM 与 Stinger 总表（不含提示词，提示词在 3.3 节同 id 一行）

所有时长按 100 BPM 计：1 小节 = 2.4 秒。“强度分层”一栏说明同一首曲子怎么拆层。

| id | 用在哪 | 时长 / 循环 | 情绪 | 速度 / 调性 | 主要乐器（芯片通道） | 强度分层建议 |
|---|---|---|---|---|---|---|
| `bgm-select` | 选角页；从结局页“再来一局”回来时 | 16 小节 = 38.4 s，循环 | 好奇、轻松、有点期待 | 100 BPM / C 大调 | 方波 25% 占空比做琶音主旋律；三角波走低音；噪声做轻镲；16-bit 风格铃音垫底 | 单层。末尾落在属和弦，让玩家有“该选了”的感觉 |
| `bgm-play-fund-safe` | 基金经理游戏中，无属性在危险区 | 16 小节 = 38.4 s，循环 | 克制、冷静、办公室 | 100 BPM / A 小调 | 窄方波（12.5%）稀疏主旋律；50% 方波长音和弦垫；三角波低音每小节只打 1、3 拍；噪声做每 2 拍一次的“钟摆”轻点 | 安全层是完整曲子（低音 + 和弦 + 稀疏主旋律），响度 -16 LUFS |
| `bgm-play-fund-tense` | 基金经理，任一属性 ≤ 20 或 ≥ 80 | 16 小节 = 38.4 s，循环，**叠加用**（只含新增声部） | 压迫、倒数、冷汗 | 100 BPM / A 小调 | 方波 8 分音符低音（A 持续音）；噪声 16 分镲；高音方波持续颤音（E）；偶尔 G# 经过音 | 与 safe 同起点播放，只调音量；单独听不成曲，响度按叠加后 -16 LUFS 调 |
| `bgm-play-crypto-safe` | Web3 游戏中，安全 | 16 小节 = 38.4 s，循环 | 夜间、电子、略迷幻、漂浮 | 100 BPM / A 小调 | 方波琶音带慢颤音（vibrato）和回声；三角波低音；三角波下扫做轻底鼓（4 拍）；噪声镲；偶尔“故障”短音 | 同上，完整曲子 |
| `bgm-play-crypto-tense` | Web3，危险 | 同上，叠加用 | 心跳加速、清算前夜 | 100 BPM / A 小调 | 方波断奏 16 分低音；上升音高扫频；位深压缩（bitcrush）感的噪声碎拍；高音方波闪烁 | 同上 |
| `bgm-play-stock-safe` | 炒股达人游戏中，安全 | 16 小节 = 38.4 s，循环 | 市井、轻快、烟火气 | 100 BPM / C 大调 | 方波 25% 拨弦感主旋律（五声音阶，民谣味但不模仿具体乐器）；三角波蹦跳低音；噪声军鼓在 2、4 拍；木块/算盘般的短“嗒”声 | 同上，完整曲子，轻微摇摆（shuffle）感 |
| `bgm-play-stock-tense` | 炒股达人，危险 | 同上，叠加用 | 盯盘、手心出汗 | 100 BPM / A 小调（叠在 C 大调之上，低音踩 A） | 三角波 + 方波 A 持续低音；噪声 16 分镲；方波颤音；算盘“嗒”声加密一倍 | 同上 |
| `bgm-ending-idle` | 结局页停留；也覆盖引流卡区块 | 8 小节 = 19.2 s，循环 | 平静、复盘、留白 | 100 BPM / A 小调与 C 大调通用（只用 A C D E G） | 三角波长音；方波 12.5% 稀疏单音（每两拍一个）；极轻的噪声镲；少量延迟 | 单层，**低强度**：响度比其他 BGM 再低 4 dB（-20 LUFS），不盖过阅读 |
| `stg-adventure` | 奇遇卡出现时（卡面“奇遇”标签亮起） | 2.4 s（1 小节），不循环 | 好奇、“真实行情来了” | 100 BPM / A 小调五声 | 方波琶音上行（A C E A）+ 一个三角波长音 + 极短噪声“扫过” | 播放时 BGM 压低 6 dB；见 5.5 节冷却规则 |
| `stg-ending-low` | 结局类型 `low`（触底） | 4.8 s（2 小节），不循环 | 失落、坠落、认命 | 100 BPM / A 小调 | 三角波四音下行（E D C A）；方波慢速下滑；噪声尾音 | 在 `sfx-final-low` 之后约 0.6 s 开始 |
| `stg-ending-high` | 结局类型 `high`（爆满） | 4.8 s，不循环 | 先飘起来，再“啵”地破掉的讽刺感 | 100 BPM / C 大调转 A 小调 | 方波快速上行琶音（C E G A）冲顶后，三角波失准般下沉；噪声“泄气” | 在 `sfx-final-high` 之后约 0.6 s 开始 |
| `stg-ending-special` | 结局类型 `special`（隐藏结局，含惯性思维） | 4.8 s，不循环 | 惊喜、有点黑色幽默、“居然还有这个” | 100 BPM / C 大调 | 方波 + 三角波的明亮和弦琶音；铃音点缀；末尾一个问号式上扬 | 与 `sfx-secret-unlock` 错开：先 stinger，0.3 s 后解锁音 |
| `stg-ending-calm` | 结局类型 `survive`（走满回合） | 4.8 s，不循环 | 平静、松一口气、安稳收盘 | 100 BPM / C 大调 | 三角波暖和弦；方波柔和三音上行；很轻的噪声镲收尾 | 结束后淡入 `bgm-ending-idle` |
| `stg-persona-reveal` | `PersonaReveal` 首次进入视口 | 3.6 s（6 拍），不循环 | 揭晓、可爱、小小的惊喜 | 100 BPM / C 大调 | 铃音 + 方波闪烁上行；三角波一个暖和弦；以“叮”收尾 | 若结局 stinger 还在播，排队等它结束 |
| `mot-persona-<id>`（9 条，见 3.5） | 同上，叠在 `stg-persona-reveal` 后面或替代它 | 1.2–2.0 s | 每种人格一个小动机 | A 小调五声 | 单个方波 + 三角波 | **P2** |

### 3.3 可直接复制的 AI 作曲提示词

使用方法：整段复制“提示词”到 Suno / Udio 的风格栏，复制“负面提示词”到排除栏（Udio 无排除栏就接在提示词末尾，把逗号分隔的词各加 `no `）。每首建议出 4–6 个版本挑一个。后期统一按 2.3 节整理。时长栏是**最终成品**的目标；AI 常出得更长，剪到目标长度即可。

| id | 提示词（英文，可直接复制） | 负面提示词 |
|---|---|---|
| `bgm-select` | `8-bit chiptune, instrumental, loopable game menu theme, 100 BPM, C major, bright pulse-wave arpeggio melody (25% duty), triangle-wave bass, light noise hi-hat, playful and curious with a hint of anticipation, cute retro handheld console sound, 16 bars, seamless loop, no vocals` | `vocals, lyrics, choir, realistic drums, orchestral, guitar, piano, heavy distortion, fade-out ending, long intro` |
| `bgm-play-fund-safe` | `restrained chiptune, instrumental, loopable office ambience theme, 100 BPM, A minor, sparse narrow pulse-wave melody (12.5% duty), sustained cool synth pad chords, triangle bass on beats 1 and 3, soft noise tick like a pendulum clock, cold blue corporate mood, calm and controlled, 16 bars, seamless loop, no vocals` | `vocals, lyrics, big drums, EDM drop, orchestral strings, guitar, warm acoustic sound, fast tempo, fade-out ending` |
| `bgm-play-fund-tense` | `chiptune tension layer, instrumental, 100 BPM, A minor, relentless eighth-note pulse-wave bass on a low A pedal, fast sixteenth-note noise hi-hat, high pulse-wave tremolo on E, occasional chromatic G sharp passing note, countdown feeling, cold office pressure, sparse melody, 16 bars, seamless loop, no vocals` | `vocals, lyrics, orchestral, cinematic hits, horror screams, guitar, big drops, tempo change, fade-out ending` |
| `bgm-play-crypto-safe` | `night-time chiptune synthwave, instrumental, loopable game theme, 100 BPM, A minor, pulse-wave arpeggio with slow vibrato and echo, triangle bass, soft pitch-sweep kick on every beat, light noise hi-hat, dreamy neon late-night trading mood, slightly psychedelic, a few glitchy bitcrushed blips, 16 bars, seamless loop, no vocals` | `vocals, lyrics, realistic drums, orchestral, guitar, piano, harsh dubstep, cheesy 80s saxophone, fade-out ending` |
| `bgm-play-crypto-tense` | `chiptune tension layer, instrumental, 100 BPM, A minor, staccato sixteenth-note pulse-wave bass, rising pitch sweeps, bitcrushed noise fills, flickering high pulse-wave notes, heartbeat kick, liquidation-night anxiety, electronic and slightly psychedelic, 16 bars, seamless loop, no vocals` | `vocals, lyrics, orchestral, cinematic trailer, guitar, piano, tempo change, long reverb tail, fade-out ending` |
| `bgm-play-stock-safe` | `cheerful chiptune with a folk-market flavor, instrumental, loopable game theme, 100 BPM, C major, pentatonic plucked-sounding pulse-wave melody (25% duty), bouncy triangle bass, light shuffle feel, noise snare on beats 2 and 4, small wooden click percussion like an abacus, lively street-market warmth, warm amber mood, 16 bars, seamless loop, no vocals` | `vocals, lyrics, realistic folk instruments, orchestral, electric guitar, heavy bass, EDM, dark mood, fade-out ending` |
| `bgm-play-stock-tense` | `chiptune tension layer, instrumental, 100 BPM, A minor, sustained low A in triangle and pulse wave, fast sixteenth-note noise hi-hat, pulse-wave tremolo, doubled-speed wooden click percussion, screen-watching nerves, sweaty palms, sparse melody, 16 bars, seamless loop, no vocals` | `vocals, lyrics, orchestral, horror, guitar, big drops, tempo change, fade-out ending` |
| `bgm-ending-idle` | `minimal chiptune ambient, instrumental, very low intensity, 100 BPM, A minor pentatonic (A C D E G), long soft triangle-wave notes, sparse single pulse-wave notes every two beats, faint noise hi-hat, light delay, quiet reflective mood after a game, 8 bars, seamless loop, no vocals` | `vocals, lyrics, drums, bass drop, melody that is too busy, orchestral, piano, guitar, fade-out ending` |
| `stg-adventure` | `chiptune stinger, 1 bar, 2.4 seconds, 100 BPM, A minor pentatonic, quick rising pulse-wave arpeggio A C E A, one triangle-wave sustain, tiny noise sweep, curious and slightly mysterious, event discovery jingle, ends clean, no vocals` | `vocals, long reverb tail, orchestral, melody over 2.5 seconds, fade-out` |
| `stg-ending-low` | `sad chiptune stinger, 2 bars, 4.8 seconds, 100 BPM, A minor, slow descending four-note triangle-wave line E D C A, pulse-wave pitch slide down, fading noise tail, defeat and resignation, game over jingle, not dramatic, ends clean, no vocals` | `vocals, orchestral, cinematic, loud impact, horror, long reverb tail, rising melody` |
| `stg-ending-high` | `ironic chiptune stinger, 2 bars, 4.8 seconds, 100 BPM, C major into A minor, fast rising pulse-wave arpeggio C E G A, then a triangle-wave note that sags out of tune, noise deflation hiss like a balloon, rise then pop, darkly funny, ends clean, no vocals` | `vocals, orchestral, cinematic, triumphant fanfare that stays happy, long reverb tail` |
| `stg-ending-special` | `bright chiptune stinger, 2 bars, 4.8 seconds, 100 BPM, C major, sparkling pulse-wave and triangle-wave chord arpeggio, bell-like bleeps, ends on an upward question-mark phrase, surprise secret unlocked, playful, ends clean, no vocals` | `vocals, orchestral, cinematic, dark mood, long reverb tail, fade-out` |
| `stg-ending-calm` | `gentle chiptune stinger, 2 bars, 4.8 seconds, 100 BPM, C major, warm triangle-wave chord, soft three-note rising pulse-wave phrase, very light noise hi-hat to close, relief and calm, market closing bell mood, ends clean, no vocals` | `vocals, orchestral, big drums, dramatic, sad mood, long reverb tail, fade-out` |
| `stg-persona-reveal` | `cute chiptune reveal stinger, 6 beats, 3.6 seconds, 100 BPM, C major, bell-like bleeps and fast pulse-wave sparkle rising, one warm triangle-wave chord, final bright ding, character reveal, charming, ends clean, no vocals` | `vocals, orchestral, dark mood, long reverb tail, harsh noise, fade-out` |

### 3.4 紧张层规则（BGM 的“安全 / 紧张”两层）

**触发条件（与 `ReignsGame.tsx` 和 `endings.ts` 对齐，已读代码确认）**

- 数值条变红的判定在 `ReignsGame.tsx`：`const low = value <= 20 || value >= 80`（变量名叫 `low`，实际两头都算）。
- 结局阈值在 `endings.ts` 的 `ENDING_THRESHOLDS`：`low: 20`、`high: 80`。**音频的紧张判定与它们保持同一组数字，不要写第二份常量**：接入时直接 `import { ENDING_THRESHOLDS }`，用 `stat <= ENDING_THRESHOLDS.low || stat >= ENDING_THRESHOLDS.high`；这样以后调参，画面、结局、音乐会一起变。
- 注意 `riskLow = 25` 只在个别专属结局里用，**不**作为紧张层的触发条件。
- 紧张级别 `setTension(level)`：`0` = 安全（四条都在 21–79）；`1` = 紧张（任一条 ≤ 20 或 ≥ 80）；`2` = 极危（任一条 ≤ 10 或 ≥ 90，可选，P2）。级别 2 不另配素材，只把紧张层音量推到最大并加快淡入。
- 判定时机：每次 `choose()` 返回新状态后，用 `game.stats` 重新算一次。不要在拖动过程中切换（拖动时 `previewEffects` 只预览，数值还没变）。

**交叉淡入规则**

| 规则 | 数值 |
|---|---|
| 同步 | 进入游戏中（`start(role)`）时，`safe` 与 `tense` **同一时刻**用同一个 AudioContext 时间戳开始播放并一直循环，两者都在播，只调音量，所以永远对拍 |
| 安全态音量 | safe = 1.0，tense = 0 |
| 进入紧张（0→1） | 从当前时刻起 **2 拍（1.2 s）** 内，tense 0→1.0，safe 1.0→0.55（不要完全静音，保留旋律）；曲线用等功率 / 指数斜坡 |
| 回到安全（1→0） | **4 拍（2.4 s）** 内恢复，慢一点避免来回抖；至少在紧张态停留 **4 小节（9.6 s）** 后才允许回落，防止数值在 20 附近来回跳时音乐频繁切换 |
| 极危（2，P2） | tense 推到 1.0 且 safe 降到 0.35 |
| 结局来临 | 一旦出现结局，safe 与 tense 都在 0.3 s 内淡出到 0（让最终撞击音干净），然后播结局 stinger |
| 内存提示 | 一次只加载当前角色的 safe + tense 两条；选角页回来时释放。解码后每条约 13.5 MB（立体声 32 位浮点）。紧张层可做成单声道以省一半内存 |

### 3.5 角色区分、结局区分与人格动机的建议

| 问题 | 建议 | 理由 |
|---|---|---|
| 三个角色的结局 stinger 要不要分开 | **不分**。4 个结局类型各 1 条，三个角色共用（共 4 条）。角色感由紧接着的 UI（人物名、主题色）和游戏中 BGM 承担，结局音乐本身不再分 | 结局只有几秒，听众记住的是“好 / 坏 / 隐藏 / 平静”这一级信息，而不是角色；分开会让 stinger 从 4 条涨到 12 条，性价比低。**P2 可选**：每个角色给 `stg-ending-*` 换一个主音色（基金经理偏冷合成、Web3 偏电子、炒股达人偏木块），用同一旋律重渲染 |
| 好 / 坏结局怎么区分 | 看 `kind`（见 3.1），不看“爆满是不是好事” | 在本游戏里 `high`（爆满）也是坏事，旁白已经说明（“期望过载”“提款机幻觉”），所以音乐给的是**讽刺的“飘起来再破掉”**，不是胜利号角；真正“好”的是 `special` |
| `survive` 里的“稳如磐石”等是不是都用平静 stinger | 是，统一 `stg-ending-calm` | 它们都在 `GENERIC_ENDINGS`，且 `kind` 都是 `survive`；“行情亲历者”“偏执专家”虽然带隐藏徽章，但情绪仍是走完全程，用 calm 更贴切 |
| 隐藏徽章（`ending.special === true`）与 stinger 的关系 | `survive` 类即使带徽章也播 calm，**不**追加解锁音；只有 `kind === 'special'` 才叠 `sfx-secret-unlock` | 避免“平静收盘”和“惊喜彩蛋”混在一起；另外“活到收盘”是兜底结局，也带徽章（代码里 `special: true`），若给它解锁音会让每个普通通关都像彩蛋 |
| 9 种人格要不要各自的短动机 | **要，但放 P2**。9 条，每条 1.2–2.0 s，id 为 `mot-persona-<id>`，id 取 `types.ts` 的 `PersonaId`：`sloth` `bull` `hedgehog` `owl` `shark` `turtle` `dolphin` `crab` `fox`。P0/P1 只用统一的 `stg-persona-reveal` | 人格揭晓是整局的“记忆点”，每个动物有自己的小声音会很加分，但 9 条素材的成本不低，不影响可玩性 |

9 条动机的方向（P2，提示词沿用 `stg-persona-reveal` 的基础段，再追加下表的一句；单条 ≤ 2 秒，只用 A C D E G）：

| id | 追加的提示词（英文） | 感觉 |
|---|---|---|
| `mot-persona-sloth` | `very slow two-note pulse-wave yawn, long sustained, sleepy` | 慢、困 |
| `mot-persona-bull` | `fast repeated low pulse-wave charge, three punchy hits then a rising bleep` | 冲 |
| `mot-persona-hedgehog` | `short spiky staccato pulse-wave notes, then one stubborn held note` | 扎手、倔 |
| `mot-persona-owl` | `soft two-note hoot with triangle wave, then a tiny star sparkle` | 夜、安静 |
| `mot-persona-shark` | `low triangle-wave two-note menace, then a sharp pulse-wave bite` | 深、猎 |
| `mot-persona-turtle` | `steady slow triangle-wave step-wise walk, calm and solid` | 稳 |
| `mot-persona-dolphin` | `bouncy rising-and-falling pulse-wave wave pattern, playful splashy noise` | 顺势、跳跃 |
| `mot-persona-crab` | `sideways zigzag pulse-wave pattern of alternating notes, quirky` | 横着走 |
| `mot-persona-fox` | `quick sly pulse-wave glissando up and down, wink-like blip` | 灵活、狡黠 |

> 对应关系来自 `types.ts` 注释：passive→sloth、impulsive→bull、stubborn→hedgehog、research→owl、concentrated→shark、cautious→turtle、trend→dolphin、contrarian→crab、adaptive→fox。

## 4. 音效清单（SFX）

### 4.1 触发点与代码对应

| 触发时机 | 代码依据 | 用哪个 SFX |
|---|---|---|
| 卡牌拿起（指针按下 + 捕获） | `onPointerDown`，`setDragging(true)` | `sfx-card-grab` |
| 拖动中（可选，每移动约 24 px 一次） | `onPointerMove` 更新 `dx` | `sfx-card-drag` |
| 拖动中越过左右阈值 | `abs(dx) >= threshold` 且 `leaning` 从 null 变成 left/right | `sfx-card-threshold` |
| 左滑确认 | `commit('left')` | `sfx-card-left` |
| 右滑确认 | `commit('right')` | `sfx-card-right` |
| 卡牌飞出（退场动画开始） | `setExiting(side)` | 已包含在 left/right 音效末尾，不另加 |
| 新卡牌进入 | `setExiting(null)` + `setDx(0)`，新卡渲染（`key` 变化） | `sfx-card-enter` |
| 数值上升 | `effects[key] > 0`，应用后 `stats[key]` 变大 | `sfx-stat-up` |
| 数值下降 | `effects[key] < 0`，应用后 `stats[key]` 变小 | `sfx-stat-down` |
| 数值进入危险区（任一条首次 ≤ 20 或 ≥ 80） | 检查 `stats`，与紧张层同时机，但只在 0→1 时播一次 | `sfx-stat-danger` |
| 数值触底（到 0） | `findNormalEnding` 返回 `kind: 'low'` | `sfx-final-low` |
| 数值爆满（到 100） | `findNormalEnding` 返回 `kind: 'high'` | `sfx-final-high` |
| 隐藏结局解锁（徽章出现） | `ending.special === true` && `ending.kind === 'special'`（中途特殊结局；不包含 `survive` 那些） | `sfx-secret-unlock` |
| "后来……"文字淡入 | `lastAftermath` 变化且 `setAftermathShown(true)` | `sfx-aftermath` |
| 奇遇标签出现 | `card.adventure !== undefined`，卡面渲染"奇遇"标签 | `sfx-adv-tag`；`stg-adventure` 已加载时改播 stinger，不重复（见 5.5） |
| 按钮悬停（桌面） | `:hover`，CSS 的 `pointer: fine` 媒体查询 | `sfx-btn-hover` |
| 按钮点击 | 左右选择按钮 `onClick`、选角卡、"再来一局"等 | `sfx-btn-click` |
| 选角确认 | `onSelect(role)`，进入游戏中 | `sfx-role-confirm`，同时 `bgm-play-<角色>-safe` 开始 |
| 人格卡翻出 | `PersonaReveal` 首次进入视口 | `sfx-persona-flip`，0.1 s 后接 `stg-persona-reveal`（未加载时只播 SFX） |
| 再来一局 / 同一角色再来一次 | `onRestart` / `onReplay` | `sfx-restart` |
| 数值条点击名称展开说明 | `onClick={() => setOpenStat(...)}` | 用 `sfx-btn-click` |

### 4.2 SFX 总表

每行一条，含 id、触发时机、时长、质感描述、英文提示词。单声道，≤ 50 KB，响度 -12 LUFS（峰值 -3 dBFS）。除非特别说明，尾巴自然衰减到零（≤ 20 ms）。三个角色共用同一套音效，不做主题化差异（理由见 4.3）。

| id | 触发时机 | 时长（秒） | 质感与情绪 | 可直接复制的英文提示词 |
|---|---|---|---|---|
| `sfx-card-grab` | 拿起卡牌 | 0.08–0.15 | 轻柔纸摩擦 + 轻吸气感，像磁贴吸到手指 | `soft paper rustle with a subtle magnetic snap, quick inhale, card pickup, tactile, 0.1 seconds` |
| `sfx-card-drag` | 拖动中的刻度（可选，P2） | 0.02–0.04 | 极轻的木质“嗒”，音量比其他 SFX 低 6 dB；随位移加大音高略升 | `very quiet tiny wooden tick, drag detent, subtle, 0.03 seconds` |
| `sfx-card-threshold` | 拖动越过提交阈值 | 0.05–0.10 | 轻"嘀"或短促咔哒，反馈"过线了" | `short click or blip, decision threshold feedback, tactile confirmation, 0.08 seconds` |
| `sfx-card-left` | 左滑确认 | 0.25–0.35 | 纸牌向左飞出 + 轻气流"嗖" | `card swipe left whoosh with paper flutter, quick wind rush left, 0.3 seconds` |
| `sfx-card-right` | 右滑确认 | 0.25–0.35 | 纸牌向右飞出 + 轻气流"嗖" | `card swipe right whoosh with paper flutter, quick wind rush right, 0.3 seconds` |
| `sfx-card-enter` | 新卡进入 | 0.15–0.25 | 纸牌滑入 + 轻微落定音，像新牌从牌堆上翻出 | `new card slide in with soft paper settle, card drawn from deck, 0.2 seconds` |
| `sfx-stat-up` | 数值上升 | 0.15–0.25 | 轻快上升音调（方波或三角波 A→E，五声音阶）+ 一点颗粒质感 | `short rising chiptune blip A to E pentatonic, light grain, positive feedback, 0.2 seconds` |
| `sfx-stat-down` | 数值下降 | 0.15–0.25 | 短促下降音调（方波或三角波 E→A，五声音阶），不要太悲伤 | `short falling chiptune blip E to A pentatonic, light grain, neutral feedback not too sad, 0.2 seconds` |
| `sfx-stat-danger` | 首次进入危险区 | 0.30–0.50 | 低频预警颤音（A 低音 + 噪声边缘），不要刺耳 | `low warning hum on A with noise edge, danger zone entered, tense but not painful, 0.4 seconds` |
| `sfx-final-low` | 数值触底 | 0.40–0.60 | 低沉撞击，像重物落地、下坠到底的沉闷感 | `heavy low thud, something falling to the floor, game over impact, defeat, 0.5 seconds` |
| `sfx-final-high` | 数值爆满 | 0.40–0.60 | 尖锐破裂音 + 泄气嘶声，像气球炸开 | `sharp pop with deflating hiss, balloon burst, overinflated crash, ironic, 0.5 seconds` |
| `sfx-secret-unlock` | 隐藏结局解锁（徽章出现） | 0.50–0.80 | 明亮琶音 + 小铃音，惊喜彩蛋，但不夸张 | `bright chiptune arpeggio with tiny bell chime, secret unlocked jingle, pleasant surprise, 0.6 seconds` |
| `sfx-adv-tag` | 奇遇标签出现 | 0.25–0.35 | 小星星闪一下 + 轻“叮”，比 `stg-adventure` 轻很多 | `tiny sparkle with a soft ding, discovery tag appears, chiptune bell, 0.3 seconds` |
| `sfx-aftermath` | "后来……"文字淡入 | 0.20–0.35 | 轻柔"叮"+ 纸页翻开声，揭晓感 | `soft ding with gentle paper page turn, aftermath reveal, subtle, 0.25 seconds` |
| `sfx-btn-hover` | 按钮悬停（桌面 fine pointer） | 0.05–0.10 | 极轻高频"滴"，只在桌面播放，不要盖过拖动的刻度音 | `very soft high-frequency blip, button hover, desktop only, quiet, 0.06 seconds` |
| `sfx-btn-click` | 按钮点击（左右选项、数值名、折叠面板等） | 0.08–0.15 | 干净按下音，芯片风格"啵" | `clean chiptune button press, short boop, tactile, 0.1 seconds` |
| `sfx-role-confirm` | 选角确认 | 0.35–0.50 | 工牌/徽章“咔”一下盖章 + 上行两音，开局的仪式感 | `stamp or badge snap with a rising two-note chiptune blip, role confirmed, game start, 0.4 seconds` |
| `sfx-persona-flip` | 人格卡翻出 | 0.25–0.35 | 卡片翻面“啪” + 闪光小颗粒 | `card flip with a bright sparkle, reveal, chiptune glitter, 0.3 seconds` |
| `sfx-restart` | 再来一局 / 同一角色再来一次 | 0.25–0.35 | 洗牌 “唰” + 一个上行音 | `quick card shuffle flutter with a rising blip, new round, 0.3 seconds` |

### 4.3 角色主题化音色差异的建议

| 问题 | 建议 | 理由 |
|---|---|---|
| 三个角色是否需要各自的 SFX 变体（如 Web3 的音效更"电子"）| **不做**。全部角色共用同一套 19 条 SFX | 本游戏的角色区分由 BGM 承担已足够；SFX 是瞬时反馈，玩家关注的是"能不能拖了""点到了吗"，而不是"这是谁的音效"。如果每个角色一套 SFX，会从 19 条涨到约 57 条，体积与成本都翻倍，性价比极低。**P2 可选**：只给卡牌音效（grab / threshold / left / right / enter）做 3 个变体（基金经理偏冷金属、Web3 偏合成电子、炒股达人偏纸质木块），其余共用 |
| 左滑与右滑的音效要不要一样 | **不同**，方向感由声像（pan）+ 气流方向（whoosh 的高频滤波）区分 | 方向感帮助玩家确认"我刚才选的是哪边"；可以是同一素材的左右声道翻转 + 起始频率稍调 |
| `sfx-btn-hover` 是否在移动端播放 | **否**。只在 CSS 的 `@media (pointer: fine)` 时播，或在代码里检测 `window.matchMedia('(pointer: fine)').matches` | 触屏没有悬停；真播了反而在触摸时误触，且与卡牌拖动音效冲突 |
| `sfx-secret-unlock` 与 `stg-ending-special` 的先后顺序 | 先播 `stg-ending-special` 渐强，0.3 s 后叠加 `sfx-secret-unlock`，让铃音正好落在 stinger 的高潮 | 避免两个"惊喜"音效打架 |
| 多个属性同时变化时的 `sfx-stat-up/down` | **合并**。同一次 `choose()` 里有多个属性变化，播一次"综合音效"即可，或只播最大变化那条；不要同时播 4 个音效叠成噪音 | 玩家看到的是多条数值条一起动，耳朵只需要一次反馈 |
| `sfx-stat-danger` 的冷却 | 进入危险区（0→1）时播一次，留在危险区不重播；回到安全（1→0）再进危险时可再播；同一次选择多条进危险只播一次 | 避免频繁预警变成噪音 |

### 4.4 jsfxr / sfxr 参数思路（可选）

如果不用 AI 工具，想用 [jsfxr](https://sfxr.me) 手做，下面是参考设置（不是精确参数，调到感觉对即可）：

| id | sfxr 类型 | 主要参数 |
|---|---|---|
| `sfx-card-grab` | Pickup/Coin | Attack: 0, Sustain: 0.05, Frequency: 600–800 Hz 起，微升，加一点 noise |
| `sfx-card-threshold` | Blip/Select | Attack: 0, Sustain: 0.04, Frequency: 1000 Hz, 无扫频 |
| `sfx-card-left` | Jump | Frequency 起点 600 Hz 下扫到 400 Hz，Sustain: 0.15，轻微方波 |
| `sfx-card-right` | Jump | 同上，频率起点 700 Hz 下扫到 450 Hz |
| `sfx-card-enter` | Pickup/Coin | Sustain: 0.1，频率微升，柔和 |
| `sfx-stat-up` | Powerup | 频率从 440 Hz（A）升到 660 Hz（E），Attack: 0, Sustain: 0.1 |
| `sfx-stat-down` | Hit/Hurt（柔和） | 频率从 660 Hz 降到 440 Hz，不要太重 |
| `sfx-stat-danger` | Alarm | 方波低频 110 Hz（A 低音），Sustain: 0.25，轻微颤音，加噪声边缘 |
| `sfx-final-low` | Explosion（低沉） | 频率从 200 Hz 快速下扫，噪声占比 30%，Sustain: 0.3 |
| `sfx-final-high` | Explosion（尖锐）+ Random（嘶声） | 频率高起点快速下扫 + 白噪声尾巴 |
| `sfx-secret-unlock` | Powerup | 三音琶音 A C E，每音 0.15 s，柔和三角波 |
| `sfx-aftermath` | Blip/Select | 柔和单音 + 极轻噪声"沙" |
| `sfx-btn-hover` | Blip/Select | 频率 2000 Hz，Attack: 0, Sustain: 0.03，音量 -18 dB |
| `sfx-btn-click` | Blip/Select | 方波 800 Hz，Sustain: 0.06，干脆 |
| `sfx-card-drag` | Blip/Select | 频率 1200 Hz，Sustain: 0.015，音量 -24 dB |
| `sfx-adv-tag` | Pickup/Coin | 频率 1400 Hz 起微升，Sustain: 0.08，加长衰减 |
| `sfx-role-confirm` | Powerup | 两音 A→E，Sustain: 0.1，前面加 0.02 s 噪声“咔” |
| `sfx-persona-flip` | Pickup/Coin | 噪声“啪”+ 1600 Hz 微升，Sustain: 0.08 |
| `sfx-restart` | Powerup | 噪声“唰”0.1 s + 440→660 Hz 上扫 |

## 5. 交互与接入规则（写给接入代码的 AI 助手）

只写规则与接口建议，不写实现。目前仓库没有任何音频代码，所有规则都是新增。

### 5.1 模块与接口建议

建议新增一个与 React 解耦的单例模块，放 `frontend/src/reigns/audio/audioManager.ts`（文件位置待确认，见第 8 节）。界面组件只调用它，不直接碰 `AudioContext`。

| 函数 | 说明 |
|---|---|
| `init()` | 创建（或恢复）`AudioContext`，建立 BGM / SFX 两条总线（`GainNode`），读取本地存储里的设置。必须在**用户手势回调里**调用，幂等 |
| `preload(group)` | 按分组预加载并解码（`'core'` / `'role:<roleId>'` / `'ending'`），返回 Promise，失败不抛错只记日志 |
| `playBgm(trackId, opts?)` | 切换主 BGM（如 `bgm-select`）。已在播同一首则忽略；切换时旧曲 0.8 s 淡出、新曲淡入；`opts.startAt` 可传 AudioContext 时间以对拍 |
| `playRoleBgm(roleId)` | 同时启动 `bgm-play-<roleId>-safe` 与 `-tense`（同时间戳，tense 音量为 0），见 3.4 节 |
| `setTension(level: 0 \| 1 \| 2)` | 设定紧张级别，内部按 3.4 节的淡入规则与最短停留处理 |
| `playSfx(id, opts?)` | 播放一条 SFX；`opts.pan`（-1..1）、`opts.volume`（0..1）、`opts.rate`（0.9..1.1 随机微调避免重复感）|
| `playStinger(id)` | 播放 stinger：BGM 总线 0.1 s 内压低 6 dB，stinger 播完 0.6 s 恢复；同一时间只允许一条 stinger，后来的排队，队列长度上限 1，排队超过 3 秒就丢弃 |
| `stopAll(fadeMs?)` | 淡出并停止所有 BGM 与 stinger（SFX 让其自然结束）|
| `setMuted(kind: 'bgm' \| 'sfx' \| 'all', muted: boolean)` | 静音；写本地存储 |
| `setVolume(kind: 'bgm' \| 'sfx', value: number)` | 0..1，写本地存储 |
| `getState()` | 返回 `{ ready, bgmMuted, sfxMuted, bgmVolume, sfxVolume, reducedSound }`，供设置面板读取 |
| `suspend()` / `resume()` | 页面不可见时暂停 / 回来继续，见 5.4 节 |

`trackId` / `id` 就是第 3、4 节表格里的 id，也是文件名（见第 7 节），建议用一个字符串联合类型 `AudioId` 约束，缺文件时 `playSfx` / `playBgm` 静默跳过并 `console.warn` 一次，**不能因为缺音频而让游戏卡住或报错**（P0 阶段素材会陆续到位）。

### 5.2 接入点（只列“哪里调什么”）

| 位置 | 调用 |
|---|---|
| `ReignsGame` 里 `start(role)`（选角点击） | `init()` → `preload('role:<role>')` → `playSfx('sfx-role-confirm')` → `playRoleBgm(role)` |
| `ReignsGame` 未选角（`game === null`） | 用户已开启音乐时 `playBgm('bgm-select')` |
| `onPointerDown` | `playSfx('sfx-card-grab')` |
| `onPointerMove`（越过阈值，`leaning` 从 null 变成 left/right） | `playSfx('sfx-card-threshold')`；回到阈值内不播 |
| `commit(side)` | `playSfx(side === 'left' ? 'sfx-card-left' : 'sfx-card-right', { pan: side === 'left' ? -0.4 : 0.4 })` |
| `choose()` 返回新状态后 | 比较新旧 `stats` 播 `sfx-stat-up` / `sfx-stat-down`（一次选择最多各播一条）；再按 3.4 节算 `setTension`；若首次进入危险区播 `sfx-stat-danger`；若新卡 `card.adventure` 有值播 `stg-adventure` |
| `lastAftermath` 变化且显示 | `playSfx('sfx-aftermath')`（有 `stg-adventure` 正在播时，延后到它结束再播）|
| `game.ending` 变为非空 | 先 `stopAll(300)`；`kind` 为 `low` / `high` 时播 `sfx-final-low` / `sfx-final-high`，0.6 s 后播对应 `stg-ending-*`；`special` / `survive` 没有撞击音，直接播 stinger；`kind === 'special'` 时 0.3 s 后叠 `sfx-secret-unlock`；stinger 结束后 `playBgm('bgm-ending-idle')` |
| `EndingScreen` 里 `PersonaReveal` 首次可见（用 `IntersectionObserver`） | `playSfx('sfx-persona-flip')` → `playStinger('stg-persona-reveal')`；每局只播一次 |
| 各 `<button>` | `playSfx('sfx-btn-click')`；桌面 fine pointer 才加 `sfx-btn-hover` |
| `restart` / `replay` | `playSfx('sfx-restart')`；`restart` 回选角页时 `playBgm('bgm-select')` |

### 5.3 浏览器自动播放限制与首次手势

- 浏览器在用户手势之前不允许发声。`AudioContext` 一律在**第一次用户手势回调里**创建或 `resume()`（选角页的点击、或页面上的“开启声音”按钮，以先到者为准）。
- 因此**选角页一打开不会有声音**，这是浏览器限制，不是 bug。选角页的 `bgm-select` 在用户点了“开启声音”或点了其它任何按钮之后才开始。建议选角页角落放一个不挡内容的小开关（文案例：“🔈 开启音乐”）。
- 回到选角页（结局页点“再来一局”）时 `AudioContext` 已经解锁，可直接播 `bgm-select`。
- `AudioContext.state` 可能是 `suspended`（切标签页、锁屏后）；每次要播之前先检查并 `resume()`。
- 预解码的 `AudioBuffer` 在 `init()` 前就可以 `fetch` + `decodeAudioData`（不需要手势），但要等 `AudioContext` 存在；不要为了提前解码而在手势之外创建 `AudioContext`（会得到 suspended 并在 Safari 里打印警告）。

### 5.4 静音、音量、无障碍、本地存储

**默认值与理由**

| 项 | 建议 | 理由 |
|---|---|---|
| BGM | **默认关闭**，选角页提供一个明显的开关，用户开启后记住 | 比赛现场、会议室、地铁里手机外放会很尴尬；浏览器也不允许自动播放；BGM 是最容易被嫌吵的部分 |
| SFX | **默认开启**，音量 0.7 | 点击反馈短、小、有实用价值（告诉你过线了）；`prefers-reduced-motion` 是动效设置，不影响 SFX 开关 |
| 首次进入 | 不弹窗打断；在选角页角落显示一次性提示“🔈 开启音乐（可随时关闭）”，点了才开 | 避免一进来就被问；比 `confirm` 弹窗友好；演示时也可以由讲解人手动开 |
| 演示模式（待确认）| 可加一个 URL 参数（如 `?audio=on`）让现场演示默认开 BGM | 比赛现场路演时需要有声音；是否做见第 8 节 |

**音量与静音**

- 两条独立滑条：BGM 音量、SFX 音量（0–100%，步长 5%），外加一个总静音开关；静音时仍应保持 `AudioContext` 运行，只是把总线增益设为 0，这样取消静音可立刻继续，不必重新加载。
- 滑条改变时，SFX 总线给一个试听音（`sfx-btn-click`），BGM 总线直接实时听变化。
- 控件位置：游戏中的 `reigns-header` 右侧放一个小喇叭按钮，点开浮层有两个滑条（实现交给界面同学，这里只约束必须能用键盘操作、有 `aria-label`、有 `aria-pressed`）。

**无障碍（除了 `prefers-reduced-motion`）**

- 增加一个“减少声音”选项（`reducedSound`）：开启后 **不播 BGM 紧张层和 `sfx-stat-danger`**，`sfx-final-*` 与 stinger 音量降 6 dB（并可套低通滤波去掉重低频），危险状态仍由数值条变红表达。对声音敏感的玩家（听觉过敏、焦虑）有用；默认读取系统 `prefers-reduced-motion: reduce` 时**仅作为该选项的初始建议**，不强制绑定。
- 所有声音信息**必须同时有视觉反馈**（现有界面已满足：数值条变红、结局标题、“后来……”文字），不能出现只有声音才知道的状态。
- 不使用闪烁高频或突然的大音量；`sfx-final-*` 峰值不超过其他 SFX 的 +3 dB。
- 屏幕阅读器用户：音乐与音效不要盖过读屏；`aria-live` 区域更新时（卡牌文字、后来……）不要同时播放 > 1 条 SFX。

**本地存储**

- 现有项目使用 `pandaai:c-shell:v1`（`frontend/src/shell/App.tsx`）；音频设置**用独立的 key，不要改动它**：`pandaai:reigns:audio:v1`。
- 值为 JSON：`{ "bgmMuted": true, "sfxMuted": false, "bgmVolume": 0.8, "sfxVolume": 0.7, "reducedSound": false, "asked": true }`。
- 读写都要 `try/catch`（隐私模式或存储满了不能抛错）；缺字段用默认值补；`bgmMuted` 默认 `true`（见上表）。
- 不存任何可识别个人的信息。

**页面可见性**

- 监听 `document.visibilitychange`：`hidden` 时 `AudioContext.suspend()`（BGM 暂停，SFX 不再触发）；`visible` 时 `resume()`，BGM 从暂停处继续而不是重头播；若 `resume()` 抛错或状态不是 `running`（iOS 上常见），等下一次用户手势再恢复。
- 同时监听 `pagehide`：移动端切后台时先停声音。

### 5.5 触发的冷却与去重（避免吵）

| 场景 | 规则 |
|---|---|
| `stg-adventure` | 每局第一张奇遇卡必播；之后若上一回合也是奇遇卡则不再播；两次之间至少隔 3 回合。不播时仍可播 `sfx-adv-tag`（P2）|
| `sfx-stat-up` / `sfx-stat-down` | 一次选择最多各一条；两者同时需要时先 down 后 up，间隔 80 ms；`rate` 在 0.95–1.05 随机 |
| `sfx-stat-danger` | 进入紧张态（0→1）才播；留在紧张态不重播；回到安全再进入可再播 |
| `sfx-card-threshold` | 一次拖动（按下到松开）只播一次；回头再越过不重复 |
| `sfx-btn-hover` | 同一按钮 300 ms 内只播一次；触屏不播 |
| 同一 id 重叠 | 同一 SFX 同时最多 2 个实例，超出的丢弃（短音效连点时）|
| 总并发 | SFX 同时发声不超过 6 路，超出丢弃最新的 |
| stinger 与 SFX | 播 stinger 时 BGM 压低 6 dB；SFX 不受影响，但 `sfx-btn-hover` 暂停 |
| 结局 | `sfx-final-*` 播放时其他 SFX 全停；见 3.4 节 |

### 5.6 预加载策略

| 阶段 | 加载什么 | 预算 |
|---|---|---|
| 进入页面后（空闲时，`requestIdleCallback`）| `core`：`bgm-select` + 全部 P0 SFX | ≈ 0.6 MB + 0.15 MB |
| 点击选角那一刻 | 当前角色的 `bgm-play-<role>-safe` 与 `-tense`；若还没加载好，先用 `sfx-role-confirm` 顶住，BGM 加载完再淡入（最长等 3 秒，超时放弃，不阻塞游戏）| ≈ 1 MB |
| 游戏进行到第 5 回合左右 | `ending` 分组：4 条结局 stinger、`bgm-ending-idle`、`stg-persona-reveal`、`sfx-final-*` | ≈ 0.5 MB |
| 其他角色的素材 | 不预加载（选角页悬停某角色卡时可预热，P2）| — |
| 失败处理 | 任何一条加载失败只记一次日志，游戏照常；弱网（`navigator.connection.saveData` 或 `effectiveType` 为 2g/3g）时只加载 SFX，不加载 BGM | — |
| 缓存 | 文件名带内容哈希或版本后缀（Vite 的 `public/` 目录不会自动加哈希，更新素材时改文件名）| — |
| 格式选择 | 用 `new Audio().canPlayType('audio/ogg; codecs="vorbis"')` 判断，不支持就用同名 `.mp3`；iOS Safari 对 OGG 的支持因版本而异、不能假设可用，所以 MP3 回退必须提供 | — |
| 路径 | `vite.config.ts` 里 `base: './'`，所以素材 URL 不要写绝对路径 `/audio/...`；用 `import.meta.env.BASE_URL` 拼接 | — |

### 5.7 移动端与 iOS Safari 注意事项

- iOS 的 `AudioContext` 必须在 `touchend` / `click` 同步回调里创建或 `resume()`；`pointerdown` 里首次解锁在部分 iOS 版本不被认可，建议同时监听 `touchend` 与 `click`，谁先到谁解锁（这是常见经验做法，真机上要实测）。
- **静音拨片（硬件侧边开关）**：Web Audio 在 iOS 上会被静音拨片静音，而 `<audio>` 标签不会。这是系统行为，无法绕过；文档里要告诉用户“如果听不到声音，请检查手机静音键”，设置面板里加一句提示。
- 来电、锁屏、切到后台后 `AudioContext` 会变成 `interrupted`（iOS 特有状态），回来需要再次手势才能 `resume()`；见 5.4 的可见性规则。
- `decodeAudioData` 在旧版 Safari 只支持回调形式，不返回 Promise；封装时要兼容，或要求最低版本。
- 内存：iOS 对单页内存很严格。同时驻留的解码音频不要超过约 60 MB：游戏中只留当前角色的 safe + tense（各约 13.5 MB，立体声）+ 全部 SFX（很小）。紧张层做成单声道可省一半。切回选角页时 `buffer = null` 释放该角色素材。
- 滑动卡牌是 `pointer` 事件，期间不要在 `pointermove` 里每帧创建新的音频节点；刻度音（`sfx-card-drag`）如做，用节流到每 24 px 一次。
- 不依赖 `Audio` 元素的 `loop` 属性做无缝循环（Safari 上有间隙）；用 `AudioBufferSourceNode` 并设 `loop = true`，`loopStart` / `loopEnd` 取整段。
- 触觉反馈（`navigator.vibrate`）iOS 不支持，不要当替代；不在本期范围。

## 6. 工作量统计与优先级

数量口径：BGM = 循环曲目；Stinger = 一次性短乐句；人格动机 = 9 条短动机；SFX = 音效。

### 6.1 总数

| 类别 | 数量 | 明细 |
|---|---|---|
| BGM（循环） | **8** | `bgm-select`、`bgm-play-{fund,crypto,stock}-safe`、`bgm-play-{fund,crypto,stock}-tense`、`bgm-ending-idle` |
| Stinger | **6** | `stg-adventure`、`stg-ending-{low,high,special,calm}`、`stg-persona-reveal` |
| 人格动机 | **9** | `mot-persona-{sloth,bull,hedgehog,owl,shark,turtle,dolphin,crab,fox}` |
| SFX | **19** | 见 4.2 节 |
| **合计** | **42** | 其中音乐类 23（8 + 6 + 9），音效 19 |

### 6.2 分级

| 优先级 | 内容 | 数量 |
|---|---|---|
| **P0 最小可玩**（BGM 4 首 + SFX 8 个）| BGM：`bgm-select`、`bgm-play-fund-safe`、`bgm-play-crypto-safe`、`bgm-play-stock-safe`。SFX：`sfx-card-grab`、`sfx-card-left`、`sfx-card-right`、`sfx-card-enter`、`sfx-stat-danger`、`sfx-final-low`、`sfx-final-high`、`sfx-btn-click` | 4 + 8 = **12** |
| P0 的降级处理 | 没有紧张层：进入危险区只播 `sfx-stat-danger`，BGM 总线用 `BiquadFilter`（低通）略压高频并降 2 dB，作为“替代紧张感”（可选）。没有结局 stinger / 结局页 BGM：结局页沿用 `bgm-select` 音量降 8 dB。没有选角确认音：用 `sfx-btn-click`。没有奇遇音：不播 | — |
| **P1 完整体验** | BGM：`bgm-play-{fund,crypto,stock}-tense`（3）、`bgm-ending-idle`（1）。Stinger：全部 6 条。SFX：`sfx-card-threshold`、`sfx-stat-up`、`sfx-stat-down`、`sfx-aftermath`、`sfx-secret-unlock`、`sfx-role-confirm`、`sfx-persona-flip`、`sfx-restart` | 4 + 6 + 8 = **18** |
| **P2 锦上添花** | 9 条人格动机；SFX：`sfx-card-drag`、`sfx-adv-tag`（仅当 `stg-adventure` 被冷却跳过时才会响）、`sfx-btn-hover`；以及 3.5 / 4.3 节提到的“按角色换音色”变体（暂不计入总数，做了再追加）| 9 + 3 = **12** |
| 合计 | | 12 + 18 + 12 = **42** |

### 6.3 体积预估

| 类别 | 估算 |
|---|---|
| 8 条 BGM | 约 0.45–0.65 MB × 8 ≈ 4.5 MB（OGG），MP3 回退再加约 5.5 MB；回退文件只在不支持 OGG 的环境下才被下载 |
| 6 条 Stinger | 约 60–120 KB × 6 ≈ 0.6 MB |
| 9 条人格动机 | 约 20–40 KB × 9 ≈ 0.3 MB |
| 19 条 SFX | 约 5–30 KB × 19 ≈ 0.3 MB |
| 单次游戏实际下载 | `core` + 当前角色 + `ending` ≈ 3 MB（OGG）|

## 7. 文件命名、目录、版权与验收

### 7.1 目录与命名

```
frontend/public/audio/
├── bgm/
│   ├── bgm-select.ogg / .mp3
│   ├── bgm-play-fund-safe.ogg / .mp3
│   ├── bgm-play-fund-tense.ogg / .mp3
│   ├── bgm-play-crypto-safe.ogg / .mp3
│   ├── bgm-play-crypto-tense.ogg / .mp3
│   ├── bgm-play-stock-safe.ogg / .mp3
│   ├── bgm-play-stock-tense.ogg / .mp3
│   └── bgm-ending-idle.ogg / .mp3
├── stinger/
│   ├── stg-adventure.ogg / .mp3
│   ├── stg-ending-low.ogg / .mp3
│   ├── stg-ending-high.ogg / .mp3
│   ├── stg-ending-special.ogg / .mp3
│   ├── stg-ending-calm.ogg / .mp3
│   ├── stg-persona-reveal.ogg / .mp3
│   └── mot-persona-<id>.ogg / .mp3        （P2，9 个）
├── sfx/
│   └── sfx-<名称>.ogg / .mp3              （19 个）
└── README.md                              （来源与许可登记，见 7.2）
```

- 文件名 = 第 3、4 节的 id，小写英文 + 连字符，不用中文、空格、大写。
- 目录要求你指定的是 `bgm/` 与 `sfx/`；Stinger 单独放 `stinger/`，是因为它们的响度和播放规则不同于 BGM / SFX。如果想少一层，也可以把 Stinger 放进 `bgm/`（待确认，第 8 节）。
- 母带 WAV 不提交仓库（体积大），放网盘，在 `audio/README.md` 里写链接（AGENTS.md 规定：大文件不进仓库，AGENTS.md 里 10 MB 是单文件上限，母带可能超限）。
- 按 AGENTS.md，`frontend/` 下每个代码目录要有 `README.md`；新增 `frontend/public/audio/` 后需要补一份 README（只写本文第 7 节的命名、来源登记、更新方法）。**本文不创建它**，由做素材的人在提交素材的 PR 里一起加。

### 7.2 版权、许可与披露

| 项 | 要求 |
|---|---|
| PR 描述 | AGENTS.md 第 5 条：AI 生成的大段内容必须在 PR 描述里注明。每个提交音频的 PR 写清：用了哪个工具与版本（如 Suno v4.5、ElevenLabs Sound Effects）、哪几个 id、是否经过人工后期 |
| 登记表 | 在 `frontend/public/audio/README.md` 里维护表格：`id | 工具与版本 | 提示词（或原始文件名）| 生成日期 | 生成者账号 | 许可类型 | 人工修改说明` |
| 商用 / 比赛许可 | **必须先确认**：Suno、Udio 等工具的免费档通常**不授予商用权**，付费档才授予；不同工具、不同时期条款不同。生成前由负责人确认账号档位与最新条款，并截图留存（待确认，第 8 节）。ElevenLabs 的音效、jsfxr（生成结果通常可自由使用）、BeepBox（作者自写）也要各自核对条款 |
| 第三方素材 | 不使用来源不明的音频；若用了 CC 许可素材，必须记录作者、链接、许可类型，并满足署名要求；不接受 NC（禁止商用）限定的素材 |
| 避免侵权 | 提示词里不要写任何作曲家、乐队、游戏或影视名称；出稿后试听，如果某一段明显像某首已有曲目，换版本重出；不使用任何人声采样 |
| 页面署名 | 项目说明或页脚可加一行“音乐与音效由 AI 工具生成并经人工整理”（文案待确认）|

### 7.3 验收清单

每个文件交付前自查（勾选后在 PR 里贴出）：

**所有文件**

- [ ] 文件名与 id 一致，小写英文 + 连字符；`.ogg` 和 `.mp3` 各一个
- [ ] 体积达标：BGM ≤ 1.5 MB；Stinger ≤ 150 KB；SFX 与人格动机 ≤ 50 KB
- [ ] 真峰值 ≤ -1 dBTP，无削波，无爆音，无直流偏移
- [ ] 开头静音 ≤ 10 ms，没有长尾静音
- [ ] OGG 与 MP3 两个版本在 Chrome、Safari（含 iOS）、Firefox 都能播放
- [ ] 登记表已填，PR 描述已披露 AI 工具
- [ ] 无人声，无可识别的现有曲目旋律

**BGM（8 首）**

- [ ] 长度与采样数：游戏中与选角页 16 小节 = 38.400 s（±1 采样），结局页 8 小节 = 19.200 s
- [ ] 100 BPM（用节拍器对照，误差 < 0.1 BPM），调性符合 2.2 节
- [ ] 循环无缝：连放 3 遍听不出接缝；波形首尾接近零；Web Audio 里设 `loop = true` 实测无空隙
- [ ] 响度：BGM 积分 -16 LUFS（±1），结局页循环 -20 LUFS（±1）
- [ ] 同一角色的 safe 与 tense 同时开始播放时对拍，叠加后不削波，不和谐得难受（A 小调与 C 大调互相切换实测一次）
- [ ] 单声道播放不抵消（用 DAW 的单声道监听检查）

**Stinger 与动机**

- [ ] 长度符合表格（±0.1 s），尾部自然收束，不需要淡出
- [ ] 响度 -14 LUFS（±1），叠在对应 BGM 上时不过响也不被淹没
- [ ] 只用 A C D E G（紧张层的 G#、Bb 不在其中）

**SFX**

- [ ] 单声道，峰值 -3 dBFS 左右，响度主观一致（按钮点击与最终撞击音相差不超过 6 dB）
- [ ] 连续触发 5 次不让人烦（尤其是 `sfx-btn-click`、`sfx-stat-up/down`）
- [ ] 手机外放与耳机各听一遍

**接入后（代码完成时再验）**

- [ ] 首次手势前没有声音；手势后能正常出声（桌面 Chrome、iOS Safari 各测）
- [ ] 静音开关、两条音量滑条、本地存储生效；刷新页面后设置保留
- [ ] 数值进入 ≤ 20 或 ≥ 80 时紧张层淡入，回到 21–79 并停留满 4 小节后淡出
- [ ] 切标签页音乐暂停，回来恢复
- [ ] 缺一个音频文件时游戏仍可正常玩（只有控制台警告）

## 8. 待确认（需要人工决定）

| # | 问题 | 我的建议 | 影响 |
|---|---|---|---|
| 1 | AI 作曲工具的账号与许可：选哪个工具、哪个档位，比赛与商用能否使用？ | 先由负责人核对最新条款再生成；拿不准的曲目用 BeepBox 自己写或让有乐理的同学手写 | 决定能不能提交，必须先定 |
| 2 | BGM 默认关还是开？是否加“演示模式”参数？ | 默认关，选角页给一个明显开关；路演现场用 `?audio=on` 类参数默认开（若做） | 影响首次体验与路演效果 |
| 3 | 统一速度 100 BPM 与调性（A 小调 / C 大调）是否定下？ | 定下，不再改，否则叠层和换曲会错拍 | 所有音乐的前提 |
| 4 | 要不要给三个角色的结局 stinger 做角色版本？ | 不做（P2 再说） | 增加 8 条素材 |
| 5 | 9 条人格动机是否真的要做？ | P2，时间不够就砍 | 9 条素材 |
| 6 | 要不要做“减少声音”选项和设置面板的位置？ | 要做选项；面板放 `reigns-header` 右侧，由界面同学定样式 | 无障碍，涉及 UI 改动 |
| 7 | `audioManager` 放在哪个目录、是否复用到别的页面（如首页 shell）？ | 先放 `frontend/src/reigns/audio/`，别的页面要用再提升 | 代码结构 |
| 8 | Stinger 单独放 `stinger/` 目录还是并入 `bgm/`？ | 单独放 | 目录 |
| 9 | 响度数值（-16 / -14 / -12 LUFS）和 SFX 体积上限（50 KB）是否接受？ | 接受；实测后可微调，但需统一 | 验收标准 |
| 10 | 极危（level 2，≤ 10 或 ≥ 90）是否要做？ | P2，只是调音量，不需要新素材 | 少量代码 |
| 11 | 选角页 BGM 是否在结局页点“再来一局”回来后继续播放？ | 是；回来时从头播，不要接着播结局页循环 | 体验 |
| 12 | 灰色“待开发”卡需要音效吗？ | 点击不播（按钮已是 `aria-disabled`），保持沉默；可选 P2 的“锁住”短音 | 少量素材 |
| 13 | 页脚是否标注“音频由 AI 生成”？文案如何写？ | 标注，文案由负责人定 | 披露 |
| 14 | 本文所有 BPM、时长、LUFS、体积数字是**理论估算**，没有实际做过样片验证 | 先做 `bgm-select` 与一组 safe / tense 样片，验证叠加与循环后再批量做 | 风险控制 |

---

*本文只做规划：没有音频文件，也没有代码。数量口径：BGM 8、Stinger 6、人格动机 9、SFX 19，合计 42；P0 为 BGM 4 + SFX 8 共 12 个。*

