# 人格 AI 短评服务

仅 Node.js 22+，无第三方依赖。密钥仅服务端读取，不保存请求日志或完整行为记录。

```powershell
$env:QWEN_API_KEY='本地填写'
node backend/narrate/server.mjs
# 默认 http://127.0.0.1:8787，POST /api/persona-comment
```

可选环境变量：`QWEN_BASE_URL`、`QWEN_MODEL`、`LLM_FALLBACK_MODEL`、`PORT`。
生产环境将同一服务的 `/api` 反向代理到本服务，并配置 HTTPS；前端不接触密钥。

验证：`node --test backend/narrate/server.test.mjs`。
