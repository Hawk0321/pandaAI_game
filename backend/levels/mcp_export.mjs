/** Export public market data through the official MCP using Codex-managed OAuth. No model calls. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('./.cache/', import.meta.url));
mkdirSync(cwd, { recursive: true });
const child = spawn('codex', ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
let buffer = '', sequence = 0;
const pending = new Map();
child.stdout.on('data', chunk => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf('\n');
    if (newline < 0) break;
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (pending.has(message.id)) {
      pending.get(message.id)(message); pending.delete(message.id);
    } else if (message.id != null && message.method) {
      child.stdin.write(JSON.stringify({ id: message.id, error: { code: -32000, message: 'Complete interactive authorization in Codex first' } }) + '\n');
    }
  }
});
child.stderr.on('data', () => {}); // Never relay authentication diagnostics or headers.
child.on('error', () => { for (const done of pending.values()) done({ error: { message: 'Cannot start Codex CLI' } }); pending.clear(); });
child.on('exit', () => { for (const done of pending.values()) done({ error: { message: 'Codex MCP connection closed' } }); pending.clear(); });
function call(method, params) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`MCP request timed out: ${method}`)); }, 90000);
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(Error(message.error.message)) : resolve(message.result); });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  });
}
try {
  const method = process.argv[2];
  if (!['get_stock_daily_pre', 'get_future_daily', 'get_index_daily', 'get_trade_cal'].includes(method)) throw Error('Unsupported export method');
  const params = JSON.parse(process.argv[3] || '{}');
  await call('initialize', { clientInfo: { name: 'pandaai_level_export', version: '1.0' }, capabilities: { experimentalApi: true } });
  child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
  const context = await call('thread/start', { ephemeral: true, cwd });
  // An ephemeral tool context is not saved as a chat; no turn/start or model execution occurs.
  const response = await call('mcpServer/tool/call', { threadId: context.thread.id, server: 'pandadata', tool: 'call_pandadata', arguments: { method, params, preview_rows: 2000 } });
  const value = response.structuredContent ?? JSON.parse(response.content.find(item => item.type === 'text').text);
  if (response.isError || !value.ok) {
    console.log(JSON.stringify({ ok: false, error: value.error, message: value.message, trial: value.trial }));
    process.exitCode = 1;
  } else console.log(JSON.stringify(value));
} catch (error) {
  console.log(JSON.stringify({ ok: false, message: error.message }));
  process.exitCode = 1;
} finally { child.kill(); }
