# trading人生 部署

一个 Node.js 进程同时提供两样东西：前端构建产物（静态文件），以及 `/api/persona-comment` 人格 AI 短评接口（`backend/narrate`）。只用 Node 标准库，没有第三方运行时依赖。

## 依赖

- Node.js 22+（构建和运行都需要）
- 构建时需要 `frontend/` 的 npm 依赖：`cd frontend && npm ci`

## 构建

```bash
cd frontend
npm ci
npm run build:reigns      # 类型检查 + 构建，输出 frontend/dist-reigns/
```

## 启动

```bash
cd frontend
npm run start:reigns      # 等同于 node ../backend/deploy/serve.mjs
```

打开 `http://<服务器IP>:8090/`，会跳转到 trading人生（`/src/reigns/demo.html`）。

## 环境变量

都在服务端读取，前端拿不到。复制根目录的 `.env.example` 填写，或写进 systemd 的 `EnvironmentFile`。

| 变量 | 必填 | 说明 |
|---|---|---|
| `QWEN_API_KEY` | 否 | Qwen Token Plan 密钥。不填时 AI 短评回退为规则文案，游戏照常可玩 |
| `QWEN_BASE_URL` | 否 | 默认 `https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1` |
| `QWEN_MODEL` | 否 | 默认 `qwen3.8-flash` |
| `LLM_FALLBACK_MODEL` | 否 | 主模型失败时的备用模型，默认 `deepseek-v4.1-flash` |
| `APP_PORT` | 否 | 监听端口，默认 `8090` |
| `STATIC_DIR` | 否 | 静态文件目录，默认 `frontend/dist-reigns` |

不需要登录，也没有测试账号。

## systemd 示例（线上用法）

```ini
[Unit]
Description=trading人生 H5 (static + narration API)
After=network.target

[Service]
User=admin
WorkingDirectory=/opt/pandaai-game
EnvironmentFile=/opt/pandaai-game/app.env   # 权限 600，只放服务器
ExecStart=/usr/bin/node backend/deploy/serve.mjs
Restart=always
MemoryMax=200M
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

云服务器要同时放行两层防火墙：系统防火墙（如 `ufw allow 8090/tcp`），以及云厂商控制台的安全组入方向规则。

## 安全边界

- 接口限流：同一 IP 每分钟最多 12 次，请求体上限 8 KB，入参逐字段校验（见 `backend/narrate/server.mjs`）。
- 服务端不记录请求内容，也不保存玩家的选择记录。
- 静态文件做了目录穿越防护，只能读到 `STATIC_DIR` 里的文件。
- 目前只有 HTTP。正式长期使用建议在前面加 HTTPS 反向代理。
