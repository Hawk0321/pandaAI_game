# 交易滑牌（Reigns 类）

手机竖屏优先的交易主题滑牌游戏：左右滑动做决定，管理资金、风控、信心、口碑四条数值，任意一条触底或爆满就结局。结局页展示玩家的交易人物卡，并引到 PandaAI 产品和 QuantSkills 技能包。卡牌内容为原创虚构示例（`is_sample: true`），不含真实行情；人物卡是趣味表达，不构成投资建议。

## 依赖与配置

- 复用 `frontend/` 已有依赖（React、Vitest），没有新增依赖。
- 不需要任何密钥或环境变量，前端不调用 Panda Data。
- 引流资源来自 `../recommend/catalog.ts` 的 `CATALOG`，人物卡来自 `../profile/persona.ts` 的 `PERSONA_CARDS`。

## 启动

在 `frontend/` 目录启动开发服务器（`package.json` 里的 `dev` 脚本），然后打开 `/src/reigns/demo.html`。电脑上用 ← → 键或拖动，手机上直接滑动。

```bash
npx vitest run src/reigns   # 单测
npx tsc --noEmit            # 类型检查
```

## 目录说明

| 文件 | 作用 |
|---|---|
| `types.ts` | 共享契约（数值、卡牌、结局、引擎接口） |
| `engine.ts` | 纯函数引擎：`createGame` / `choose` / `previewEffects` / `inferPersona` |
| `cards.ts`、`adventures.ts`、`allCards.ts` | 日常卡、由真实关卡改写的奇遇卡、合并后的牌库 `ALL_CARDS` |
| `ReignsGame.tsx` | 游戏界面：拖动/按钮/方向键、“后来……”一行、奇遇小标签 |
| `EndingScreen.tsx` | 结局页：结局 → 本局数字 → 人物卡 → 再来一局 → 引流卡 |
| `referral.ts` | `buildReferrals()`：人物卡 + 结局 + 数值 + 风格标签 → 3 张引流卡 |
| `reigns.css` | 样式，类名统一 `reigns-` 前缀 |
| `demo.html` / `demo.tsx` | 独立试玩入口 |

## 引流规则（referral.ts）

每局固定 3 张，顺序为策略、工具、产品，三张指向不同资源：

1. 策略：人物卡对应的技能包（`recommend.ts` 的 `PERSONA_STRATEGY`）；蛮牛用止损技能包、刺猬用行为诊断兜底。
2. 工具：按结局补短板，映射表写在 `referral.ts` 的 `TOOL_BY_STAT` 上方注释。
3. 产品：默认 Qube；夜猫研究员、深海猎鲨给量化因子中心。

文案只引用本局事实（风格标签次数、结局和数值），不出现买卖建议。
