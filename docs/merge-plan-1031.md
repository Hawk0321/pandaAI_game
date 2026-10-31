# 10-31 下午：PR 冲突说明与 A/C/D 分工

> 写于 2026-10-31 13:30。nate 定方案，A、C、D 把各自那段指令整段复制给自己的 AI。

## 一、现在的状态

| PR | 作者 | 内容 | 状态 |
|---|---|---|---|
| #15 | A 张家诚 | 画像后 4 张技能卡练习、submission 导出、揭晓页排名、H5 界面优化、CI | **已合并**（13:14） |
| #14 | D（nate） | 画像 → PandaAI / QuantSkills 引流推荐卡片 | 未合并，已被 #16 包含 |
| #16 | D（nate） | 16 个行为特征 + 9 张人物卡（新增「死扛刺猬」），人物卡 → 策略卡 | 未合并，和 main 有冲突 |
| #17 | C ARKimo-mo | 8 张动物插画人物卡、翻面、图鉴、保存图片 | 未合并，和 main 有冲突，C 还在做动画 |

B（ekitou7）10-31 00:10 之后没有新提交，对局内动画（翻牌、K 线逐根揭晓）没人做。

## 二、冲突是什么

### 1. 画像页 `frontend/src/shell/ProfilePage.tsx`：三个人改同一处

- **main（A 的 #15）**：在人物卡下面插入了 `<SkillCards>`（技能卡练习），组件多了 `completed` 参数，人物卡那一行改了样式。
- **D 的 #16**：在**同一个位置**插入 `<RecommendationPanel>`（引流推荐卡片）。
- **C 的 #17**：把人物卡那一行**整行换成**插画 `<PersonaCard>`。

所以 #16 和 #17 都要先 rebase 到 main，手动解决这个文件。

### 2. 浏览器验收脚本 `frontend/src/shell/browser-check.mjs`

main（A）加了技能卡检查，C 加了人物卡检查，同一段冲突。C rebase 时两边都保留。

### 3. 示例画像 `data/samples/profile/sample_profile_impulsive.json`

A 在 #15 里改了 D 的证据规则（`frontend/src/profile/evidence.ts`：关键线索覆盖率、研究深度按停留时间），示例画像被重新生成过，和 #16 冲突。这是生成文件，D rebase 后重新生成即可。

### 4. 内容上撞车（Git 不报错）

- **推荐有两套**：main 已经有 A 的技能卡（游戏内练习），D 的 #16 又加引流卡片。合并后画像页两套都会出现。
- **人物卡 8 张 vs 9 张**：#16 是 9 张（多了 `hedgehog` 死扛刺猬），C 只画了 8 张；C 的代码按中文名找插画，刺猬会落到通用插画。

## 三、方案

1. **两套推荐都留，分工写清楚**：D 的引流卡片放上面，标题“下一步去哪儿”（PandaAI / QuantSkills）；A 的技能卡放下面，标题“先在游戏里练一练”。不再删 A 已经合并的东西。
2. **人物卡以 #16 的 9 张为准**，`frontend/src/profile/persona.ts` 的 `PERSONA_CARDS` 是唯一数据源。C 补刺猬插画，改成按 `persona.id` 匹配。
3. **合并顺序**：D #16（含 #14）→ C #17（C 动画做完再 rebase）。A 开新分支做对局动画，只改 `frontend/src/play/`，不和他们冲突。
4. **C 最后发布新版 H5**，在国内手机网络重新实测。
5. 每个 PR 合并前先问 nate。

## 四、给 AI 的指令（整段复制）

### D（nate 的 Claude）：现在做

```
仓库 Hawk0321/pandaAI_game。把分支 nate/personas（PR #16，已包含 #14）rebase 到最新 main 并解决冲突：
1. frontend/src/shell/ProfilePage.tsx：以 main 为准（保留 SkillCards 和 completed 参数），在 SkillCards 上方插入 {!fixedExample && <RecommendationPanel profile={profile} />}；人物卡那一行不要动。
2. main 的 #15 改了 frontend/src/profile/evidence.ts（关键线索覆盖率、研究深度按停留时间），检查 features.ts 和人物卡规则是否还对得上。
3. data/samples/profile/ 下的冲突文件不手改，用 UPDATE_SAMPLES=1 npx vitest run src/profile/samples.test.ts 重新生成。
4. npm test 和 npm run build 通过后 git push --force-with-lease，更新 PR #16 描述，写明 #14 随之合并、合并后关闭 #14。
5. 可选：submission 导出（frontend/src/skills/submission.ts）的 recommendations 里加上 D 的引流卡片。
完成后：整理 3-5 分钟演示脚本（两条差异玩家路径：画像、人物卡、推荐的不同），放 docs/。
```

### A（张家诚的 Codex）：现在做

```
仓库 Hawk0321/pandaAI_game。git pull origin main，新开分支 jczhang1105/play-animation，接手对局动画（原 B 任务没做完的部分），只改 frontend/src/play/：
- 线索卡翻牌动画，研究点不足时卡片置灰；
- 提交决定后，后续 K 线逐根出现（每根约 150ms），决定时刻画一条竖线；如需 MarketChart 新参数，只加可选参数并在 PR 里说明；
- 尊重 prefers-reduced-motion；
- 不改任何事件类型和 emit 字段，decision 之前绝不调用 loadReveal；
- 手机竖屏 375px 无横向溢出，整关 40-60 秒能玩完；
- npm test、npm run build、node src/play/browser-check.mjs 通过后开 PR。
不要改 ProfilePage.tsx 和 browser-check.mjs（shell 下的），那里 D 和 C 正在改。
```

### C（ARKimo-mo 的 Codex）：继续动画，最后合并

```
继续在 ARKimo-mo/persona-cards（PR #17）做交易人格动画。规则：
1. 人物卡以 frontend/src/profile/persona.ts 的 PERSONA_CARDS 为唯一数据源（PR #16 合并后是 9 张），shell 里不要另写人物名单或文案。
2. 补第 9 张插画：死扛刺猬（id: hedgehog，处置效应：亏损时加仓、不愿止损），风格和现有 8 张一致，同样输出原图、-card、-thumb 三个尺寸。
3. personaArtwork.ts 改为按 profile.persona.id 匹配插画，找不到再按 name，最后才用通用插画。
4. 等 nate 说 #16 已合并后，git pull origin main 并 rebase：ProfilePage.tsx 人物卡那一行用你的 PersonaCard，保留它下面的 RecommendationPanel 和 SkillCards；shell/browser-check.mjs 保留双方的检查。
5. npm test、npm run build、浏览器检查通过后推送，告诉 nate 可以合并。
6. 合并后把新 main 构建发布到现有站点，在国内手机网络重新走一遍完整流程，README 记录机型、浏览器、首屏和一局耗时。
```
