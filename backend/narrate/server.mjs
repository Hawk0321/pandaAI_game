import http from 'node:http';
import { createHash } from 'node:crypto';

const port = Number(process.env.PORT || 8787);
const cache = new Map();
const attempts = new Map();
const roles = new Set(['fund', 'crypto', 'stock']);
const personas = new Set(['sloth','bull','hedgehog','owl','shark','turtle','dolphin','crab','fox','puffin','raccoon','gecko','squirrel','bat','panda']);
const statKeys = new Set(['capital', 'risk', 'confidence', 'reputation']);

function valid(body) {
  return body && roles.has(body.role) && personas.has(body.persona)
    && typeof body.personaName === 'string' && body.personaName.length <= 20
    && typeof body.endingTitle === 'string' && body.endingTitle.length <= 40
    && body.stats && Object.entries(body.stats).every(([key, value]) => statKeys.has(key) && Number.isFinite(value) && value >= 0 && value <= 100)
    && Array.isArray(body.evidence) && body.evidence.length <= 2 && body.evidence.every((text) => typeof text === 'string' && text.length <= 100)
    && body.behavior && Number.isInteger(body.behavior.decisions) && body.behavior.decisions >= 0 && body.behavior.decisions <= 500;
}

function fallback(body) {
  return `你的选择留下了“${body.personaName}”的轨迹，最终以“${body.endingTitle}”收尾。${body.evidence[0] || `本局共做 ${body.behavior.decisions} 次选择`}。下次复盘时，先挑一个最常出现的动作，看看它是否仍符合你的原计划。`;
}

async function callModel(body, model) {
  const base = process.env.QWEN_BASE_URL || 'https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1';
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.QWEN_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 320, temperature: .3, messages: [
      { role: 'system', content: '你是温和的游戏复盘评论员。只用中文，2-3句，不超过160字。只能引用输入的行为证据，不评价投资能力，不提供投资建议，不使用买入、卖出、稳赚，不编造数值。说明一个行为、与结局的联系、一个复盘方向。' },
      { role: 'user', content: JSON.stringify(body) },
    ] }),
  });
  if (!response.ok) throw new Error(`Model ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text || [...text].length > 180) throw new Error('Invalid narration');
  return text;
}

async function narrate(body) {
  if (!process.env.QWEN_API_KEY) return { comment: fallback(body), method: 'rules' };
  const key = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  if (cache.has(key)) return cache.get(key);
  const models = [process.env.QWEN_MODEL || 'qwen3.8-flash', process.env.LLM_FALLBACK_MODEL || 'deepseek-v4.1-flash'];
  for (const model of models) {
    try {
      const comment = await Promise.race([
        callModel(body, model),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
      ]);
      const result = { comment, method: 'rules+llm', model };
      cache.set(key, result);
      return result;
    } catch { /* Fallback model and then rule text keep the ending page usable. */ }
  }
  return { comment: fallback(body), method: 'rules' };
}

export function createNarrationServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST' || req.url !== '/api/persona-comment') {
      res.writeHead(404).end(JSON.stringify({ error: 'Not found' })); return;
    }
    const ip = req.socket.remoteAddress || 'local';
    const now = Date.now();
    const recent = (attempts.get(ip) || []).filter((time) => now - time < 60000);
    if (recent.length >= 12) { res.writeHead(429).end(JSON.stringify({ error: 'Too many requests' })); return; }
    attempts.set(ip, [...recent, now]);
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 8192) { res.writeHead(413).end(JSON.stringify({ error: 'Too large' })); return; }
    }
    try {
      const body = JSON.parse(raw);
      if (!valid(body)) { res.writeHead(400).end(JSON.stringify({ error: 'Invalid summary' })); return; }
      res.writeHead(200).end(JSON.stringify(await narrate(body)));
    } catch {
      res.writeHead(400).end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

if (process.argv[1]?.endsWith('server.mjs')) createNarrationServer().listen(port, '0.0.0.0', () => console.log(`Narration API listening on ${port}`));
