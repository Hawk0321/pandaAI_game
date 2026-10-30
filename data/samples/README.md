# 示例数据

这里只放示例数据、模拟用户、模拟推荐等小文件，评审时会视为**示例**而非真实数据。

- 文件名建议以 `sample_` 开头，或在数据里加 `"is_sample": true`。
- 真实试玩记录需脱敏，并和示例数据分开存放、分开标注。

## 协议示例（见 `docs/protocol.md`）

- `levels/`：关卡索引和一关完整示例（模拟行情）
- `sample_events.json`：行为事件示例
- `sample_profile.json`：画像输出示例

## 画像模块的模拟数据（`profile/`，D 维护）

全部是模拟数据（`is_sample: true`），未调用 Panda Data，由 `frontend/src/profile/samples.ts` 生成：

- `profile/levels/`：6 关模拟关卡 S01–S06（4 关主线 + 2 关补充池）和 `index.json`，行情由公式生成，不对应任何真实股票。
- `sample_player_cautious.json` / `sample_player_impulsive.json` / `sample_player_watcher.json`：3 组模拟玩家（谨慎研究型、冲动重仓型、只看不做型）的完整事件，也是演示路径。
- `sample_profile_*.json`：上面 3 组玩家跑 `analyze()` 得到的画像（只看不做型含补充关卡后的第 2 轮）。

改了生成器后在 `frontend/` 运行 `UPDATE_SAMPLES=1 npx vitest run src/profile/samples.test.ts` 重新生成；平时 `npm test` 会校验这些文件和代码一致。
