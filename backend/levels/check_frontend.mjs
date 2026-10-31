/** Exercise C's actual loader with generated files, including the reveal guard. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLevelLoader } from '../../frontend/src/shell/runtime.ts';

const files = new URL('../../frontend/public/', import.meta.url);
const requests = [];
const loader = createLevelLoader('/', async url => {
  const path = new URL(String(url), 'http://local').pathname;
  assert.match(path, /^\/levels\/[A-Za-z0-9_.-]+$/);
  requests.push(path);
  return new Response(await readFile(new URL(path.slice(1), files)), { status: 200 });
});
const index = await loader.loadIndex();
assert.equal(index.is_sample, false);
assert.equal(index.main.length, 4);
assert.equal(index.pool.length, 6);
const ids = [...index.main, ...index.pool.map(entry => entry.id)];
for (const id of ids) {
  const play = await loader.loadPlay(id);
  assert.equal(play.bars.length, 60);
  const before = requests.length;
  await assert.rejects(loader.loadReveal(id, () => false), /尚未提交/);
  assert.equal(requests.length, before);
  const reveal = await loader.loadReveal(id, () => true);
  assert.equal(reveal.after_bars.length, 15);
  assert.equal(reveal.id, play.id);
}
console.log(`PASS: C loader accepted ${ids.length} real levels (4 main + 6 supplementary) and blocked reveal fetch before decision`);
