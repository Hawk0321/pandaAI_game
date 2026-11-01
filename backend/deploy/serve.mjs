// trading人生 部署入口：同一端口托管前端构建产物，并把 /api/* 交给人格短评服务。
// 密钥只从环境变量读取（见 backend/narrate），不写入前端或仓库。
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNarrationServer } from '../narrate/server.mjs';

const ROOT = resolve(process.env.STATIC_DIR || fileURLToPath(new URL('../../frontend/dist-reigns', import.meta.url)));
const PORT = Number(process.env.APP_PORT || 8090);
const ENTRY = '/src/reigns/demo.html';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2',
};
const narration = createNarrationServer();

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  // 二维码地址 /reigns 和根地址都进入 trading人生
  if (path === '/' || path === '/reigns' || path === '/reigns/') { res.writeHead(302, { Location: ENTRY }).end(); return; }
  // 防目录穿越：规范化后必须仍在 ROOT 内
  let file = resolve(join(ROOT, normalize(path)));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
  try {
    let info = await stat(file);
    if (info.isDirectory()) { file = join(file, 'index.html'); info = await stat(file); }
    // 带内容哈希的构建产物可长期缓存，其余每次校验
    const hashed = /[\\/]assets[\\/].+-[A-Za-z0-9_-]{8}\./.test(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size,
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

http.createServer((req, res) => {
  if (req.url?.startsWith('/api/')) narration.emit('request', req, res);
  else serveStatic(req, res);
}).listen(PORT, '0.0.0.0', () => console.log(`trading人生 listening on ${PORT}, static=${ROOT}, llm=${process.env.QWEN_API_KEY ? 'on' : 'off'}`));
