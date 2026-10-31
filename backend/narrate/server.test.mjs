import assert from 'node:assert/strict';
import test from 'node:test';
import { createNarrationServer } from './server.mjs';

const payload = {
  role: 'stock', persona: 'raccoon', personaName: '逆势浣熊', endingTitle: '爆仓离场',
  stats: { capital: 0, risk: 32, confidence: 58, reputation: 41 },
  behavior: { decisions: 18 }, evidence: ['共做 18 次选择，最长连续同向 3 次'],
};

test('valid summary falls back to a rule comment without a key', async () => {
  delete process.env.QWEN_API_KEY;
  const server = createNarrationServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/persona-comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.method, 'rules');
    assert.match(result.comment, /18 次选择/);
    const invalid = await fetch(`http://127.0.0.1:${port}/api/persona-comment`, { method: 'POST', body: '{}' });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
