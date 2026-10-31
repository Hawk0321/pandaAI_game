# 结局页接入 DeepSeek 复盘：接入说明

给后续接 DeepSeek 的队友。目标：一局结束后，在结局页规则推荐卡的下方，多显示一张"AI 复盘"卡，用这局的真实选择写几句复盘，再从现有资源目录里挑 1–2 个 PandaAI / QuantSkills 资源。

**现状（2026-10-31）**：前端的数据契约和校验已经写好并有单测，**还没有任何代码调用 DeepSeek**，后端接口也还没写。结局页现在只显示规则推荐，最多 4 张卡（策略、工具、产品、本局遇到）。

## 1. 架构：前端不碰密钥

```
结局页 ──buildAnalysisPayload(state)──▶ POST /api/analysis（后端）──▶ DeepSeek /chat/completions
   ▲                                          │
   └──────── parseAnalysis(json) ◀────────────┘   不合格 / 超时 / 报错 → 不显示 AI 卡，规则推荐照常显示
```

- **API Key 只放后端**，环境变量 `DEEPSEEK_API_KEY`（变量名已加进根目录 `.env.example`，值留空）。前端代码、构建产物、PR 里都不能出现 Key。这条和 AGENTS.md 里"前端不要直接调用 Panda Data"是同一个原因。
- **AI 卡是锦上添花**：任何失败都静默退回规则推荐，结局页不能因为 AI 卡白屏或卡住。

## 2. 前端已经写好的部分

文件：`frontend/src/reigns/analysisPayload.ts`（测试 `analysisPayload.test.ts`）

| 函数 | 作用 |
|---|---|
| `buildAnalysisPayload(state, ALL_CARDS)` | 把结束的对局整理成请求体，纯函数，不发请求 |
| `parseAnalysis(raw)` | 校验后端返回（对象或 JSON 字符串都行），不合格返回 `null` |

**请求体 `AnalysisPayload`**（`version: 1`）主要字段：

- `role`：角色 id 和名称
- `survival`：活了几关、加时几关、段位名
- `ending`：结局 id、标题、类型、描述
- `stats`：四项数值，带该角色的叫法（基金经理的 `capital` 叫"业绩"）
- `persona`：最终交易人格（和结局页人物卡一致）
- `tally`：9 种风格标签的次数
- `choices`：每一步的关数、出题人物、事件正文、选了什么、没选什么、标签、数值变化、是否 PandaAI 事件、是否奇遇卡。最多带最近 80 条（`MAX_CHOICES`），`totalChoices` 是实际总数
- `allowedResources`：允许推荐的资源白名单（就是 `recommend/catalog.ts` 的全部条目），模型只能返回其中的 id
- `is_sample: true`：卡牌内容都是虚构示例

**返回体 `AnalysisResult`**（`parseAnalysis` 的校验规则）：

| 字段 | 规则 |
|---|---|
| `summary` | 必填，≤ 120 字 |
| `strengths` | 1–3 条，每条 ≤ 80 字，要引用具体关数 |
| `blindSpots` | 1–3 条，每条 ≤ 80 字，要引用具体关数 |
| `nextStep` | 必填，≤ 80 字，下一局可以试的一件事 |
| `resourceIds` | 可省略，最多 2 个，必须在 `allowedResources` 里 |

任何字段含"买入、卖出、稳赚、必涨、保本、荐股"都会被拒绝。产品要求：这是趣味复盘，不构成投资建议。

## 3. 后端要写的部分

建议放 `backend/analysis/`，自带 `README.md`（AGENTS.md 要求每个代码目录都有）。

**接口**：`POST /api/analysis`，请求体就是 `AnalysisPayload`，返回 `AnalysisResult` 的 JSON。

**调用 DeepSeek**（OpenAI 兼容格式）：

- Base URL：`https://api.deepseek.com`，接口 `/chat/completions`，`Authorization: Bearer $DEEPSEEK_API_KEY`
- 用 JSON Output 模式：`response_format: {"type": "json_object"}`。按官方 JSON Output 指南，system 或 user 提示词里要出现 "json" 字样，并给出示例格式，否则可能返回空内容
- 模型名**接入时以官方 `GET https://api.deepseek.com/models` 的返回为准**。2026-10 查到的官方模型名有变动，旧名会被转到新模型，别把模型名写死在代码里，放环境变量 `DEEPSEEK_MODEL`
- `temperature` 建议 0.7，`max_tokens` 建议 600 左右，超时 15 秒

> 以上 DeepSeek 接口信息来自 2026-10-31 的搜索结果，官方文档页这次没能直接打开。接入前请再读一遍 https://api-docs.deepseek.com/ 和 JSON Output 指南。

**后端必须做的检查**：

1. 校验请求体：`version === 1`，`choices` ≤ 80 条，单个请求体 ≤ 64 KB。不合格返回 400，不要转发给 DeepSeek。
2. **限流**：这个接口会花钱，而且没有登录，必须按 IP 限流（例如每分钟 3 次），再加一个每日总调用上限。
3. 把模型输出再校验一遍：字段、长度、禁词、`resourceIds` 白名单，规则和前端的 `parseAnalysis` 相同。校验失败就重试一次，再失败返回 502，前端会静默退回规则推荐。
4. 日志里不打印 API Key，也不打印完整请求体。
5. 本地开发：Vite 的 `server.proxy` 把 `/api` 转发到后端端口，前端不用写死域名。

## 4. 提示词草稿

```text
[system]
你是一个交易主题小游戏的复盘助手。玩家刚玩完一局 Reigns 式滑牌游戏，卡牌内容都是虚构示例。
请只根据给你的 json 数据写复盘，不要编造没出现过的关数或事件。
规则：
- 用“这局里你……”的口吻，客观、友好，不下性格定论。
- 不给任何投资建议，不出现买入、卖出、稳赚、必涨、保本、荐股这类说法。
- strengths 和 blindSpots 每条都要点名具体关数，例如“第 12 关”。
- resourceIds 只能从 allowedResources 的 id 里选，最多 2 个；没有合适的就返回空数组。
- 只输出 json，格式如下：
{"summary":"…","strengths":["…"],"blindSpots":["…"],"nextStep":"…","resourceIds":["qube"]}

[user]
<AnalysisPayload 的 JSON>
```

## 5. 前端接入步骤（后端好了之后）

1. 在 `EndingScreen.tsx` 里，结局出现后调用一次 `fetch('/api/analysis', { method: 'POST', body: JSON.stringify(buildAnalysisPayload(state, ALL_CARDS)) })`，用 `AbortController` 设 15 秒超时，组件卸载时取消。
2. 返回结果先过 `parseAnalysis`，`null` 就什么都不显示。
3. 加载中显示一个占位，比如"AI 正在看你这一局……"，失败时把占位撤掉，不要弹报错。
4. 同一局只请求一次：用 `state.seed + state.turn` 当缓存键，刷新结局页不重复花钱。
5. 推荐的资源用 `CATALOG[id]` 渲染，沿用现有 `.reigns-ref` 卡片样式，类型标签写"AI 复盘"。
6. 卡片上注明"AI 生成，仅供参考，不构成投资建议"。PR 描述里按 AGENTS.md 第 5 条披露使用了 DeepSeek。

## 6. 验收清单

- [ ] 前端代码、构建产物（`dist/`）里搜不到 API Key
- [ ] 断网、后端 500、超时、返回坏 JSON 时，结局页正常显示规则推荐
- [ ] 同一局刷新不重复请求
- [ ] 限流生效
- [ ] 输出里的关数在这局真实存在（抽查 10 局）
- [ ] 推荐的资源都在白名单里，链接可以打开
