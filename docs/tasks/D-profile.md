# 任务 D：证据与画像（负责人：nate）

> 给负责人和 AI 读。开工前先读：`AGENTS.md`、`README.md`、`docs/protocol.md`（第 3、4、5 节）。
> 同时负责维护 `docs/protocol.md` 和 `frontend/src/shared/protocol.ts`，以及合并大家的 PR。

## 你做什么

把行为事件变成画像：先用规则从事件里算出证据，再根据证据给每个维度下判断、给置信度、写不确定项；证据不足或冲突时挑一关补充关卡。

## 你负责的目录

- `frontend/src/profile/`，入口 `index.ts` 导出 `analyze` 和 `pickNextLevel`
- `frontend/src/shared/protocol.ts`
- 可选：`backend/narrate/`（如果接大模型）

## 两层结构

1. **证据层（纯规则，必须做）**：`events + levels → EvidenceItem[]`，每条证据都指向具体事件 `event_seqs`。例：
   - 证据使用：翻没翻 `key_clue_ids`；决定方向和翻开线索的 `signal` 是否一致；只翻支持自己方向的线索（确认偏误）。
   - 判断校准：信心 1–5 和方向对错的匹配度（类似 Brier 分），**不看赚多少**。
   - 风险控制：仓位和波动是否匹配；是否设止损；浮亏时 `hold_step` 选加仓还是减仓。
   - 趋势 vs 反转：价格在 t=0 前上涨时做多还是做空。
   - 研究深度：研究点用了多少、`think_ms` 多长。
   - 风险偏好：平均仓位、加仓次数。
2. **判断层**：`EvidenceItem[] → Dimension[]`。默认用规则（打分 + 阈值），置信度由证据条数和一致性决定：少于 2 关证据为 low，有方向相反的证据时 `conflict: true`。
   - 可选：接大模型写 `judgement`、`uncertain`、`summary` 的措辞，要求必须引用已有证据，不得新增结论。需要一个极小的后端放 API Key（环境变量），前端调不到时自动回退到规则版，`method` 字段如实填写。

## 补充关卡（闭环）

`pickNextLevel(profile, index, playedIds)`：找出置信度最低或有冲突的能力维度，从 `index.pool` 里挑 `probes` 包含它、且没玩过的关卡；都不需要时返回 `null`。round 2 的 `analyze` 要接收 `previous`，输出 `changes`，说明补充关卡让哪个判断变了。

## 要做到的工作量

- 6 个维度（能力 3 + 偏好 3）全部有规则和证据文本。
- 置信度、不确定项、冲突检测、补充关卡选择、round 2 变化说明全部可用。
- 人物卡 `persona`：由维度组合映射出 6–8 种趣味名字，标 `is_fun_label: true`。
- 单元测试：至少 3 组模拟事件（谨慎研究型、冲动重仓型、只看不做型），输出的画像明显不同且说得通。这 3 组同时就是演示路径。
- `docs/profile.md`：每个维度的规则、阈值和依据，写成评委能看懂的话。

## 必须遵守（评分硬要求）

- 能力和偏好分开；收益不作为能力的唯一标准。
- 每个判断至少一条证据，并能追溯到具体事件。
- 证据不足时敢于给 low 并说明还不确定什么，而不是硬下结论。

## 怎么自测

- 用 `data/samples/sample_events.json` + 示例关卡跑 `analyze`，输出要能通过 `Profile` 类型检查，结构对照 `data/samples/sample_profile.json`。
- 3 组模拟玩家跑出不同画像；把其中一组的某个关键选择改掉，画像按规则合理变化（评委可能现场这样试）。
