# 推荐（D）

`recommend.ts` 导出 `recommend(profile, { events, levels })`，`analyze()` 会自动调用并写入 `profile.recommendations`。规则说明见 [docs/recommend.md](../../../docs/recommend.md)。

| 文件 | 作用 |
|---|---|
| `recommend.ts` | 规则：画像 → 练习任务 + 外部资源，阈值在 `R` |
| `catalog.ts` | 资源目录（PandaAI / QuantSkills 链接已核实）和 4 个练习任务 |
| `tasks.ts` | 练习任务的纯计算（止损回放、线索打分、信心汇总、风格对照） |
| `RecommendationPanel.tsx` / `recommend.css` | 画像页里的推荐面板和任务界面 |
| `demo.html` / `demo.tsx` | 开发自测入口：真实关卡 + 模拟玩家 |

依赖：无新增依赖，复用 C 的 `MarketChart`。练习任务按需请求 `levels/*.json`，不需要任何密钥。

```sh
cd frontend
npx vitest run src/recommend
npm run dev   # 然后打开 /src/recommend/demo.html?player=impulsive|cautious|watcher
```
