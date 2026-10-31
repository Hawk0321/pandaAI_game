# 推荐（D）

`recommend.ts` 导出 `recommend(profile)`，`analyze()` 会自动调用并写入 `profile.recommendations`。规则说明见 [docs/recommend.md](../../../docs/recommend.md)，资源清单见 [docs/recommend-resources.md](../../../docs/recommend-resources.md)。

| 文件 | 作用 |
|---|---|
| `recommend.ts` | 规则：画像 → 最多 4 张推荐卡片（策略 / 工具 / 产品 / 活动 / 学习各最多一张），阈值在 `R` |
| `catalog.ts` | 卡片指向的资源（PandaAI / QuantSkills 链接已核实） |
| `RecommendationPanel.tsx` / `recommend.css` | 画像页里的推荐卡片 |
| `demo.html` / `demo.tsx` | 开发自测入口：真实关卡 + 模拟玩家 |

依赖：无新增依赖，不需要任何密钥。

```sh
cd frontend
npx vitest run src/recommend
npm run dev   # 然后打开 /src/recommend/demo.html?player=impulsive|cautious|watcher
```
