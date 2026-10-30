# 证据与画像（D）

入口 `index.ts` 导出协议第 5 节的 `analyze()` 和 `pickNextLevel()`。规则、阈值和依据写在 [docs/profile.md](../../../docs/profile.md)。

| 文件 | 作用 |
|---|---|
| `evidence.ts` | 证据层：事件 + 关卡 → 每个维度的证据（带 `event_seqs`），阈值集中在 `T` |
| `judge.ts` | 判断层：证据 → 分数、判断、置信度、冲突、不确定项 |
| `persona.ts` | 人物卡（趣味标签） |
| `index.ts` | `analyze()`、round 2 `changes`、`pickNextLevel()` |
| `samples.ts` | 生成 `data/samples/profile/` 的模拟关卡和 3 组模拟玩家（仅测试与演示） |
| `testkit.ts` | 测试用的事件拼装工具 |

依赖：无额外依赖，纯 TypeScript，不联网、不需要任何密钥。

```sh
cd frontend
npx vitest run src/profile          # 只跑画像模块的测试
UPDATE_SAMPLES=1 npx vitest run src/profile/samples.test.ts   # 重新生成模拟数据
```
